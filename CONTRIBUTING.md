# Contributing to CacheCleaner 🧹

Thank you for your interest in contributing to CacheCleaner! This guide will help you get started.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/CacheCleaner.git
   ```
3. **Load** the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked" and select the project folder

## Development Workflow

We use a two-branch workflow:
- `main`: Stable release version.
- `beta`: Active development branch.

**All Pull Requests must be directed to the `beta` branch.**

1. Create a new branch from `beta` for your feature or fix:

   ```bash
   git checkout -b feature/your-feature-name beta
   ```

2. Make your changes — the extension uses **Manifest V3** with:
   - `background.js` — Service Worker for cleanup logic
   - `options.html` / `options.js` — Settings page UI

3. **Test** your changes:
   - Reload the extension from `chrome://extensions/`
   - Test one-click clean on multiple sites
   - Test exception list (add, remove, and clean with exceptions)
   - Test force clean via the context menu
   - Check the browser console for any errors

4. Commit your changes with a clear message:

   ```bash
   git commit -m "feat: add support for clearing WebSQL"
   ```

5. Push and open a Pull Request

## Code Style

- Use **vanilla JavaScript** (no frameworks or build tools needed)
- Use `const` and `let` instead of `var`
- Add error handling with `try/catch` blocks
- Include `console.log` messages prefixed with `🧹 CacheCleaner:` for debugging

## Reporting Issues

When reporting a bug, please include:

- Browser name and version
- Steps to reproduce the issue
- Expected vs actual behavior
- Console errors (if any)

## Feature Requests

We welcome ideas! Please open an issue with the `enhancement` label and describe:

- What problem it solves
- How you'd like it to work
- Any alternatives you've considered

---

Thank you for helping make CacheCleaner better! 🙌
