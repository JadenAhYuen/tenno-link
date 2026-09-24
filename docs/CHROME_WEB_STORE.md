# Chrome Web Store readiness

Reviewed against Chrome's published extension guidance on 24 September 2026. This is a preparation checklist, not approval from Google.

## Current fit

- The extension uses Manifest V3. Its JavaScript is packaged locally; remote requests in the current code fetch profile, world-state, item, and drop *data*, not executable code. Verify the final ZIP again before submission.
- The core purpose can be stated plainly: **help Warframe players understand their profile and prepare a current-game question for an AI assistant they choose**. Dashboard, Star Chart, and live views support that purpose.
- Permissions in `manifest.json` are `cookies`, `storage`, `clipboardWrite`, `offscreen`, and four HTTPS host patterns. The offscreen document handles user-requested copying outside the website's iframe policy. Explain each permission in the Store privacy form. Keep host patterns as narrow as the feature permits.
- The README and `PRIVACY.md` explain local storage, clipboard choices, WFCD drop data, and the limits of the profile snapshot.

## Before submitting

1. Test the packaged extension in Chrome with a signed-in Warframe account and a signed-out account. Local previews and synthetic data do not establish authenticated behavior.
2. Publish `PRIVACY.md` at a stable public HTTPS URL. Complete the Store Privacy tab with the same facts, including the `gid` cookie, profile identifier and data, local storage, remote profile request, remote images, and user-triggered clipboard export. State the single purpose and justify each permission.
3. Check whether `clipboardWrite` and every host pattern are still necessary in the final package; remove any unused access. Confirm the extension never exports the `gid` cookie or other authentication values.
4. Make the Store listing clear about the Warframe sign-in step and what AI Bridge actually does: it prepares text locally and does not provide its own AI model or guarantee current advice. Use genuine screenshots or clearly label sample data.
5. Supply listing imagery, support contact, and reviewer instructions for sign-in dependent features. Review the final release ZIP for only intended files and retest it after packaging.
6. Recheck Chrome's current policies immediately before submission; the Store reviewer makes the final determination.

## Listing draft

**Short description:** See your Warframe profile, plan your next goal, and copy a tailored AI question with the account details you choose.

**Opening description:** Tenno Link is an independent Warframe companion for new and experienced players. Start with your recorded profile, explore equipment and the Star Chart, then use AI Bridge to turn a specific goal into a question for your preferred AI assistant. You choose the data to attach and review the prompt before copying. Current-game prompts ask the assistant to check patch notes and source links; players should still verify advice in game.

**Privacy line:** Your profile snapshot is cached in Chrome extension storage. Tenno Link uses the Warframe `gid` cookie locally to request your profile and copies an AI package only when you press a Copy button. It does not send that package to an AI provider.

**Attribution line:** Farming source lookups use public drop data from [WFCD](https://github.com/WFCD/warframe-drop-data), parsed from Digital Extremes' official drop tables. Tenno Link is unofficial and is not affiliated with Digital Extremes.

## Official references

- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/)
- [Privacy practices fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [User data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Manifest V3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
