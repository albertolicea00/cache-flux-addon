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

  // Load options from storage (default: all clean settings true, reload false)
  chrome.storage.sync.get({
    cleanCookies: true,
    cleanLocalStorage: true,
    cleanSessionStorage: true,
    cleanCacheStorage: true,
    cleanIndexedDB: true,
    reloadPage: false,
    exceptions: []
  }, (result) => {
    cleanCookiesCheckbox.checked = result.cleanCookies;
    cleanLocalStorageCheckbox.checked = result.cleanLocalStorage;
    cleanSessionStorageCheckbox.checked = result.cleanSessionStorage;
    cleanCacheStorageCheckbox.checked = result.cleanCacheStorage;
    cleanIndexedDBCheckbox.checked = result.cleanIndexedDB;
    reloadPageCheckbox.checked = result.reloadPage;

    exceptions = result.exceptions;
    renderList();
  });

  function saveSettings() {
    chrome.storage.sync.set({
      cleanCookies: cleanCookiesCheckbox.checked,
      cleanLocalStorage: cleanLocalStorageCheckbox.checked,
      cleanSessionStorage: cleanSessionStorageCheckbox.checked,
      cleanCacheStorage: cleanCacheStorageCheckbox.checked,
      cleanIndexedDB: cleanIndexedDBCheckbox.checked,
      reloadPage: reloadPageCheckbox.checked
    }, () => {
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
    chrome.storage.sync.set({ exceptions }, () => {
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
