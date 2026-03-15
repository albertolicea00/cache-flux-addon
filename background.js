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
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i];
      var eqPos = cookie.indexOf("=");
      var name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
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

  // Clear HTTP Only cookies via chrome api
  chrome.cookies.getAll({ url: tab.url }, function (cookies) {
    for (let i = 0; i < cookies.length; i++) {
      if (isForce || !exceptions.includes(cookies[i].name)) {
        chrome.cookies.remove({ url: tab.url, name: cookies[i].name });
      }
    }
  });
}
