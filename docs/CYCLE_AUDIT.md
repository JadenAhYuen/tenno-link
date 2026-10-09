# Cycle notification audit — 4 October 2026

Scope: the cycle dashboard, Settings, bundled audio, API detection, background monitoring and official website/Wiki launcher introduced in this work. This is not an audit of every game mechanic or profile feature in the repository.

## Current tracked cycles

| Entry | API field | Verified phases | Provider phase lengths |
| --- | --- | --- | --- |
| Earth — Cetus / Plains of Eidolon | `cetusCycle` | Day / Night | 100 / 50 minutes |
| Orb Vallis on Venus | `vallisCycle` | Warm / Cold | 6m 40s / 20m |
| Cambion Drift on Deimos | `cambionCycle` | Fass / Vome | 100 / 50 minutes |
| Duviri | `duviriCycle` | Sorrow, Fear, Joy, Anger, Envy | 2 hours per Spiral |
| Zariman | `zarimanCycle` | Corpus / Grineer | 2h 30m per faction |

The app consumes API timestamps, rather than calculating those schedules locally. Phase lengths are used only as generous validation bounds. Cetus and Cambion share boundaries in the provider, so two alerts at the same time can be valid when both are selected. Duviri is a realm and Zariman a ship, so neither is assigned an invented planet.

## Findings and fixes

- Update 38.5 synchronized Earth forest missions with Cetus. The provider still publishes the obsolete four-hour `earthCycle`. Removed that field from the dashboard and monitor, merged legacy Earth selections into Cetus, and removed the two unused Earth voice files. No legacy Earth timer is used as a fallback when Cetus is unavailable.
- Dashboard and monitor now use the same cycle definitions and validation. Unknown phases, expired/future/implausible timestamps are not announced. Unavailable phases are labelled in Live.
- Early phase corrections no longer overwrite the previous baseline before its boundary. Out-of-order and same-boundary phase corrections cannot regress it. Duplicate checks are serialized; first observations and transitions older than five minutes are silent.
- Both audio toggles off now makes the native notification silent too. Speech and chime remain independent controls; the 13 bundled phase clips need no TTS service or TTS permission. The two-second chime finishes before speech, and the speech file loads first to avoid a bare chime after a load failure.
- Monitoring uses a one-minute Chrome alarm with the panel closed. Missing alarms are restored without repeatedly postponing existing alarms. Website/Wiki launchers also restore monitoring without loading the panel or account profile.
- Manifest content-script and frame-resource matches cover the official website and `wiki.warframe.com`. Account data stays inside the extension frame.
- Corrected installation permissions and tutorial refresh behaviour, and an unrelated stale tutorial sentence that said AI Bridge opened first.

## Evidence

- [Official Update 38.5 notes](https://www.warframe.com/en/patch-notes/pc/38-5-0): Grineer Forest day/night synchronization.
- [Cetus model](https://github.com/WFCD/warframe-worldstate-parser/blob/master/lib/models/CetusCycle.ts), [Vallis model](https://github.com/WFCD/warframe-worldstate-parser/blob/master/lib/models/VallisCycle.ts), [Cambion model](https://github.com/WFCD/warframe-worldstate-parser/blob/master/lib/models/CambionCycle.ts), [Duviri model](https://github.com/WFCD/warframe-worldstate-parser/blob/master/lib/models/DuviriCycle.ts), [Zariman model](https://github.com/WFCD/warframe-worldstate-parser/blob/master/lib/models/ZarimanCycle.ts): current provider fields, states and calculations.
- [API reference](https://docs.warframestat.us/) and `tests/fixtures/cycles-api.json`: public response captured during this audit, including the obsolete Earth field for regression coverage.
- [Chrome alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms), [offscreen](https://developer.chrome.com/docs/extensions/reference/api/offscreen), [notifications](https://developer.chrome.com/docs/extensions/reference/api/notifications): background checks, one shared hidden document and silent notifications.

## Validation and limits

Regression tests cover the captured API response, all tracked phases/audio file mappings, legacy preference migration, boundary checks, stale responses, duplicate requests, settings saves, missing alarms, closed-panel delivery, Wiki matches, mute behaviour, voice preload failure and chime sequencing. Full repository unit tests are run after changes.

Chrome must remain running. Sleep, API latency and OS notification settings can delay or hide alerts. A successful notification-create call is not proof that the OS displayed it. Tests simulate extension APIs; audible desktop playback and injection on the actual Wiki page still need a smoke test in the installed extension. The Wiki pages could not be retrieved by the research browser during this audit; provider source and official patch notes were used instead.
