# Live facts verification

Checked 2026-10-04. Countdown deadlines still come from the API; normal durations are explanatory facts, not replacement timers.

- Cetus day 100 minutes, night 50 minutes: [WFCD Cetus parser](https://github.com/WFCD/warframe-worldstate-parser/blob/master/lib/models/CetusCycle.ts).
- Cambion Fass 100 minutes, Vome 50 minutes; same boundaries as Cetus: [WFCD Cambion parser](https://github.com/WFCD/warframe-worldstate-parser/blob/master/lib/models/CambionCycle.ts). Fishing and Eidolon context: Warframe Wiki world guides linked in Live.
- Orb Vallis warm 6 minutes 40 seconds, cold 20 minutes: [WFCD Vallis parser](https://github.com/WFCD/warframe-worldstate-parser/blob/master/lib/models/VallisCycle.ts).
- Duviri Spirals last two hours: [official Devstream 168 overview](https://www.warframe.com/en/news/devstream-168-overview). Spiral order: [WFCD Duviri parser](https://github.com/WFCD/warframe-worldstate-parser/blob/master/lib/models/DuviriCycle.ts).
- Zariman faction phases last two hours 30 minutes: [WFCD Zariman parser](https://github.com/WFCD/warframe-worldstate-parser/blob/master/lib/models/ZarimanCycle.ts).
- Weekly Archon Hunt, three missions, once-per-Hunt rewards and Veilbreaker requirement: [official Archon guide](https://www.warframe.com/en/news/intro-to-archon-hunts).
- Baro normally stays 48 hours and returns every two weeks: [official Void Trader introduction](https://www.warframe.com/en/news/rencontrez-le-marchand-du-neant-baro-kiteer). Special visits can vary; API dates remain authoritative for countdowns.
- Five daily Incursions, five bonus Steel Essence each: [official Dante Unbound notes](https://www.warframe.com/en/patch-notes/pc/35-5-0).
- Arbitrations rotate hourly: [official Arbitration introduction](https://www.warframe.com/en/news/-401).
- Nightwave Act types and content access: [official Nightwave guide](https://www.warframe.com/en/nightwave).
- Remaining activity guides are linked from each Live category. Events, alerts and invasions have no invented fixed duration. News dates are publication dates. Darvo stock may expire before the listed deadline.

The farming regression fixture is a reduced public sample from [WFCD all.json](https://raw.githubusercontent.com/WFCD/warframe-drop-data/main/data/all.json), retaining the Earth reward entries containing Koumei Blueprint and a representative keyed syndicate object. It has no player data.
