# Animated interface captures

Captured from the running Tenno Link interface on September 23, 2026 at a 680 × 860 CSS pixel viewport. The GIFs use browser screenshots of the local preview. The banner combines those captures with text; it does not show a live account.

Data comes from `tests/preview.cjs`: the sample account is **Preview Tenno**. Mission records and catalog entries are synthetic fixtures for layout testing, not verified live game records. No private account data is included.

To refresh:

1. Install Playwright and Pillow in your local Node and Python environments. Use a local Chrome installation.
2. Run `node tests/capture-media.cjs` from the repository root.
3. Review the GIFs here before committing them. The script uses `tests/preview.cjs` and captures Overview scrolling, Star Chart search and filter actions, and Export mode selection.

The local preview mocks extension APIs. These animations do not establish authenticated sync or live website integration.
