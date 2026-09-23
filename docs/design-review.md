# Player dashboard design review

## Summary

Tenno Link is a Chromium extension for players ranging from early progression to veteran accounts. Its job is to make a profile snapshot understandable without requiring an AI export. The revised design uses Apple's readability, hierarchy and accessibility principles, translated to web controls rather than native macOS conventions. Rating: **Good**, with live-extension validation still outstanding.

## Findings addressed

- **High — unreachable information:** Equipment, standing and live renderers are reachable; export is secondary. The inventory page was removed because the profile-view snapshot does not reliably provide balances. `layout.md › Best practices`: “Make essential information easy to find by giving it sufficient space.”
- **High — misleading state:** The former home decoration always said LINKED / PROFILE ONLINE. The replacement shows a saved-snapshot timestamp or sign-in instructions. Sync errors remain visible, including partial failures. `writing.md › Best practices`: “Provide clear next steps on any blank screens.”
- **High — ambiguous statistics:** Loadout sizes were presented like ownership totals. Career metrics now explain denominators; missing counters remain unknown. Equipment history is not described as owned inventory or mastery completion. This is a product/data judgment grounded in all three supplied samples.
- **High — fixed width:** The old 760px minimum prevented narrow layouts. The revised 760px popup shrinks to its available width and stacks content below 520px. A browser check caught and corrected scrollbar-induced overflow at 320px. `accessibility.md › Vision`: “Support larger text sizes.”
- **Medium — visual competition:** Removed orbit animation, nebulae and the redundant linked-state ornament. Native controls, opaque surfaces and a system font carry navigation. The retained Tenno logo and teal profile edge provide restrained identity. `typography.md › Conveying hierarchy`: “Minimize the number of typefaces you use, even in a highly customized interface.”
- **Medium — large lists:** Equipment has search, numeric sorting, expandable details and incremental loading in groups of 50. Records without equipped time require an explicit checkbox; some remaining records can still be NPC or unclassified sources. `lists-and-tables.md › Content`: “Keep item text succinct so row content is comfortable to read.”

Reference filenames above are in the apple-design skill's `references/hig/` directory. Also consulted color, designing-for-macos and charting-data. Text lists were chosen over charts because overlapping loadout times would make a play-time pie chart misleading (product judgment).

## Design tokens and structure

| Role | Light | Dark | Contrast on panel, light / dark |
|---|---|---|---|
| Background | #f3f5f6 | #10191e | — |
| Panel | #ffffff | #19252b | — |
| Content | #18252b | #eff5f6 | 15.69 / 14.22 |
| Secondary content | #53646b | #adc0c6 | 6.17 / 8.30 |
| Accent | #006b68 | #7cdacf | 6.36 / 9.54 |
| Border | #d4dee1 | #40545d | Decorative; focus uses accent |

Contrast figures are calculated WCAG luminance ratios for the actual opaque hex values. Controls have a 44px minimum height, explicit keyboard focus, native semantics, and an active-page indication. No blur or motion is necessary; reduced-motion and increased-contrast preferences have CSS handling. Type uses one system stack: 15px body, 13px explanations, 18px section headings, 23–30px identity and metrics. Small metadata is 11–12px.

```text
Regular                         Compact
Logo / title / sync              Logo / title / sync
Profile                 Rank    Profile / rank
Six section buttons             Section buttons in two rows
Metric          Metric          Metric
Metric          Metric          Metric
Equipment invitation            Equipment invitation
Loadout / career details        Loadout / career details
```

The design intentionally behaves like a quiet player utility. The signature is the profile identity strip, not decorative glass. Remove-the-accessory review: the connection ornament and animated background added no decision value and were removed.

## Data interpretation

- Completions per hour = missions completed / (profile seconds / 3600); not a player skill rating.
- Cipher success and average cipher time are omitted from the UI because the required counters are not reliably present in the profile snapshot.
- Affiliation values are reported standing and title/rank, including negative and historical event records. No spendable balance, standing cap or rank-up cost is inferred.
- Equipment names resolve from the existing synced WFCD item catalog's `uniqueName` / `name` mapping. [WFCD data](https://github.com/WFCD/warframe-items) provides that mapping; unmatched entries are visibly identified as source identifiers.
- Loadout time overlaps across slots. Affinity is not converted to mastery rank, current ownership or completion percentages.
- Raw sample profiles are not checked into the repository. The preview harness accepts an optional local path and masks the display name.

## Verification

- Existing inventory tests pass.
- Insight tests pass for zero, missing, invalid and ordinary counters, sorting and name lookup.
- All three supplied profiles normalize successfully: MR 34, MR 4 and MR 3; 1,738, 38 and 17 raw usage records respectively.
- Popup tests cover render paths, escaped external strings, and export filtering without mutating the saved profile.
- Storage regression test confirms concurrent sync patches preserve profile, world and item data.
- Browser preview checked overview, equipment search/sort/no-match/load-more, standing, live empty state, export controls, no-profile state and partial sync errors. No console errors observed.
- Dark appearance inspected visually. At 320px, document scroll width equals available client width after the overflow fix. Light palette contrast calculated; light appearance not visually inspected.
- JavaScript syntax checks and `git diff --check` pass.

Limits: browser verification uses a local extension-API mock. Real authenticated profile sync, item-catalog download, live world-state rendering, browser-extension popup sizing, screen-reader interaction and 200% text zoom still need checks in the installed extension. Nothing has been published.

## Future opportunities

Snapshot history could enable recent progress and personal goals, while a versioned item-mastery model could support reliable completion tracking. Both need additional data modeling; lifetime affinity and one snapshot alone are insufficient. Prioritize these over generic AI-generated advice or guessed build recommendations.

## Images and mission progression follow-up

Item thumbnails retain adjacent names, fixed dimensions, lazy loading and a neutral fallback. Star Chart uses native expandable destination rows and labelled progress indicators. Planet illustrations use distinct, original motifs inspired by each location's appearance; they are not screenshots or official in-game icons. Mission records show mission type, objective explanation and enemy level range when public metadata provides them. Faction, location and requirements are omitted from mission cards. Equipment records show the public description and applicable base stats. Mission completion evidence remains separate from current access, ownership, and mastery claims.

The browser preview uses mocked extension messaging. Authenticated sync, external catalog refresh and presentation of the full in-game Star Chart remain unverified. The extension does not display inventory balances or offer an inventory-file import.


## September progression updates

Removed the Catalog browsing tab while retaining public item data in the background for gear pictures, names, recipes and destination records. Added original planet illustrations, mission objectives and level/location details, equipment descriptions and applicable base stats, plus an exploratory mission list. Inventory-file import was removed at the user's request; no credential form was added.

## September 23 UI simplification

The popup keeps the project logo and removes decorative banner elements. The Inventory navigation and page, cipher success card, average cipher time, and mission faction, location and requirements fields were removed. This avoids empty or misleading fields when the profile-view response and public metadata do not supply a reliable value. The private profile endpoint has no verified personalized banner field in this integration, so the extension uses its own logo.

## WFCD activity and farming follow-up

Overview now shows a short summary from the cached PC world state. Live includes a locally saved farming goal whose name is matched against public WFCD mission, enemy, and intact relic drop tables. Exact name matching avoids suggesting similarly named rewards. Mission and relic sources appear before conditional enemy table entries; the UI explains that a listed source does not prove ownership or access. WFCD's profile-parser field definitions were reviewed against the existing profile normalizer. The extension continues to use its local normalizer and respects the profile response's Cache-Control refresh interval.

Local tests cover matching, rotations, relic states, goal persistence, and popup rendering. Current WFCD files were checked for a mission reward, blueprint, and relic part. A browser preview was inspected at desktop and 375px widths without horizontal overflow. The unpacked extension was later loaded in Chrome and authenticated profile sync worked; the farming-goal action returned "Unknown message type," suggesting a stale background worker. Reloading and retesting that action remains open.

## September 23 visual refresh

`visual.css` layers a dark translucent material over the existing readable layout. The palette uses cool cyan for navigation and focus, restrained gold for account and export accents, and a dark spatial backdrop built from CSS gradients. The project logo remains the only header image; the orbit lines and glints are original CSS decoration. Blur is confined to major surfaces, with solid-enough dark fills to retain legibility.

Motion is purposeful and brief: the header and identity enter once, switching sections fades the new content into place, controls respond to press and hover, and the logo ring and connection dot breathe slowly. `prefers-reduced-motion` removes animation and transitions; increased contrast removes translucency and blur. The 760px and 320px local previews showed no horizontal overflow. Overview, Live, and Export were visually inspected. Eight local test files pass, and `git diff --check` passes. Live extension visual verification still requires a reload in Chrome.
