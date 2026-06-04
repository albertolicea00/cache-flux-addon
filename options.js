document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('exclusion-input');
  const addBtn = document.getElementById('add-btn');
  const listContainer = document.getElementById('exceptions-list');
  const notification = document.getElementById('notification');

  const cleanCookiesCheckbox = document.getElementById('clean-cookies');
  const cleanLocalStorageCheckbox = document.getElementById('clean-localstorage');
  const cleanSessionStorageCheckbox = document.getElementById('clean-sessionstorage');
  const cleanCacheStorageCheckbox = document.getElementById('clean-cachestorage');
  const cleanIndexedDBCheckbox = document.getElementById('clean-indexeddb');
  const reloadPageCheckbox = document.getElementById('reload-page');

  let exceptions = [];

  const defaults = {
    cleanCookies: true,
    cleanLocalStorage: true,
    cleanSessionStorage: true,
    cleanCacheStorage: true,
    cleanIndexedDB: true,
    reloadPage: false,
    exceptions: []
  };

  const loadSettings = (result) => {
    const data = result || defaults;
    cleanCookiesCheckbox.checked = data.cleanCookies;
    cleanLocalStorageCheckbox.checked = data.cleanLocalStorage;
    cleanSessionStorageCheckbox.checked = data.cleanSessionStorage;
    cleanCacheStorageCheckbox.checked = data.cleanCacheStorage;
    cleanIndexedDBCheckbox.checked = data.cleanIndexedDB;
    reloadPageCheckbox.checked = data.reloadPage;

    exceptions = data.exceptions;
    renderList();
  };

  // Load options from storage (default: all clean settings true, reload false)
  try {
    chrome.storage.sync.get(defaults, (result) => {
      if (chrome.runtime.lastError || !result) {
        chrome.storage.local.get(defaults, (localResult) => {
          loadSettings(localResult);
        });
      } else {
        loadSettings(result);
      }
    });
  } catch (e) {
    chrome.storage.local.get(defaults, (localResult) => {
      loadSettings(localResult);
    });
  }

  function saveSettings() {
    const data = {
      cleanCookies: cleanCookiesCheckbox.checked,
      cleanLocalStorage: cleanLocalStorageCheckbox.checked,
      cleanSessionStorage: cleanSessionStorageCheckbox.checked,
      cleanCacheStorage: cleanCacheStorageCheckbox.checked,
      cleanIndexedDB: cleanIndexedDBCheckbox.checked,
      reloadPage: reloadPageCheckbox.checked
    };
    
    try {
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          chrome.storage.local.set(data);
        }
      });
    } catch (e) {
      chrome.storage.local.set(data);
    }

    chrome.storage.local.set(data, () => {
      showNotification('Settings updated successfully.');
    });
  }

  // Register change event listeners for automatic settings persistence
  [
    cleanCookiesCheckbox,
    cleanLocalStorageCheckbox,
    cleanSessionStorageCheckbox,
    cleanCacheStorageCheckbox,
    cleanIndexedDBCheckbox,
    reloadPageCheckbox
  ].forEach(cb => {
    cb.addEventListener('change', saveSettings);
  });

  function saveExceptions() {
    try {
      chrome.storage.sync.set({ exceptions }, () => {
        if (chrome.runtime.lastError) {
          chrome.storage.local.set({ exceptions });
        }
      });
    } catch (e) {
      chrome.storage.local.set({ exceptions });
    }

    chrome.storage.local.set({ exceptions }, () => {
      showNotification('Exceptions saved successfully.');
    });
  }

  function renderList() {
    listContainer.innerHTML = '';
    if (exceptions.length === 0) {
      listContainer.innerHTML = '<p style="color: #6b7280; font-size: 14px; text-align: center; margin-top:20px;">No exceptions added yet.</p>';
      return;
    }
    exceptions.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'list-item';
      
      const text = document.createElement('span');
      text.textContent = item;
      
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = () => {
        exceptions.splice(index, 1);
        renderList();
        saveExceptions();
      };
      
      el.appendChild(text);
      el.appendChild(removeBtn);
      listContainer.appendChild(el);
    });
  }

  function showNotification(msg) {
    notification.textContent = msg;
    setTimeout(() => {
      notification.textContent = '';
    }, 3000);
  }

  addBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (val && !exceptions.includes(val)) {
      exceptions.push(val);
      input.value = '';
      renderList();
      saveExceptions();
    }
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addBtn.click();
    }
  });
});
