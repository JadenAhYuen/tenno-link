# Tenno Link

**Tenno Link** is an unofficial, local-first Warframe profile and AI bridge.

It reads the Warframe `gid` cookie locally, requests the user's public profile-view JSON directly from Digital Extremes, combines it with public world-state data, and lets the user inspect or copy a curated profile package for any AI assistant.

## v1.1 preview

- Overview: MR, missions, time played, arsenal counts, career stats
- Progression: mission/challenge/affiliation/operator/XP record counts
- Arsenal: Warframe/weapon counts and most-used weapon statistics
- Resources: live invasion reward opportunities (no fabricated account resource counts)
- Live: fissures, Sortie, Nightwave, Baro, Arbitration, Archon Hunt, Steel Path
- AI Bridge: prompt templates, profile/live toggles, Recommended/Compact/Raw export
- Cache-aware profile syncing
- Original Tenno Link branding and icon set

## Local development

1. Clone or download this repository to a permanent folder, e.g. `C:\TennoLink`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click **Load unpacked** and select this folder.
5. For future changes, pull/update files and click **Reload**. No reinstall is needed.

## Privacy

Tenno Link does not upload Warframe cookies or login credentials to a Tenno Link server. Profile data is cached in Chrome extension storage. Clipboard export only occurs after the user clicks a Copy button.

## Disclaimer

Unofficial, non-commercial fan project. Not affiliated with or endorsed by Digital Extremes. Warframe and related trademarks are property of Digital Extremes Ltd.
