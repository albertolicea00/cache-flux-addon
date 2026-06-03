chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "forceClean",
    title: "Force Clean (Ignore Exceptions)",
    contexts: ["action"]
  });
});

async function getExceptions() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['exceptions'], (result) => {
      resolve(result.exceptions || []);
    });
  });
}

function deleteData(exceptions, isForce) {
  // We execute this in the context of the page
  console.log("🧹 CacheCleaner: Starting cleanup...");
  let deletedKeys = 0;

  try {
    // LocalStorage
    if (isForce) {
      localStorage.clear();
    } else {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!exceptions.includes(key)) {
          localStorage.removeItem(key);
          deletedKeys++;
        }
      }
    }
    console.log(`🧹 CacheCleaner: Processed localStorage`);
  } catch (e) {
    console.error(e);
  }

  try {
    // SessionStorage
    if (isForce) {
      sessionStorage.clear();
    } else {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (!exceptions.includes(key)) {
          sessionStorage.removeItem(key);
          deletedKeys++;
        }
      }
    }
    console.log(`🧹 CacheCleaner: Processed sessionStorage`);
  } catch (e) {
    console.error(e);
  }

  try {
    // CacheStorage
    caches.keys().then((cacheNames) => {
      cacheNames.forEach(name => {
        if (isForce || !exceptions.includes(name)) {
          caches.delete(name);
        }
      });
      console.log("🧹 CacheCleaner: Processed CacheStorage");
    });
  } catch (e) {
    console.error(e);
  }

  try {
    // IndexedDB
    if (indexedDB.databases) {
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (isForce || !exceptions.includes(db.name)) {
            indexedDB.deleteDatabase(db.name);
          }
        });
        console.log("🧹 CacheCleaner: Processed IndexedDB");
      });
    }
  } catch (e) {
    console.error(e);
  }

  try {
    // Fallback JS Cookies
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      if (isForce || !exceptions.includes(name)) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
    }
  } catch (e) {
    console.error(e);
  }

  return true;
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "forceClean") {
    if (!tab.url || tab.url.startsWith("chrome://")) return;
    performClean(tab, true); // isForce = true
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || tab.url.startsWith("chrome://")) return;
  performClean(tab, false); // isForce = false
});

function getBaseDomain(hostname) {
  if (/^[0-9.]+$/.test(hostname) || hostname.includes(':')) {
    return hostname;
  }
  const parts = hostname.split('.');
  if (parts.length <= 2) {
    return hostname;
  }
  const secondToLast = parts[parts.length - 2];
  const commonSecondLevelTlds = ['com', 'co', 'org', 'net', 'gov', 'edu', 'mil', 'nom', 'gob'];
  if (commonSecondLevelTlds.includes(secondToLast) && parts.length > 2) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

function cookieMatchesHost(cookieDomain, host) {
  const cDomain = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;
  const hDomain = host.startsWith('.') ? host.substring(1) : host;

  // The cookie domain must be equal to or a parent domain of the host.
  // E.g., cookie domain: "thewebsite.com", host: "www.thewebsite.com" -> MATCH
  // E.g., cookie domain: "www.thewebsite.com", host: "thewebsite.com" -> MATCH (exact)
  // E.g., cookie domain: "dev.thewebsite.com", host: "www.thewebsite.com" -> NO MATCH
  return cDomain === hDomain || hDomain.endsWith('.' + cDomain);
}

async function performClean(tab, isForce) {
  const exceptions = await getExceptions();

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: deleteData,
    args: [exceptions, isForce]
  }, () => {
    // Show visual feedback on badge
    chrome.action.setBadgeText({ text: isForce ? "FORCE" : "CLEAN", tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: isForce ? "#ef4444" : "#10b981", tabId: tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: "", tabId: tab.id }), 2000);
  });

  // Clear HTTP Only & Partitioned cookies via chrome api
  const getCookies = (options) => {
    return new Promise((resolve) => {
      chrome.cookies.getAll(options, (cookies) => {
        if (chrome.runtime.lastError) {
          console.warn(`🧹 CacheCleaner: Failed to get cookies with options ${JSON.stringify(options)}: ${chrome.runtime.lastError.message}`);
          resolve([]);
        } else {
          resolve(cookies || []);
        }
      });
    });
  };

  try {
    const hostname = new URL(tab.url).hostname;
    const baseDomain = getBaseDomain(hostname);

    Promise.all([
      getCookies({ domain: baseDomain }),
      getCookies({ domain: baseDomain, partitionKey: {} })
    ]).then(([unpartitionedCookies, partitionedCookies]) => {
      // Combine and deduplicate
      const allCookiesMap = new Map();
      const addCookie = (cookie) => {
        const key = `${cookie.name}|${cookie.domain}|${cookie.path}|${cookie.partitionKey ? cookie.partitionKey.topLevelSite : ""}`;
        allCookiesMap.set(key, cookie);
      };

      unpartitionedCookies.forEach(addCookie);
      partitionedCookies.forEach(addCookie);

      const matchingCookies = Array.from(allCookiesMap.values()).filter(cookie => 
        cookieMatchesHost(cookie.domain, hostname)
      );

      console.log(`🧹 CacheCleaner: Found ${matchingCookies.length} matching cookies for ${hostname} (baseDomain: ${baseDomain})`);

      matchingCookies.forEach((cookie) => {
        if (isForce || !exceptions.includes(cookie.name)) {
          const protocol = cookie.secure ? "https://" : "http://";
          const domain = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
          const cookieUrl = `${protocol}${domain}${cookie.path}`;

          const removeDetails = { url: cookieUrl, name: cookie.name };
          if (cookie.partitionKey) {
            removeDetails.partitionKey = cookie.partitionKey;
          }

          chrome.cookies.remove(removeDetails, (details) => {
            if (chrome.runtime.lastError) {
              console.error(`🧹 CacheCleaner: Error removing cookie ${cookie.name}: ${chrome.runtime.lastError.message}`);
            } else if (!details) {
              console.warn(`🧹 CacheCleaner: Cookie ${cookie.name} could not be removed at ${cookieUrl}`);
            } else {
              console.log(`🧹 CacheCleaner: Removed cookie ${cookie.name} from ${cookieUrl} (partitioned: ${!!cookie.partitionKey})`);
            }
          });
        }
      });
    });
  } catch (err) {
    console.error(`🧹 CacheCleaner: Error parsing URL ${tab.url}:`, err);
  }
}
