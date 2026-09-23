# Interface captures

Captured from the running Tenno Link interface on September 23, 2026 at a 680 × 860 CSS pixel viewport. PNGs are browser screenshots, without compositing or generated UI artwork.

Data comes from `tests/preview.cjs`: the sample account is **Preview Tenno**. Mission records and catalog entries are synthetic fixtures for layout testing, not verified live game records. No private account data is included.

To refresh:

1. Run `node tests/preview.cjs`.
2. Open `http://127.0.0.1:8765/popup.html?overlay=1` at 680 × 860.
3. Capture Overview at the top, Export at the top, and Star Chart with Mercury expanded and scrolled into view.
4. Wait for entry animations to finish before capturing. Save the PNGs here under the existing filenames.

The local preview mocks extension APIs. These screenshots do not establish authenticated sync or live website integration.
