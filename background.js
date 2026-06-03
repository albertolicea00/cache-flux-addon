// ============================================================================
// CacheCleaner - Background Service Worker (Manifest V3)
// ============================================================================
// This script coordinates cleanup of the active tab's site data.
// It combines:
// 1. Script injection (to access local DOM storage on the page).
// 2. Chrome APIs (to query and delete HttpOnly and partitioned cookies).
// 3. User feedback (displays a beautiful, theme-adaptive toast in the tab).
// ============================================================================

chrome.runtime.onInstalled.addListener(() => {
  // Create context menu item under the extension action icon
  chrome.contextMenus.create({
    id: "forceClean",
    title: "Force Clean (Ignore Exceptions)",
    contexts: ["action"]
  });
});

// Retrieve user preferences and exceptions from sync storage
async function getOptions() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      cleanCookies: true,
      cleanLocalStorage: true,
      cleanSessionStorage: true,
      cleanCacheStorage: true,
      cleanIndexedDB: true,
      reloadPage: false,
      exceptions: []
    }, (result) => {
      resolve(result);
    });
  });
}

// ----------------------------------------------------------------------------
// IMPORTANT NOTE: This function executes INSIDE the target tab's page context
// (not in the background Service Worker), giving it direct DOM access
// to localStorage, sessionStorage, caches, indexedDB, and document.cookie.
// It returns a report object that is passed back to the background worker.
// ----------------------------------------------------------------------------
function deleteData(exceptions, isForce, options) {
  const report = {};
  
  // Use default options if options object is not provided
  const settings = options || {
    cleanLocalStorage: true,
    cleanSessionStorage: true,
    cleanCacheStorage: true,
    cleanIndexedDB: true,
    cleanCookies: true
  };

  // 1. LocalStorage cleanup
  if (settings.cleanLocalStorage) {
    try {
      if (isForce) {
        localStorage.clear();
        report.localStorage = "cleared all";
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
        report.localStorage = `${count} items removed`;
      }
    } catch (e) {
      report.localStorage = `error: ${e.message}`;
    }
  }

  // 2. SessionStorage cleanup
  if (settings.cleanSessionStorage) {
    try {
      if (isForce) {
        sessionStorage.clear();
        report.sessionStorage = "cleared all";
      } else {
        let count = 0;
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (!exceptions.includes(key)) {
            sessionStorage.removeItem(key);
            count++;
          }
        }
        report.sessionStorage = `${count} items removed`;
      }
    } catch (e) {
      report.sessionStorage = `error: ${e.message}`;
    }
  }

  // 3. CacheStorage cleanup (Service Workers / Cache API)
  if (settings.cleanCacheStorage) {
    try {
      caches.keys().then((cacheNames) => {
        let count = 0;
        cacheNames.forEach(name => {
          if (isForce || !exceptions.includes(name)) {
            caches.delete(name);
            count++;
          }
        });
      });
      report.cacheStorage = "triggered deletion";
    } catch (e) {
      report.cacheStorage = `error: ${e.message}`;
    }
  }

  // 4. IndexedDB cleanup
  if (settings.cleanIndexedDB) {
    try {
      if (indexedDB.databases) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (isForce || !exceptions.includes(db.name)) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
      report.indexedDB = "triggered deletion";
    } catch (e) {
      report.indexedDB = `error: ${e.message}`;
    }
  }

  // 5. JavaScript-accessible cookies cleanup (non-HttpOnly fallback)
  if (settings.cleanCookies) {
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
      report.documentCookies = `${count} cookies removed`;
    } catch (e) {
      report.documentCookies = `error: ${e.message}`;
    }
  }

  // Print a summary log on the page console for immediate inspection if the tab is not reloaded
  const details = Object.entries(report).map(([key, val]) => `${key}: ${val}`).join(', ');
  console.log(`[CacheCleaner] DOM storage cleared: ${details || 'no storage types selected'}`);

  return report;
}

// ----------------------------------------------------------------------------
// IMPORTANT NOTE: This function executes INSIDE the target tab's page context.
// It builds a theme-adaptive floating toast notification that auto-detects
// if the system/browser is in Dark Mode or Light Mode using window.matchMedia.
// ----------------------------------------------------------------------------
function renderToast(isForce, willReload, storageReport) {
  const existing = document.getElementById('cache-cleaner-toast');
  if (existing) existing.remove();

  // Detect system theme settings
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Theme color variables
  const bgColor = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f3f4f6' : '#1f2937';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const descColor = isDark ? '#9ca3af' : '#4b5563';
  const accentColor = '#d5ac65'; // Keeping the brand gold accent on both modes

  // Create toast container
  const toast = document.createElement('div');
  toast.id = 'cache-cleaner-toast';
  
  // Styling
  toast.style.position = 'fixed';
  toast.style.top = '24px';
  toast.style.right = '24px';
  toast.style.backgroundColor = bgColor;
  toast.style.color = textColor;
  toast.style.border = `1px solid ${borderColor}`;
  toast.style.borderRadius = '8px';
  toast.style.padding = '14px 20px';
  toast.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.05)';
  toast.style.zIndex = '9999999999';
  toast.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  toast.style.fontSize = '14px';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '14px';
  toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  toast.style.transform = 'translateY(50px) scale(0.95)';
  toast.style.opacity = '0';

  const icon = document.createElement('span');
  icon.textContent = isForce ? '💥' : '🧹';
  icon.style.fontSize = '24px';
  toast.appendChild(icon);

  const textContainer = document.createElement('div');
  textContainer.style.display = 'flex';
  textContainer.style.flexDirection = 'column';
  
  const title = document.createElement('strong');
  title.textContent = isForce ? 'Force Clean Completed' : 'Cleanup Completed';
  title.style.color = accentColor;
  title.style.fontSize = '14px';
  title.style.fontWeight = '600';
  textContainer.appendChild(title);

  // Compile list of storage types successfully wiped
  const detailsList = [];
  if (storageReport.localStorage && !storageReport.localStorage.includes("0 items")) {
    detailsList.push(`LocalStorage (${storageReport.localStorage.includes("cleared all") ? "all cleared" : storageReport.localStorage})`);
  }
  if (storageReport.sessionStorage && !storageReport.sessionStorage.includes("0 items")) {
    detailsList.push(`SessionStorage (${storageReport.sessionStorage.includes("cleared all") ? "all cleared" : storageReport.sessionStorage})`);
  }
  if (storageReport.cookies && !storageReport.cookies.includes("0 cookies")) {
    detailsList.push(`Cookies (${storageReport.cookies})`);
  }
  if (storageReport.cacheStorage) {
    detailsList.push(`CacheStorage`);
  }
  if (storageReport.indexedDB) {
    detailsList.push(`IndexedDB`);
  }

  const details = document.createElement('span');
  details.style.color = descColor;
  details.style.fontSize = '12px';
  details.style.marginTop = '4px';
  details.style.lineHeight = '1.4';
  
  if (detailsList.length > 0) {
    details.textContent = `Cleared: ${detailsList.join(', ')}`;
  } else {
    details.textContent = 'No site data was found or cleared.';
  }
  textContainer.appendChild(details);

  // Show a counting reload warning if auto-refresh is active
  if (willReload) {
    const reloadText = document.createElement('span');
    reloadText.style.color = accentColor;
    reloadText.style.fontSize = '11px';
    reloadText.style.marginTop = '6px';
    reloadText.style.fontWeight = '600';
    reloadText.style.display = 'flex';
    reloadText.style.alignItems = 'center';
    reloadText.style.gap = '4px';
    reloadText.textContent = '🔄 Reloading page in 2 seconds...';
    textContainer.appendChild(reloadText);
  }

  toast.appendChild(textContainer);
  document.body.appendChild(toast);

  // Slide-in transition
  setTimeout(() => {
    toast.style.transform = 'translateY(0) scale(1)';
    toast.style.opacity = '1';
  }, 50);

  // Slide-out and remove after 4 seconds (only if reload doesn't wipe context first)
  if (!willReload) {
    setTimeout(() => {
      toast.style.transform = 'translateY(20px) scale(0.95)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
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
// Deletes HttpOnly and partitioned cookies for a specific domain, returning
// the total number of cookies deleted.
// ----------------------------------------------------------------------------
function deleteCookiesAndGetCount(tab, baseDomain, isForce, exceptions) {
  return new Promise((resolve) => {
    const getCookies = (options) => {
      return new Promise((resolveGet) => {
        chrome.cookies.getAll(options, (cookies) => {
          if (chrome.runtime.lastError) {
            console.warn(`[CacheCleaner] Failed to get cookies: ${chrome.runtime.lastError.message}`);
            resolveGet([]);
          } else {
            resolveGet(cookies || []);
          }
        });
      });
    };

    Promise.all([
      getCookies({ domain: baseDomain }),
      getCookies({ domain: baseDomain, partitionKey: {} })
    ]).then(([unpartitionedCookies, partitionedCookies]) => {
      const allCookiesMap = new Map();
      const addCookie = (cookie) => {
        const key = `${cookie.name}|${cookie.domain}|${cookie.path}|${cookie.partitionKey ? cookie.partitionKey.topLevelSite : ""}`;
        allCookiesMap.set(key, cookie);
      };

      unpartitionedCookies.forEach(addCookie);
      partitionedCookies.forEach(addCookie);

      const hostname = tab.url ? new URL(tab.url).hostname : "";
      const matchingCookies = Array.from(allCookiesMap.values()).filter(cookie => 
        cookieMatchesHost(cookie.domain, hostname)
      );

      const toDelete = matchingCookies.filter(cookie => isForce || !exceptions.includes(cookie.name));
      
      if (toDelete.length === 0) {
        resolve(0);
        return;
      }

      let deletedCount = 0;
      let processedCount = 0;

      toDelete.forEach((cookie) => {
        const protocol = cookie.secure ? "https://" : "http://";
        const domain = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
        const cookieUrl = `${protocol}${domain}${cookie.path}`;

        const removeDetails = { url: cookieUrl, name: cookie.name };
        if (cookie.partitionKey) {
          removeDetails.partitionKey = cookie.partitionKey;
        }

        chrome.cookies.remove(removeDetails, (details) => {
          processedCount++;
          if (!chrome.runtime.lastError && details) {
            deletedCount++;
          }

          if (processedCount === toDelete.length) {
            resolve(deletedCount);
          }
        });
      });
    });
  });
}

// ----------------------------------------------------------------------------
// Orchestrates the coordinated cleanup (DOM injection + background cookies API)
// ----------------------------------------------------------------------------
async function performClean(tab, isForce) {
  const options = await getOptions();
  const exceptions = options.exceptions;
  const hostname = new URL(tab.url).hostname;

  // Inject and execute DOM storage cleanup first
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: deleteData,
    args: [exceptions, isForce, options]
  }, (results) => {
    
    // Prepare the final report structure
    const storageReport = {
      localStorage: null,
      sessionStorage: null,
      cacheStorage: false,
      indexedDB: false,
      cookies: null
    };

    if (results && results[0] && results[0].result) {
      const report = results[0].result;
      
      // Print page-context reports in worker console
      Object.entries(report).forEach(([key, val]) => {
        console.log(`🧹 CacheCleaner: Processed ${key} (${val})`);
      });

      // Parse reports for the toast display
      if (report.localStorage && !report.localStorage.includes("0 items")) {
        storageReport.localStorage = report.localStorage.includes("cleared all") ? "all" : report.localStorage.replace(" items removed", "");
      }
      if (report.sessionStorage && !report.sessionStorage.includes("0 items")) {
        storageReport.sessionStorage = report.sessionStorage.includes("cleared all") ? "all" : report.sessionStorage.replace(" items removed", "");
      }
      if (report.cacheStorage && report.cacheStorage !== "error") {
        storageReport.cacheStorage = true;
      }
      if (report.indexedDB && report.indexedDB !== "error") {
        storageReport.indexedDB = true;
      }
      if (report.documentCookies && !report.documentCookies.includes("0 cookies")) {
        const count = parseInt(report.documentCookies);
        if (!isNaN(count)) {
          storageReport.cookies = count;
        }
      }
    } else {
      console.log(`🧹 CacheCleaner: DOM storage cleared for ${hostname} (no report received)`);
    }

    // Inner helper to display the page toast and trigger reload
    const completeClean = (cookiesDeletedCount) => {
      // Sum the background deleted cookies
      if (cookiesDeletedCount > 0) {
        storageReport.cookies = (storageReport.cookies || 0) + cookiesDeletedCount;
      }

      // Convert cookies count to formatted string
      if (storageReport.cookies !== null) {
        storageReport.cookies = `${storageReport.cookies} cookies`;
      }

      // Inject the floating toast HTML in the active tab
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: renderToast,
        args: [isForce, options.reloadPage, storageReport]
      });

      // If reload is enabled, trigger reload after 2 seconds
      if (options.reloadPage) {
        setTimeout(() => {
          chrome.tabs.reload(tab.id);
        }, 2000);
      }
    };

    // Delete cookies via Chrome API if enabled, then complete cleanup
    if (options.cleanCookies) {
      const baseDomain = getBaseDomain(hostname);
      deleteCookiesAndGetCount(tab, baseDomain, isForce, exceptions).then((cookiesDeletedCount) => {
        completeClean(cookiesDeletedCount);
      });
    } else {
      completeClean(0);
    }
  });
}
