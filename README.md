<div align="left">
  <h1>🧹 CacheCleaner</h1>
  <p><strong>One-click browser data cleaner for developers.</strong><br/>
  Sweep away cookies, localStorage, sessionStorage, IndexedDB, and CacheStorage — instantly.</p>
  <p>
    <a href="#-from-extension-stores-recommended"><img src="https://img.shields.io/badge/Chrome_Web_Store-Available-4285F4?style=flat-square&logo=google-chrome&logoColor=white" alt="Chrome Web Store" /></a>
    <a href="#-from-extension-stores-recommended"><img src="https://img.shields.io/badge/Firefox_Add--ons-Available-FF7139?style=flat-square&logo=firefox-browser&logoColor=white" alt="Firefox Add-ons" /></a>
    <a href="#-from-extension-stores-recommended"><img src="https://img.shields.io/badge/Edge_Add--ons-Available-0078D7?style=flat-square&logo=microsoft-edge&logoColor=white" alt="Edge Add-ons" /></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" />
    <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3" />
    <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5" />
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License MIT" />
  </p>
</div>


## 🚀 Why CacheCleaner?

As developers, we constantly deal with stale cached data during development. Manually going to DevTools → Application → Clear Storage every single time is tedious and breaks your flow.

**CacheCleaner** gives you a single-click broom icon in your toolbar that instantly wipes all site data for your active tab — so you can focus on building, not cleaning.


## ✨ Features

- 🖱️ **One-Click Clean**: Click the broom icon → clears all selected site data for the active tab instantly.
- ⚙️ **Granular Cleanup Settings**: Choose exactly what data categories to wipe (Cookies, LocalStorage, SessionStorage, CacheStorage, IndexedDB) in the Options page.
- 🔄 **Automatic Tab Reload**: Toggle automatic tab refreshing in settings to immediately apply cleanup changes.
- 🛡️ **Exception List**: Protect specific keys (e.g., `auth_token`, `theme`) from being deleted during standard cleanups.
- 💥 **Force Clean**: Right-click the extension icon → "Force Clean" ignores all exceptions and clears all selected storage categories.
- 🟢 **Visual Feedback**: A beautiful page-injected toast notification shows a real-time progress wheel and cycles through cleaning stages.
- 🔒 **Privacy First**: Works strictly on the active tab's domain and parent domains. No tracking, no external data storage.

### What gets cleaned

- ✅ `localStorage`
- ✅ `sessionStorage`
- ✅ `Cookies` (including HttpOnly via Chrome API)
- ✅ `IndexedDB` databases
- ✅ `CacheStorage` (Service Worker caches)


## 📥 Installation

### 🌐 From Extension Stores (Recommended)

Installing from the official stores is the easiest way to get **CacheCleaner** and ensure it stays updated automatically. *(Links will be active once published!)*

1. **Google Chrome & Chromium-based browsers (Brave, Vivaldi, Opera)**
   - 👉 [Download on Chrome Web Store](#)
   - Click **"Add to Chrome"** and confirm.

2. **Microsoft Edge**
   - 👉 [Download on Edge Add-ons](#)
   - Click **"Get"** and confirm.

3. **Mozilla Firefox**
   - 👉 [Download on Firefox Add-ons](#)
   - Click **"Add to Firefox"** and confirm.

### 🛠️ Manual Installation (Developer Mode)

If you want to test the latest features or contribute to the project, you can install the extension manually.

1. 📥 Download or clone this repository:
   ```bash
   git clone https://github.com/albertolicea00/CacheCleaner.git
   ```
2. 🌐 Open your Chromium-based browser (Chrome, Edge, Brave).
3. ⚙️ Go to the extensions page: `chrome://extensions/` (or `edge://extensions/`).
4. 🔓 Enable **"Developer mode"** in the top right corner.
5. 📂 Click **"Load unpacked"** and select the folder containing these files.
6. 📌 Pin the **CacheCleaner** icon to your toolbar for easy access!


## 🧑‍💻 Usage

### Standard Clean

Simply **left-click** the 🧹 broom icon on the toolbar.

- Clears all site data for the current tab
- Respects your configured exceptions
- Shows a toast notification listing the cleared items after a brief progress animation

### Configure Exceptions

1. **Right-click** the extension icon → **Options**
2. Add the exact key names you want to protect (e.g., `auth_token`, `user_preferences`)
3. These keys will be **preserved** during standard cleans

### Force Clean

1. **Right-click** the extension icon
2. Select **"Force Clean (Ignore Exceptions)"**
3. This will delete **everything** regardless of exceptions
4. Shows a "Force Clean Completed" toast notification listing the cleared items


## 🏗️ Project Structure

```
CacheCleaner/
├── manifest.json       # Extension config (Manifest V3)
├── background.js       # Service Worker — handles click, context menu & cleanup logic
├── options.html        # Settings UI — manage exception keys
├── options.js          # Options page logic — save/load exceptions via chrome.storage
├── icons/              # Extension icons (16, 32, 48, 64, 128)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon64.png
│   └── icon128.png
├── LICENSE             # MIT License
└── README.md           # You are here!
```


## 🔐 Permissions Explained

| Permission     | Why it's needed                                             |
| -------------- | ----------------------------------------------------------- |
| `activeTab`    | Access the currently active tab to run cleanup scripts      |
| `scripting`    | Inject cleanup code into the page context                   |
| `cookies`      | Delete HttpOnly cookies that JavaScript can't access        |
| `storage`      | Persist your exceptions list and cleanup configurations     |
| `contextMenus` | Add the "Force Clean" context menu item to the icon         |
| `<all_urls>`   | Required by Chrome Cookies API to match active tab site URL |

> ⚠️ **No data is ever collected, transmitted, or stored externally.** Everything runs locally in your browser.


## 🤝 Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) guide before submitting a pull request or opening an issue.


## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.


## 👤 Author

**Alberto Licea** — [@albertolicea00](https://github.com/albertolicea00)

---

<p align="center">
  Made with ❤️ for developers who are tired of clearing cache manually.
</p>
