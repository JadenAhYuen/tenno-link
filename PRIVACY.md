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


The extension places data on your clipboard only after you press one of the Copy buttons. It uses a temporary, hidden extension document for this operation because the floating panel is subject to the Warframe page's clipboard restrictions. The document closes after the copy attempt; it does not send the copied text to a server.

You decide which AI service, application, or person receives that clipboard content.

## Item pictures and Star Chart

Public item definitions come from api.warframestat.us. Item pictures load directly from cdn.warframestat.us, without a referrer or profile payload. Like other remote images, the CDN receives the requesting IP address and the requested image name. Profile interpretation and mission matching happen locally.
