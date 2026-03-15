document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('exclusion-input');
  const addBtn = document.getElementById('add-btn');
  const listContainer = document.getElementById('exceptions-list');
  const notification = document.getElementById('notification');

  let exceptions = [];

  // Load from storage
  chrome.storage.sync.get(['exceptions'], (result) => {
    if (result.exceptions) {
      exceptions = result.exceptions;
      renderList();
    }
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
