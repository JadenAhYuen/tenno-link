# Profile request audit

Investigated 2026-10-04 after an in-game Too many requests report while the Tenno Link panel was open.

## Findings in the previous implementation

- Panel startup called SYNC_ACTIVE, including the Warframe profile endpoint.
- A 15-second UI poll checked freshness, producing a profile request normally once per five minutes while visible (not once per 15 seconds).
- force=true bypassed nextAllowedSyncAt, including cooldowns after HTTP 403/429.
- syncProfile lacked in-flight deduplication, allowing simultaneous panels to race the same cache check.
- Profile fetch had no timeout. Network errors and invalid JSON did not reserve a cooldown, allowing later automatic retries.
- The cycle alarm called only the separate WFCD world-state endpoint. Closed launchers did not load the profile dashboard.
- No game-login or password endpoint is called by the extension.

## Changes

Profile sync is manual. All automatic and startup paths skip it, including direct non-forced background calls. Manual calls share one promise, reserve a persistent 15-minute minimum interval before sending, use a 20-second timeout and preserve the saved snapshot after failure. HTTP 403/429 reserves at least one hour; a longer numeric or HTTP-date Retry-After is honored. Force cannot bypass these intervals. A recent local history stores only timestamps and response statuses.

These intervals are local safeguards, not a published Warframe request quota. No real profile request was made during this investigation. Existing server-side blocks cannot be cleared by the extension, and the exact cause of the user's game-login response cannot be proven from repository code.

[Warframe Support](https://support.warframe.com/hc/en-us/articles/38627334732429-Error-Login-failed-check-your-info) documents IP flagging as a possible cause of game login failures, including shared ISP addresses. It does not establish that this extension caused the reported error or give a cooldown duration for it.

[HTTP Retry-After documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After) specifies seconds or an HTTP date. Regression tests use mocked fetch and fake time, covering automatic requests, concurrent panels, worker restart, 403/429, longer server pauses, network failure, invalid payload and saved-data preservation.
