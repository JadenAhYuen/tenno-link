<p align="center">
  <img src="assets/tenno-link-logo.svg" alt="Tenno Link logo" width="112">
</p>

# ✨ Tenno Link

**Tenno Link** is an unofficial, local-first Warframe profile and AI bridge.

It links your Warframe profile to a compact browser dashboard, combines account data with public world-state information, and prepares privacy-conscious profile packages that you can copy into the AI assistant of your choice.

> 🚧 **Status:** active preview development. Tenno Link is not affiliated with or endorsed by Digital Extremes.

## 🌌 What Tenno Link does

- 🏠 **Home** — Mastery Rank, missions, play time, arsenal counts and career stats
- 🧭 **Progress** — mission, challenge, affiliation, Operator and XP records
- 🔫 **Equipment** — profile history grouped by WFCD category, searchable and sortable by usage, kills or affinity
- 🌌 **Star Chart** — illustrated planets, mission checklists, cleared junction evidence and profile-based exploration suggestions
- 📡 **Live** — current PC activities, countdowns and a pinned farming goal
- 🤖 **AI Bridge** — 12 prompt presets with Recommended, Compact and Raw export modes
- 💾 Cache-aware syncing and local storage
- 🔐 No Tenno Link recommendation backend required

<p align="center">
  <img src="docs/assets/ai-bridge-preview.svg" alt="Tenno Link export preview" width="88%">
</p>

## Read your profile in the tool

Overview explains lifetime mission pace and career counters. Equipment offers local search, sorting by time/kills/affinity, expandable details and incremental loading. Standing exposes reported affiliations, including negative standing. Live and Export remain available.

The popup uses an original dark glass treatment with Warframe-inspired cyan and gold accents. The logo beacon, page transitions, and control feedback use short CSS animations; reduced-motion and increased-contrast preferences are supported.

On `warframe.com`, a floating Tenno Link button opens the **full six-section interface** over the page. Drag the slim top handle to move it; close it to return to the small launcher. The frame adapts to narrow screens, keeps the header and navigation visible, and scrolls only the active section when its content is long. The account UI stays inside an extension-origin frame rather than being copied into the website DOM.

The interface supports narrow layouts and keyboard focus, and distinguishes missing values from zero. Loadout records are not described as owned items, and historical affinity is not treated as mastery completion.

See [design review and verification](docs/design-review.md) for calculation definitions and current validation limits.

### Local checks

```sh
node tests/inventory.test.js
node tests/inventory-safety.test.cjs
node tests/catalog.test.cjs
node tests/insights.test.js
node tests/progression.test.cjs
node tests/farming.test.cjs
node tests/popup.test.cjs
node tests/storage.test.cjs
node tests/preview.cjs
```

The preview opens at `http://127.0.0.1:8765` with synthetic data and mocked extension APIs. Visit `/site` on that server to try the floating interface. Optionally pass a local profile JSON path to the preview or profile paths to the insights test. Samples are read locally and are not copied into the repository. Stop the preview with Ctrl+C.

## 🛰️ How the data flows

<p align="center">
  <img src="docs/assets/data-flow.svg" alt="Tenno Link local-first data flow" width="92%">
</p>

Tenno Link keeps normalization separate from presentation so upstream format changes can be handled in one place.

## 🔒 Privacy by design

<p align="center">
  <img src="docs/assets/privacy-flow.svg" alt="Tenno Link privacy model" width="92%">
</p>

- ✅ Warframe passwords are never collected
- ✅ session cookies are not included in AI exports
- ✅ profile data is cached in Chrome extension storage
- ✅ clipboard export only happens after you press a copy button
- ✅ public world-state/item metadata comes from WarframeStat.us
- 🚫 no Tenno Link cloud account is required

Read the full [privacy policy](PRIVACY.md).

## 🚀 Install

For the current development build:

1. 📥 Download or clone this repository
2. 🌐 Open `chrome://extensions/`
3. 🧑‍💻 Enable **Developer mode**
4. 📂 Click **Load unpacked**
5. ✅ Select the repository folder containing `manifest.json`
6. 🔑 Log in to the official Warframe website
7. 🔄 Open Tenno Link and press **Sync**

See the full [Chrome installation guide](docs/INSTALL.md).

> 🛍️ A Chrome Web Store release is planned for one-click installation and automatic updates.

## 🎓 Tutorial

The [Tenno Link tutorial](docs/TUTORIAL.md) covers:

- 🔗 profile linking
- 📊 dashboard basics
- 🛠️ material readiness
- 📡 live world-state data
- 🤖 AI export

## 🤖 AI Bridge

<p align="center">
  <img src="docs/assets/ai-bridge-preview.svg" alt="Tenno Link AI Bridge preview" width="92%">
</p>

Tenno Link does not require an AI API key. It prepares a prompt and selected profile package locally, then you choose where to paste it.

## 🌐 Data sources

- 🎮 Digital Extremes Warframe profile-view endpoint for player profile data
- 📡 WarframeStat.us / WFCD for public world-state and maintained item metadata

These are treated as upstream dependencies, not as data formats Tenno Link controls.

## 🧪 Testing

Automated tests cover:

- 💰 currency detection
- 📦 quantity-bearing inventory extraction
- ➕ duplicate quantity merging
- 🏷️ category inference
- 🧾 recipe catalog normalization
- ✅ material-readiness calculation
- 🧹 blueprint pseudo-component removal

GitHub Actions also validates the extension manifest and JavaScript syntax.

## 🧑‍💻 Development

Feature work is developed on branches and reviewed through pull requests.

For an unpacked extension that is already loaded:

```text
git pull
→ chrome://extensions/
→ Reload
```

## 📜 License & copyright

Tenno Link source code and original project assets are released under the [MIT License](LICENSE).

**Copyright © 2026 Jaden Ah Yuen and Tenno Link contributors.**

Warframe and related trademarks, names and game assets belong to Digital Extremes Ltd. The project license does not grant rights to third-party intellectual property.

## 📚 Project docs

- 🚀 [Install](docs/INSTALL.md)
- 🎓 [Tutorial](docs/TUTORIAL.md)
- 🔒 [Privacy](PRIVACY.md)
- 🛡️ [Security](SECURITY.md)
- 🤝 [Contributing](CONTRIBUTING.md)
- 📦 [Release checklist](RELEASE.md)
- 📝 [Changelog](CHANGELOG.md)

---

<p align="center">
  <strong>⚡ Your profile. Your data. Your AI. ⚡</strong>
</p>

## Star Chart and item pictures

Loadouts and equipment history display WFCD images when available, with a placeholder if an image is missing or fails. Item definitions do not prove ownership.

Star Chart joins recorded mission tags to public destination metadata. It shows per-destination node completion evidence and completed incoming junctions. It does not claim that an unrecorded destination is locked or infer current access from activity alone. Duplicate tiers count once; unknown mission tags remain visible separately. Destination totals are not an authoritative Steel Path or Arbitration checklist.

Reload the unpacked extension after updating. Item data schema 5 automatically refreshes older caches to add mission and equipment details.

Good follow-up features would be change history across syncs and a richer mission route planner.

The Catalog browsing page was removed. Its public metadata still loads in the background for equipment names, item images and destinations. Star Chart displays distinct original planet illustrations and expandable mission objectives and details. Equipment entries include public descriptions and whichever base stats the source provides. Inventory balances are not shown because the profile-view data may omit them.

## Live activities and farming goals

Overview highlights up to three current PC world-state activities. Live lets you pin a blueprint, part or mod name and check exact-name matches against WFCD mission rewards, blueprint drops, mod drops and intact relic rewards. Mission sources appear first; enemy table percentages are labelled as conditional on an item or mod drop. A matching mission may show that a completion was recorded in the profile. The goal is saved locally, while the full public drop files are not stored in extension storage. A completion record does not establish current access, and a drop source does not establish ownership.
