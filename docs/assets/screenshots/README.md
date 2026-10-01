# README interface captures

Captured from the running Tenno Link interface on September 24, 2026. The GIFs use a 680 × 860 CSS pixel local preview. The banners combine those captures with text. `mission-filter-banner.webm` uses full-colour 1100 × 360 frames and Chrome's WebM encoder. `website-floating-button.png` shows the launcher on the local website preview at 1440 × 900 CSS pixels. These captures do not show a live account or the actual warframe.com page.

Data comes from `tests/preview.cjs`: the sample account is **Preview Tenno**. Mission records and catalog entries are synthetic fixtures for layout testing, not verified live game records. No private account data is included.

To refresh:

1. Install Playwright and Pillow in your local Node and Python environments. Use a local Chrome installation.
2. Run `node tests/capture-media.cjs --gifs` from the repository root to remake
   the GIFs at the native 680-pixel capture width and keep the website screenshot.
   Run without `--gifs` if you also want to recapture that screenshot.
   To remake only `mission-filter-banner.gif` while preserving the website
   screenshot and other GIFs, run `node tests/capture-media.cjs --mission-banner`.
   For the sharper full-colour video, run `node tests/capture-media.cjs --mission-webm`.
   This uses Chrome's WebM encoder and preserves the existing GIF.
3. Review the GIFs and website screenshot here before committing them. The script uses `tests/preview.cjs` and captures Overview scrolling, Star Chart search and filter actions, Live countdowns, and an AI Bridge farming request with named materials and quantities.

The local preview mocks extension APIs. These animations do not establish authenticated sync or live website integration.
