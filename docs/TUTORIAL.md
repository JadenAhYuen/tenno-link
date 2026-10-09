# 🎓 Tenno Link Tutorial

## 🔗 1. Link your profile

Sign in to the official Warframe website in the same Chrome profile where Tenno Link is installed.

Opening Tenno Link loads your saved profile and refreshes public Live data. Player profiles sync only when you press **↻**, with a shared minimum 15-minute interval. HTTP 403 or 429 pauses requests for at least one hour, or longer if the server requests it. Opening panels and background alarms never fetch player profiles.

On `warframe.com` or `wiki.warframe.com`, click the floating **Tenno Link** button to open the complete interface over the page. Drag the narrow top handle to reposition it, use any of the six sections, and close it to return to the button. The active section scrolls when its contents extend beyond the window.

## 🏠 2. Review your dashboard

- **Overview** surfaces high-value account statistics such as Mastery Rank, missions completed, play time, and arsenal counts.
- **Standing** displays mission, challenge, affiliation, Operator-loadout and XP records.
- **Equipment** summarizes Warframe and weapon records plus usage statistics.

## 📡 3. Live data

The **Live** section uses public world-state data for time-sensitive activities such as fissures and other rotating systems.

Fissure and event countdowns tick locally every second while Tenno Link is visible. The interface refreshes public event data after its one-minute cache period; profile sync is manual, with a minimum 15-minute interval and a longer server cache interval honored. Closing the floating interface stops its profile and dashboard refreshes. If cycle notifications are enabled for at least one world, background public-world-state checks continue once per minute while Chrome runs.

Overview also shows a short PC activity summary. In Live, enter the exact name of a blueprint, part or mod and press **Find sources** to pin a farming goal. The result lists public WFCD mission, enemy and intact relic reward sources. Enemy table chances are conditional on an item or mod drop. A recorded mission completion is historical evidence, not proof that a route is currently unlocked.

## 🤖 4. Export for your AI

Tenno Link opens on **Overview**. Open **AI Bridge** to plan a request. Choose a prompt template, enter a specific target such as materials to farm and desired quantities, and add any play preferences. Preview the finished prompt before copying it. The copied instructions ask your AI to check current patch notes and source dates; if it cannot browse, treat its answer as unverified.

You can copy:

- 📋 the prompt only
- 📦 the selected profile package
- ✨ both together

The copied package can include sanitized player data and public live world-state data without copying your Warframe session cookies.

## 🔐 5. Privacy check

Tenno Link is local-first. Your login password is never part of the exported profile package, and clipboard actions only happen when you trigger them.

## Cycle notification settings

Open the cogwheel beside Refresh. Enable notifications and choose Earth — Cetus / Plains of Eidolon, Orb Vallis on Venus, Cambion Drift on Deimos, Duviri Spirals or Zariman faction changes. Earth forest missions follow the Cetus timer; there is no separate Earth alert.

Enable Cephalon announcements and Transmission chime for a two-second signal followed by the world, planet and new phase. Each can be toggled independently. Audio previews work while alerts are off. Recent cycle alerts lists the last 10 detected changes and playback results. First observations are silent, and changes older than five minutes after sleep are skipped.

Under **Useful Live activity timers**, enable the individual alerts you want: Baro arrival, Baro departing in about 30 minutes, daily Sortie refresh, weekly Archon Hunt refresh, daily Steel Path incursion refresh, and Nightwave weekly challenge refresh. All activity toggles default to off. They use the same background polling and audio controls as world cycles. Nightwave weekly alerts track weekly Acts, not the season expiry. The event preview plays a sample announcement without enabling the alert.
