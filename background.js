// ============================================================================
// CacheCleaner - Background Service Worker (Manifest V3)
// ============================================================================
// This script coordinates cleanup of the active tab's site data.
// It combines:
// 1. Script injection (to access local DOM storage on the page).
// 2. Chrome APIs (to query and delete HttpOnly and partitioned cookies).
// ============================================================================

chrome.runtime.onInstalled.addListener(() => {
  // Create context menu item under the extension action icon
  chrome.contextMenus.create({
    id: "forceClean",
    title: "Force Clean (Ignore Exceptions)",
    contexts: ["action"]
  });
});

// Retrieve the list of exceptions (cookie/storage keys to protect from deletion)
async function getExceptions() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['exceptions'], (result) => {
      resolve(result.exceptions || []);
    });
  });
}

// ----------------------------------------------------------------------------
// IMPORTANT NOTE: This function executes INSIDE the target tab's page context
// (not in the background Service Worker), giving it direct DOM access
// to localStorage, sessionStorage, caches, indexedDB, and document.cookie.
// ----------------------------------------------------------------------------
function deleteData(exceptions, isForce) {
  const cleaned = [];

  // 1. LocalStorage cleanup
  try {
    if (isForce) {
      localStorage.clear();
      cleaned.push("localStorage (cleared all)");
    } else {
      let count = 0;
      // Loop backwards to avoid index shifting issues when removing items
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!exceptions.includes(key)) {
          localStorage.removeItem(key);
          count++;
        }
      }
      if (count > 0) cleaned.push(`localStorage (${count} items removed)`);
    }
  } catch (e) {
    console.error("🧹 CacheCleaner: Error cleaning localStorage:", e);
  }

  // 2. SessionStorage cleanup
  try {
    if (isForce) {
      sessionStorage.clear();
      cleaned.push("sessionStorage (cleared all)");
    } else {
      let count = 0;
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (!exceptions.includes(key)) {
          sessionStorage.removeItem(key);
          count++;
        }
      }
      if (count > 0) cleaned.push(`sessionStorage (${count} items removed)`);
    }
  } catch (e) {
    console.error("🧹 CacheCleaner: Error cleaning sessionStorage:", e);
  }

  // 3. CacheStorage cleanup (Service Workers / Cache API)
  try {
    caches.keys().then((cacheNames) => {
      let count = 0;
      cacheNames.forEach(name => {
        if (isForce || !exceptions.includes(name)) {
          caches.delete(name);
          count++;
        }
      });
      if (count > 0) {
        console.log(`🧹 CacheCleaner: Cleaned CacheStorage (${count} caches removed)`);
      }
    });
  } catch (e) {
    console.error("🧹 CacheCleaner: Error cleaning CacheStorage:", e);
  }

  // 4. IndexedDB cleanup
  try {
    if (indexedDB.databases) {
      indexedDB.databases().then(databases => {
        let count = 0;
        databases.forEach(db => {
          if (isForce || !exceptions.includes(db.name)) {
            indexedDB.deleteDatabase(db.name);
            count++;
          }
        });
        if (count > 0) {
          console.log(`🧹 CacheCleaner: Cleaned IndexedDB (${count} databases removed)`);
        }
      });
    }
  } catch (e) {
    console.error("🧹 CacheCleaner: Error cleaning IndexedDB:", e);
  }

  // 5. JavaScript-accessible cookies cleanup (non-HttpOnly)
  try {
    const cookies = document.cookie.split(";");
    let count = 0;
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      if (name && (isForce || !exceptions.includes(name))) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        count++;
      }
    }
    if (count > 0) cleaned.push(`document.cookie (${count} cookies removed)`);
  } catch (e) {
    console.error("🧹 CacheCleaner: Error cleaning document.cookie:", e);
  }

  // Print a unified, clean console summary for page-context storage
  if (cleaned.length > 0) {
    console.log(`🧹 CacheCleaner: DOM storage cleared: ${cleaned.join(', ')}`);
  }

  return true;
}

// Listen for context menu clicks ("Force Clean")
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "forceClean") {
    if (!tab.url || tab.url.startsWith("chrome://")) return;
    performClean(tab, true); 
  }
});

// Listen for the main extension action button clicks
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || tab.url.startsWith("chrome://")) return;
  performClean(tab, false); 
});

// ----------------------------------------------------------------------------
// Extracts the registrable/apex base domain of a hostname.
// E.g., "sub.thewebsite.com" -> "thewebsite.com"
// Necessary in MV3 because the cookies API requires querying specific domains
// to stay within host permissions and avoid empty responses or security errors.
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// Validates if a cookie domain is within the scope of the active tab's hostname.
// Matches the exact domain or parent domains sent to this host, preventing
// sibling or child subdomain cookies from being removed (e.g. keeps "dev" cookies intact when cleaning "www").
// ----------------------------------------------------------------------------
function cookieMatchesHost(cookieDomain, host) {
  const cDomain = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;
  const hDomain = host.startsWith('.') ? host.substring(1) : host;

  return cDomain === hDomain || hDomain.endsWith('.' + cDomain);
}

// ----------------------------------------------------------------------------
// Orchestrates the coordinated cleanup (DOM injection + background cookies API)
// ----------------------------------------------------------------------------
async function performClean(tab, isForce) {
  const exceptions = await getExceptions();

  // Inject and execute DOM cleanup function in the active tab
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: deleteData,
    args: [exceptions, isForce]
  }, () => {
    // Provide temporary visual feedback via the extension badge
    chrome.action.setBadgeText({ text: isForce ? "FORCE" : "CLEAN", tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: isForce ? "#ef4444" : "#10b981", tabId: tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: "", tabId: tab.id }), 2000);
  });

  // Helper wrapper around chrome.cookies.getAll to return a promise
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

    // Perform a double query to fetch:
    // 1. Traditional cookies (unpartitioned) matching the base domain.
    // 2. Partitioned cookies (CHIPS) using 'partitionKey: {}'. Chrome omits 
    //    partitioned cookies from standard queries unless explicitly requested.
    Promise.all([
      getCookies({ domain: baseDomain }),
      getCookies({ domain: baseDomain, partitionKey: {} })
    ]).then(([unpartitionedCookies, partitionedCookies]) => {
      
      // Combine both lists and deduplicate them using a Map with a unique key
      const allCookiesMap = new Map();
      const addCookie = (cookie) => {
        const key = `${cookie.name}|${cookie.domain}|${cookie.path}|${cookie.partitionKey ? cookie.partitionKey.topLevelSite : ""}`;
        allCookiesMap.set(key, cookie);
      };

      unpartitionedCookies.forEach(addCookie);
      partitionedCookies.forEach(addCookie);

      // Filter cookies to keep only those that belong to the active tab's domain hierarchy
      const matchingCookies = Array.from(allCookiesMap.values()).filter(cookie => 
        cookieMatchesHost(cookie.domain, hostname)
      );

      const toDelete = matchingCookies.filter(cookie => isForce || !exceptions.includes(cookie.name));
      
      if (toDelete.length === 0) {
        console.log(`🧹 CacheCleaner: No cookies to clear for ${hostname}`);
        return;
      }

      let processedCount = 0;
      let deletedCount = 0;
      let partitionedDeletedCount = 0;

      toDelete.forEach((cookie) => {
        // Reconstruct the exact URL associated with the cookie as required by chrome.cookies.remove
        const protocol = cookie.secure ? "https://" : "http://";
        const domain = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
        const cookieUrl = `${protocol}${domain}${cookie.path}`;

        const removeDetails = { url: cookieUrl, name: cookie.name };
        
        // Partitioned cookies must be removed using their original partitionKey,
        // otherwise the API will fail to locate them in Chrome's isolated jars.
        if (cookie.partitionKey) {
          removeDetails.partitionKey = cookie.partitionKey;
        }

        chrome.cookies.remove(removeDetails, (details) => {
          processedCount++;
          if (chrome.runtime.lastError) {
            console.error(`🧹 CacheCleaner: Error removing cookie ${cookie.name}: ${chrome.runtime.lastError.message}`);
          } else if (details) {
            deletedCount++;
            if (cookie.partitionKey) {
              partitionedDeletedCount++;
            }
          }

          // Print a single summary log once all deletions have completed
          if (processedCount === toDelete.length) {
            console.log(`🧹 CacheCleaner: Successfully removed ${deletedCount} cookies (${partitionedDeletedCount} partitioned) for ${hostname}`);
          }
        });
      });
    });
  } catch (err) {
    console.error(`🧹 CacheCleaner: Error parsing URL ${tab.url}:`, err);
  }
}
