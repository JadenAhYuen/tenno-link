# 🚀 Install Tenno Link in Chrome

Tenno Link is currently in active development. Until the Chrome Web Store build is available, install it as an unpacked extension.

## ✅ Requirements

- 🌐 Google Chrome or another Chromium-based browser
- 🎮 A Warframe account
- 📁 A local copy of this repository

## 🧑‍💻 Developer-mode install

1. 📥 Download this repository with **Code → Download ZIP**, or clone it with Git.
2. 📂 If you downloaded a ZIP, extract it to a permanent folder.
3. 🌐 In Chrome, open `chrome://extensions/`.
4. 🛠️ Enable **Developer mode** in the top-right corner.
5. ➕ Click **Load unpacked**.
6. 📁 Select the folder containing `manifest.json`.
7. 📌 Pin **Tenno Link** from Chrome's Extensions menu if you want quick access.
8. 🔑 Sign in to [warframe.com](https://www.warframe.com/).
9. 🔄 Open Tenno Link and press **Sync**.

## 🔁 Updating a developer install

If you cloned with Git:

```bash
git pull
```

Then open `chrome://extensions/` and click **Reload** on Tenno Link.

If you downloaded a ZIP, replace the files in the same folder with the newer release and click **Reload**.

## 🔐 Permissions

Tenno Link currently requests:

- 🍪 **cookies** — reads the Warframe `gid` used to request profile-view data.
- 💾 **storage** — caches normalized profile and public world-state data locally.
- 📋 **clipboardWrite** — copies the AI prompt/profile package when you explicitly click a copy action.
- 🌐 **warframe.com host access** — profile linking.
- 📡 **warframestat.us host access** — public world-state and maintained item/recipe metadata.

Tenno Link does not send your Warframe login password or session cookies to a Tenno Link server.

> 🛍️ **Planned stable installation:** Chrome Web Store for one-click install and automatic updates.
