// ============================================================================
// CacheCleaner - Background Service Worker / Event Page
// ============================================================================
// This script coordinates cleanup of the active tab's site data.
// It combines:
// 1. Script injection (to access local DOM storage on the page).
// 2. Chrome APIs (to query and delete HttpOnly and partitioned cookies).
// 3. User feedback (displays a beautiful, theme-adaptive toast in the tab).
// ============================================================================

// ----------------------------------------------------------------------------
// Manifest V2 / V3 Compatibility Shim
// ----------------------------------------------------------------------------
const isMV3 = typeof chrome.action !== 'undefined';
const actionAPI = isMV3 ? chrome.action : chrome.browserAction;

// Unified script execution helper that normalizes the returned results format
// so the callback can always read results[0].result like in MV3.
function executeScriptOnTab(tabId, func, args, callback) {
  if (isMV3) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: func,
      args: args
    }, (results) => {
      if (callback) callback(results);
    });
  } else {
    chrome.tabs.executeScript(tabId, {
      code: `(${func.toString()})(${args.map(arg => JSON.stringify(arg)).join(', ')})`
    }, (results) => {
      if (callback) {
        // Map raw array output of MV2 to match MV3's InjectionResult layout
        const wrappedResults = results ? results.map(val => ({ result: val })) : [];
        callback(wrappedResults);
      }
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  // Create context menu item under the extension action icon
  chrome.contextMenus.create({
    id: "forceClean",
    title: "Force Clean (Ignore Exceptions)",
    contexts: [isMV3 ? "action" : "browser_action"]
  });
});

// Retrieve user preferences and exceptions from sync storage
async function getOptions() {
  const defaults = {
    cleanCookies: true,
    cleanLocalStorage: true,
    cleanSessionStorage: true,
    cleanCacheStorage: true,
    cleanIndexedDB: true,
    reloadPage: false,
    exceptions: []
  };
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(defaults, (result) => {
        if (chrome.runtime.lastError || !result) {
          chrome.storage.local.get(defaults, (localResult) => {
            resolve(localResult || defaults);
          });
        } else {
          resolve(result);
        }
      });
    } catch (e) {
      chrome.storage.local.get(defaults, (localResult) => {
        resolve(localResult || defaults);
      });
    }
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
  const bgColor = isDark 
  ? 'rgba(31, 41, 55, .9)'
  : 'rgba(255, 255, 255, .9)';
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
  toast.style.alignItems = 'flex-start';
  toast.style.gap = '14px';
  toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  toast.style.transform = 'translateY(50px) scale(0.95)';
  toast.style.opacity = '0';

  // Inject spinner styles if not already present in document
  let styleTag = document.getElementById('cache-cleaner-toast-style');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'cache-cleaner-toast-style';
    styleTag.textContent = `
      @keyframes cc-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .cc-spinner-spin {
        animation: cc-spin 0.8s linear infinite !important;
      }
    `;
    document.head.appendChild(styleTag);
  }

  // Create loading spinner element
  const spinner = document.createElement('div');
  spinner.className = 'cc-spinner-spin';
  spinner.style.width = '24px';
  spinner.style.height = '24px';
  spinner.style.border = `3px solid ${borderColor}`;
  spinner.style.borderTop = `3px solid ${accentColor}`;
  spinner.style.borderRadius = '50%';
  spinner.style.flexShrink = '0';
  spinner.style.display = 'inline-block';
  spinner.style.transition = 'all 0.2s ease';

  // Container to hold either spinner or broom emoji without layout shifts
  const iconContainer = document.createElement('div');
  iconContainer.style.width = '24px';
  iconContainer.style.height = '24px';
  iconContainer.style.display = 'flex';
  iconContainer.style.alignItems = 'center';
  iconContainer.style.justifyContent = 'center';
  iconContainer.style.fontSize = '24px';
  iconContainer.style.transition = 'all 0.2s ease';
  iconContainer.style.marginTop = '2px';
  iconContainer.appendChild(spinner);
  toast.appendChild(iconContainer);

  const textContainer = document.createElement('div');
  textContainer.style.display = 'flex';
  textContainer.style.flexDirection = 'column';
  
  const title = document.createElement('strong');
  title.textContent = 'Cleaning site data...';
  title.style.color = accentColor;
  title.style.fontSize = '14px';
  title.style.fontWeight = '600';
  title.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
  textContainer.appendChild(title);

  const details = document.createElement('div');
  details.style.color = descColor;
  details.style.fontSize = '12px';
  details.style.marginTop = '4px';
  details.style.lineHeight = '1.4';
  details.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
  details.textContent = 'Sweeping LocalStorage & SessionStorage...';
  textContainer.appendChild(details);

  toast.appendChild(textContainer);
  document.body.appendChild(toast);

  // Transition helper function for smooth text fades and content updates
  const transitionText = (element, newContent, callback) => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(-2px)';
    setTimeout(() => {
      if (newContent !== undefined) {
        element.innerHTML = '';
        if (typeof newContent === 'string') {
          element.textContent = newContent;
        } else if (Array.isArray(newContent)) {
          if (newContent.length > 0) {
            const list = document.createElement('div');
            list.style.display = 'flex';
            list.style.flexDirection = 'column';
            list.style.gap = '4px';
            list.style.marginTop = '4px';
            newContent.forEach(item => {
              const row = document.createElement('div');
              row.style.display = 'flex';
              row.style.alignItems = 'flex-start';
              row.style.gap = '6px';
              
              const bullet = document.createElement('span');
              bullet.textContent = '•';
              bullet.style.color = accentColor;
              bullet.style.lineHeight = '1';
              bullet.style.marginTop = '3px';
              row.appendChild(bullet);
              
              const label = document.createElement('span');
              label.textContent = item;
              row.appendChild(label);
              
              list.appendChild(row);
            });
            element.appendChild(list);
          } else {
            element.textContent = 'No site data was found or cleared.';
          }
        }
      }
      if (callback) callback();
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    }, 150);
  };

  // Slide-in transition for the toast container itself
  setTimeout(() => {
    toast.style.transform = 'translateY(0) scale(1)';
    toast.style.opacity = '1';
  }, 50);

  // Fake progress step 2
  setTimeout(() => {
    transitionText(details, 'Clearing databases (IndexedDB)...');
  }, 500);

  // Fake progress step 3
  setTimeout(() => {
    transitionText(details, 'Wiping cookies & assets cache...');
  }, 1000);

  // Success Phase (Transitions to broom emoji and reveals final results)
  setTimeout(() => {
    // 1. Swap icon from spinner to broom emoji
    iconContainer.style.opacity = '0';
    iconContainer.style.transform = 'scale(0.8)';
    setTimeout(() => {
      iconContainer.innerHTML = '🧹';
      iconContainer.style.opacity = '1';
      iconContainer.style.transform = 'scale(1)';
    }, 150);

    // 2. Update title to completion state
    const finalTitle = isForce ? 'Force Clean Completed' : 'Cleanup Completed';
    transitionText(title, finalTitle);

    // 3. Compile report of what was actually deleted
    const detailsList = [];
    if (storageReport.localStorage && !storageReport.localStorage.includes("0 items")) {
      detailsList.push(`LocalStorage: ${storageReport.localStorage.includes("all") ? "all cleared" : storageReport.localStorage}`);
    }
    if (storageReport.sessionStorage && !storageReport.sessionStorage.includes("0 items")) {
      detailsList.push(`SessionStorage: ${storageReport.sessionStorage.includes("all") ? "all cleared" : storageReport.sessionStorage}`);
    }
    if (storageReport.cookies && !storageReport.cookies.includes("0 cookies")) {
      detailsList.push(`Cookies: ${storageReport.cookies}`);
    }
    if (storageReport.cacheStorage) {
      detailsList.push('CacheStorage cleared');
    }
    if (storageReport.indexedDB) {
      detailsList.push('IndexedDB database cleared');
    }

    transitionText(details, detailsList);

    // 4. Handle page reload display or auto-dismiss
    if (willReload) {
      setTimeout(() => {
        const reloadText = document.createElement('span');
        reloadText.style.color = accentColor;
        reloadText.style.fontSize = '11px';
        reloadText.style.marginTop = '6px';
        reloadText.style.fontWeight = '600';
        reloadText.style.display = 'flex';
        reloadText.style.alignItems = 'center';
        reloadText.style.gap = '4px';
        reloadText.style.opacity = '0';
        reloadText.style.transform = 'translateY(2px)';
        reloadText.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        reloadText.textContent = 'Reloading page in 2 seconds...';
        textContainer.appendChild(reloadText);
        
        setTimeout(() => {
          reloadText.style.opacity = '1';
          reloadText.style.transform = 'translateY(0)';
        }, 50);
      }, 300);
    } else {
      setTimeout(() => {
        toast.style.transform = 'translateY(20px) scale(0.95)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }
  }, 1500);
}

// Listen for context menu clicks ("Force Clean")
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "forceClean") {
    if (!tab.url || tab.url.startsWith("chrome://")) return;
    performClean(tab, true); 
  }
});

// Listen for the main extension action button clicks
chrome.browserAction.onClicked.addListener(async (tab) => {
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
// Animates the extension action icon in the toolbar (sweeping motion)
// for the duration of the cleaning process (1.5 seconds) using OffscreenCanvas.
// ----------------------------------------------------------------------------
async function animateExtensionIcon(tabId) {
  try {
    const response = await fetch(chrome.runtime.getURL('icons/icon32.png'));
    const blob = await response.blob();
    const imgBitmap = await createImageBitmap(blob);

    const canvas = (typeof OffscreenCanvas !== 'undefined')
      ? new OffscreenCanvas(32, 32)
      : document.createElement('canvas');
    if (canvas.width === undefined) {
      canvas.width = 32;
      canvas.height = 32;
    }
    const ctx = canvas.getContext('2d');

    const totalSteps = 15; // 15 steps * 100ms = 1.5 seconds
    let step = 0;

    const intervalId = setInterval(() => {
      ctx.clearRect(0, 0, 32, 32);
      ctx.save();
      
      // Sweep motion: translate to center, rotate, draw, and restore.
      ctx.translate(16, 16);
      
      // Calculate sweeping angle using a sine wave oscillation
      // The wave repeats ~1.9 times over 15 steps.
      const angle = 0.35 * Math.sin(step * 0.8);
      ctx.rotate(angle);
      
      ctx.drawImage(imgBitmap, -16, -16, 32, 32);
      ctx.restore();

      const imageData = ctx.getImageData(0, 0, 32, 32);
      
      chrome.browserAction.setIcon({
        tabId: tabId,
        imageData: { "32": imageData }
      }, () => {
        // Suppress errors if the tab is closed/reloaded during the animation
        if (chrome.runtime.lastError) {
          // Silent catch to prevent console noise
        }
      });

      step++;
      if (step >= totalSteps) {
        clearInterval(intervalId);
        // Reset to default icons
        chrome.browserAction.setIcon({
          tabId: tabId,
          path: {
            "16": "icons/icon16.png",
            "32": "icons/icon32.png",
            "48": "icons/icon48.png",
            "128": "icons/icon128.png"
          }
        }, () => {
          if (chrome.runtime.lastError) {
            // Silent catch
          }
        });
      }
    }, 100);
  } catch (error) {
    console.warn(`[CacheCleaner] Failed to run toolbar sweeping animation: ${error.message}`);
  }
}

// ----------------------------------------------------------------------------
// Orchestrates the coordinated cleanup (DOM injection + background cookies API)
// ----------------------------------------------------------------------------
async function performClean(tab, isForce) {
  const options = await getOptions();
  const exceptions = options.exceptions;
  const hostname = new URL(tab.url).hostname;

  // Start the sweeping animation of the action icon in the browser toolbar
  animateExtensionIcon(tab.id);

  // Inject and execute DOM storage cleanup first
  executeScriptOnTab(tab.id, deleteData, [exceptions, isForce, options], (results) => {
    
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
      executeScriptOnTab(tab.id, renderToast, [isForce, options.reloadPage, storageReport]);

      // If reload is enabled, trigger reload after 3.5 seconds
      // (Coordinated: 1.5 seconds fake progress + 2 seconds success visibility)
      if (options.reloadPage) {
        setTimeout(() => {
          chrome.tabs.reload(tab.id);
        }, 3500);
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
