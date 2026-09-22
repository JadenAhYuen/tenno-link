# Release checklist

## GitHub

- Bump `manifest.json` version
- Test account detection and profile HTTP 200
- Test world-state sync
- Test all tabs and copy actions
- Confirm no cookies appear in exported JSON
- Create a tagged GitHub release and attach the ZIP

## Chrome Web Store

- Use the Manifest V3 package
- Complete Store Listing and Privacy tabs
- Explain `cookies`, `storage`, and Warframe host permissions
- Provide privacy-policy URL
- Upload screenshots and 128px icon
- Submit for review
- After first publication, automate later uploads with the Chrome Web Store API if desired

Chrome Web Store publication is the one-click-install path. GitHub remains the source repository and release history.
