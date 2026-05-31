<h1 align="left">🧹 CacheCleaner</h1>

<p align="left">
  <strong>One-click browser data cleaner for developers.</strong><br/>
  Sweep away cookies, localStorage, sessionStorage, IndexedDB, and CacheStorage — instantly.
</p>

<p align="left">
  <img src="https://img.shields.io/badge/manifest-v3-blue?style=flat-square" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/chrome-extension-green?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Extension" />
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/version-1.0.0-orange?style=flat-square" alt="Version" />
</p>


## 🚀 Why CacheCleaner?

As developers, we constantly deal with stale cached data during development. Manually going to DevTools → Application → Clear Storage every single time is tedious and breaks your flow.

**CacheCleaner** gives you a single-click broom icon in your toolbar that instantly wipes all site data for your active tab — so you can focus on building, not cleaning.


## ✨ Features

| Feature                | Description                                                                      |
| ---------------------- | -------------------------------------------------------------------------------- |
| 🖱️ **One-Click Clean** | Click the broom icon → clears all site data for the active tab instantly         |
| 🛡️ **Exception List**  | Protect specific keys (e.g. `auth_token`, `theme`) from being deleted            |
| 💥 **Force Clean**     | Right-click the icon → "Force Clean" ignores all exceptions and nukes everything |
| 🟢 **Visual Feedback** | Badge turns green `CLEAN` on standard clean, red `FORCE` on force clean          |
| 🔒 **Privacy First**   | Works only on the active tab. No background tracking. No data collected          |

### What gets cleaned

- ✅ `localStorage`
- ✅ `sessionStorage`
- ✅ `Cookies` (including HttpOnly via Chrome API)
- ✅ `IndexedDB` databases
- ✅ `CacheStorage` (Service Worker caches)


## 📦 Installation

### From Source (Developer Mode)

1. **Clone** this repository:

   ```bash
   git clone https://github.com/albertolicea00/CacheCleaner.git
   ```

2. Open **Chrome** (or any Chromium-based browser) and go to:

   ```
   chrome://extensions/
   ```

3. Enable **Developer mode** (toggle in the top-right corner).

4. Click **"Load unpacked"** and select the `CacheCleaner` folder.

5. 📌 **Pin the extension** to your toolbar for quick access!


## 🧑‍💻 Usage

### Standard Clean

Simply **left-click** the 🧹 broom icon on the toolbar.

- Clears all site data for the current tab
- Respects your configured exceptions
- Shows a green **CLEAN** badge as confirmation

### Configure Exceptions

1. **Right-click** the extension icon → **Options**
2. Add the exact key names you want to protect (e.g., `auth_token`, `user_preferences`)
3. These keys will be **preserved** during standard cleans

### Force Clean

1. **Right-click** the extension icon
2. Select **"Force Clean (Ignore Exceptions)"**
3. This will delete **everything** regardless of exceptions
4. Shows a red **FORCE** badge as confirmation


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

| Permission   | Why it's needed                                        |
| ------------ | ------------------------------------------------------ |
| `activeTab`  | Access the currently active tab to run cleanup scripts |
| `scripting`  | Inject cleanup code into the page context              |
| `cookies`    | Delete HttpOnly cookies that JavaScript can't access   |
| `storage`    | Persist your exception list across sessions            |
| `<all_urls>` | Required by Chrome Cookies API to match any site URL   |

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
