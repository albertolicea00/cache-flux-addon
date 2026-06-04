<div align="left">
  <h1>🧹 CacheFlux</h1>
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

## 🚀 Why CacheFlux?

As developers, we constantly deal with stale cached data during development. Manually going to DevTools → Application → Clear Storage every single time is tedious and breaks your flow.

**CacheFlux** gives you a single-click broom icon in your toolbar that instantly wipes all site data for your active tab — so you can focus on building, not cleaning.

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

Installing from the official stores is the easiest way to get **CacheFlux** and ensure it stays updated automatically.

> ⚠️ **Coming soon — currently under review**

<!-- TODO -->
<!-- 1. **Google Chrome & Chromium-based browsers (Brave, Vivaldi, Opera)**
   - 👉 [Download on Chrome Web Store](https://chromewebstore.google.com/)
   - Click **"Add to Chrome"** and confirm.

2. **Microsoft Edge**
   - 👉 [Download on Edge Add-ons](https://microsoftedge.microsoft.com/addons)
   - Click **"Get"** and confirm.

3. **Mozilla Firefox**
   - 👉 [Download on Firefox Add-ons](https://addons.mozilla.org/)
   - Click **"Add to Firefox"** and confirm. -->

### 🛠️ Manual Installation (Developer Mode)

If you want to test the latest features or contribute to the project, you can install the extension manually.

#### 1. 📥 Download or clone this repository:

```bash
git clone https://github.com/albertolicea00/CacheFlux.git
```

#### 2. 🔀 Set the Target Manifest (Chrome/MV3 or Firefox/MV2):

Before loading the extension, switch to the appropriate manifest version for your target browser:

- **For Google Chrome / Chromium (Manifest V3)**:
  ```bash
  make chrome
  ```
- **For Mozilla Firefox (Manifest V2)**:
  ```bash
  make firefox
  ```

This copies the correct manifest template to the ignored `manifest.json` file.

#### 3. Load the Extension in Your Browser:

##### For Google Chrome & Chromium-based browsers (Edge, Brave, Opera):

1. 🌐 Open your browser and go to `chrome://extensions/` (or `edge://extensions/`).
2. 🔓 Enable **"Developer mode"** in the top right corner.
3. 📂 Click **"Load unpacked"** and select the extension folder.

##### For Mozilla Firefox:

1. 🦊 Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. 📂 Click **"Load Temporary Add-on..."**.
3. 📄 Select the `manifest.json` file in the extension folder.

#### 3. 📌 Pin the **CacheFlux** icon to your toolbar for easy access!

### 📦 Building Packages Locally

If you need to generate the production `.zip` files locally for manual distribution or testing, you can run:

```bash
make build
```

This reads the current version from `manifest.v3.json` and creates a `dist/[VERSION]/` directory containing the `cache-flux-manifest-v3.zip` and `cache-flux-manifest-v2.zip` packages. You can clean this up at any time with `make clean`.

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
CacheFlux/
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


## 🚀 Releasing to Stores (GitHub Actions)

This project uses fully automated GitHub Actions to package and publish the extension to Chrome, Edge, Firefox, and Opera.

To trigger a new release, you **must** create and push a version tag. The CI/CD pipeline is configured to **only** build and generate the `.zip` packages when a tag is pushed. It will not generate zips on regular pushes to `main`.

To automatically read the version from `manifest.v3.json`, create a tag, and push a new version:

1. **Bump the `"version"`** field in both `manifest.v3.json` and `manifest.v2.json`.
2. Commit your changes.
3. Run the publish command:

```bash
make publish
```

This command automatically runs `git tag v[VERSION]` and `git push origin v[VERSION]` for you.

Once pushed, GitHub Actions will automatically:

1. Build the `.zip` files for Chrome/Edge/Opera (Manifest V3) and Firefox (Manifest V2).
2. Create a GitHub Release with the `.zip` files attached.
3. Upload and publish the extension to all supported browser stores.

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
