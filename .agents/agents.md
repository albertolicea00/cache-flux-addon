# Agent Instructions for CacheCleaner

This repository contains **CacheCleaner**, a browser extension built with Manifest V3 designed to clear site data (cookies, localStorage, etc.) with a single click. When assisting with this project, please adhere to the following rules and context.

## Tech Stack
- **Core:** Vanilla JavaScript (ES6+)
- **Styling:** Pure CSS
- **Markup:** HTML5
- **Architecture:** Chrome Extension Manifest V3
  - `background.js` (Service Worker handling cleanup logic)
  - `options.html` & `options.js` (Settings page for managing the exception list)

## Development Rules & Guidelines

1. **No Frameworks or Build Tools:**
   - This project uses purely native web technologies. Do not introduce React, Vue, Webpack, Vite, TailwindCSS, or any other libraries/bundlers.
   - Code must be able to run directly in the browser without any transpilation or build step.

2. **Code Style:**
   - Use modern JavaScript syntax (`const`, `let`, arrow functions, destructuring, async/await).
   - Avoid `var`.
   - Implement proper error handling with `try/catch` blocks.
   - Add inline comments for complex logic or Chrome API interactions (especially `chrome.browsingData` and `chrome.storage`).

3. **Performance & Security:**
   - Keep the performance footprint minimal (zero lag, low CPU usage).
   - Adhere strictly to Manifest V3 security requirements.
   - Avoid requesting unnecessary permissions in `manifest.json`.
   - **Privacy First:** Never collect, track, or store user data externally. All operations must run locally in the browser context.

4. **Debugging:**
   - When adding `console.log` messages for debugging, prefix them clearly with `🧹 CacheCleaner:` so they are easy to identify in the console.

## Workflow
- The project uses a two-branch workflow (`main` for releases, `beta` for active development).
- Ensure any UI additions to the options page match the existing simple and clean aesthetic.
