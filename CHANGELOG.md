# Changelog

## Unreleased

- Add six opt-in Live activity voice alerts: Baro arrival/departure warning, Sortie, Archon Hunt, Steel Path incursions and Nightwave weekly challenges.

- Add Settings with background cycle notifications, optional two-second chime and 13 offline cephalon announcements.
- Support the floating companion on the Warframe Wiki.
- Consolidate legacy Earth alerts into Cetus / Plains of Eidolon after checking Update 38.5; preserve saved selections.
- Validate public cycle phases/timestamps, suppress duplicate and stale alerts, and log recent triggers locally.
- Make disabled audio fully silent and remove unused TTS permission.


## Unreleased

- Add six opt-in Live activity voice alerts: Baro arrival/departure warning, Sortie, Archon Hunt, Steel Path incursions and Nightwave weekly challenges.

- Fix ChatGPT autofill for the newer mobile composer; wait for composer hydration and update Gemini through its page-owned Quill editor.

- Lead Overview with a pinned goal, next missions, live activities, and recent recorded progress.
- Save AI Bridge drafts locally and pass pinned farming goals directly into the planner.
- Preview the complete request, hide account identity by default, and show source freshness.
- Open ChatGPT, Claude, Gemini, or Grok and attempt to fill a new chat input after optional website permission; sending remains manual, with a clipboard fallback.
- Group farming sources by type and filter sources with recorded mission completion.
- Add a synthetic sample mode and retain up to 30 compact progress snapshots per linked account.

## 1.3.0 Preview

- Balanced the header with a three-column profile card for name, sync status, and Mastery Rank.
- Widened the floating workspace and balanced AI Bridge controls across two columns on larger screens, with a stacked form on narrow screens.
- Compressed the floating overlay header and profile strip so more AI Bridge content fits on screen; returning openings use a brief, translucent loader.
- Kept Overview as the opening section and added current-game source checks to every copied AI Bridge prompt.
- Routed copy actions through a temporary extension document so website iframe clipboard restrictions cannot block them; added a manual-copy fallback.
- Limited the full glass loader to startup; refreshes animate the rounded button icon.
- Replaced the rotating refresh glyph with a rounded icon and added a glass loading state for profile, live data, and catalog refreshes.
- Added tailored AI Bridge fields for every prompt, freeform preferences, and prompt preview.
- Added a dedicated GitHub release package folder and versioned ZIP build.
- Refreshed the README around player features and installation.
- Expanded Live world-state details with responsive event sections, distinct icons, expandable tips, and quick section controls.
- Matched Live cycle symbols to day, night, temperature, and Cambion phases; reused Star Chart art for known planets and locations.
- Added layered ambient particles and restrained orbital lighting to the Live view, with reduced-motion support.

## 1.1.0 Preview

- Renamed project to Tenno Link
- Added multi-page dashboard
- Added public world-state integration
- Added Overview, Progression, Arsenal, Resources and Live pages
- Added selective AI export
- Added Tenno Link icon set and branding

- Notification settings now pair landscape hubs with their worlds and show profile mission completion evidence. Unconfirmed access requires an explicit Enable anyway action; missing history is never treated as proof that content is locked. Archon prerequisite reference: https://www.warframe.com/en/patch-notes/pc/32-0-0

- Added a dedicated Farming tab with catalog-wide item suggestions, crafting recipes, ingredient lookups and acquisition links. Expanded source lookup to bounty, special reward, resource and syndicate tables; retained partial-data fallback and pinned goal sharing with AI Bridge.

- Fixed farming lookups crashing on the live feed's keyed syndicate reward object, including Koumei Blueprint. Added regression coverage from public reward data and guarded optional array sections.
- Added full phase lengths, next phases, world farming tips, and timing/reward guidance for all Live categories, with guide links.

- Removed automatic player-profile polling and startup requests. Manual refresh now shares a durable minimum interval, deduplicates concurrent requests, respects Retry-After and pauses for at least one hour after HTTP 403/429. Added local status diagnostics and regression checks without issuing real profile requests.
