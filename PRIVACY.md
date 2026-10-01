# Privacy

Tenno Link is designed to be local-first.

## What it reads

The extension reads the `gid` cookie belonging to `warframe.com`. This identifier is used locally to request profile data from Digital Extremes' Warframe profile endpoint.

## What it does not collect

Tenno Link does not collect or upload:
- Warframe passwords
- session cookies
- Cloudflare cookies
- email cookies
- authentication tokens
- copied AI prompts
- copied profile JSON

## Where profile data goes

Profile data is fetched directly from Digital Extremes and cached locally in Chrome extension storage.

On `warframe.com`, the floating button opens the extension's own interface in a separate frame. Profile data is rendered in that extension frame, not copied into the website's document. The website sees the launcher and frame container.

Live world-state information is fetched from the public WarframeStat.us API.

The floating launcher by itself does not request profile or world-state data. Refresh checks run only while the Tenno Link interface is open in a visible tab; closing the floating interface unloads its frame. Event countdowns update from cached expiry times without another API request each second.

Farming goal searches download public WFCD drop tables from GitHub. The name you enter is matched locally; it is not placed in the download URL. Tenno Link stores your chosen name and matching sources in Chrome extension storage, not the full drop tables.


The extension places data on your clipboard only after you press a Copy or AI provider button. It uses a temporary, hidden extension document for this operation because the floating panel is subject to the Warframe page's clipboard restrictions. The document closes after the copy attempt; it does not send the copied text to a server.

You decide which AI service, application, or person receives that clipboard content.

## AI Bridge drafts and provider buttons

The selected template, typed fields, preferences, export format, and inclusion choices are saved locally in Chrome extension storage. Clear draft resets them. The complete generated request is not retained as a saved draft.

AI provider buttons copy the selected request and open ChatGPT, Claude, Gemini, or Grok. Automatic filling requests optional scripting permission and access only to the selected provider website. If access is declined, the button uses copy + open. The extension inserts text into the provider's visible input but never presses Send. A provider may process or save text entered into its website before submission; its own privacy policy applies.

The prepared request is held temporarily in browser-session extension storage while the new tab loads and removed before the fill attempt or when the tab closes. Requests older than two minutes are not filled. The request contains only the profile, live state, career stats, and pinned goal sections selected in AI Bridge, plus source timestamps. Hide account identity removes known name and identifier fields from the exported profile without modifying the local profile cache; it is not a guarantee of complete anonymity for every possible raw profile field.

## Local progress history and sample mode

The extension retains up to 30 compact snapshots of recorded mission completions and reported standing to show changes. A SHA-256 fingerprint of the account identifier separates linked accounts. Switching accounts resets this history, the pinned goal, and the saved AI draft. No cookie value is stored in the progress history.

Sample mode uses synthetic account data in memory and pauses refreshes. Sample drafts and goals are not saved. Exported sample requests are explicitly labelled as synthetic.

## Item pictures and Star Chart

Public item definitions come from api.warframestat.us. Item pictures load directly from cdn.warframestat.us, without a referrer or profile payload. Like other remote images, the CDN receives the requesting IP address and the requested image name. Profile interpretation and mission matching happen locally.
