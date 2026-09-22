const PROFILE_ENDPOINT = "https://api.warframe.com/cdn/getProfileViewingData.php";
const WORLDSTATE_ENDPOINT = "https://api.warframestat.us/pc?language=en";
const PROFILE_MIN_REFRESH_MS = 5 * 60 * 1000;
const WORLDSTATE_MIN_REFRESH_MS = 60 * 1000;

async function getGid() {
  for (const url of ["https://www.warframe.com/", "https://warframe.com/"]) {
    try {
      const cookie = await chrome.cookies.get({ url, name: "gid" });
      if (cookie?.value) return cookie.value;
    } catch (_) {}
  }

  const cookies = await chrome.cookies.getAll({
    domain: "warframe.com",
    name: "gid"
  });

  const cookie = cookies.find(c => c?.value);
  if (!cookie) {
    throw new Error("Warframe GID cookie not found. Sign in to warframe.com.");
  }

  return cookie.value;
}

function parseMaxAge(header) {
  const match = header?.match(/max-age=(\d+)/i);
  return match ? Number(match[1]) : null;
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeProfile(profile) {
  const result = arr(profile?.Results)[0] || {};
  const inventory = result?.LoadOutInventory || {};
  const stats = profile?.Stats || {};

  return {
    identity: {
      displayName: result?.DisplayName ?? "Tenno",
      masteryRank: result?.PlayerLevel ?? stats?.PlayerLevel ?? null
    },
    summary: {
      missionsCompleted: stats?.MissionsCompleted ?? null,
      missionsQuit: stats?.MissionsQuit ?? null,
      timePlayedSec: stats?.TimePlayedSec ?? null,
      deaths: stats?.Deaths ?? null,
      revives: stats?.ReviveCount ?? null,
      meleeKills: stats?.MeleeKills ?? null,
      ciphersSolved: stats?.CiphersSolved ?? null
    },
    arsenal: {
      warframes: arr(inventory?.Suits),
      primary: arr(inventory?.LongGuns),
      secondary: arr(inventory?.Pistols),
      melee: arr(inventory?.Melee),
      xpInfo: arr(inventory?.XPInfo),
      weaponStats: arr(stats?.Weapons)
    },
    progression: {
      missions: arr(result?.Missions),
      challenges: arr(result?.ChallengeProgress),
      affiliations: arr(result?.Affiliations),
      operatorLoadouts: arr(result?.OperatorLoadOuts),
      dailyFocus: result?.DailyFocus ?? null,
      dailyStanding: Object.fromEntries(
        Object.entries(result).filter(([key]) => key.startsWith("DailyAffiliation"))
      )
    }
  };
}

function sanitizeProfile(profile, mode = "recommended") {
  if (mode === "raw") return profile;

  const normalized = normalizeProfile(profile);

  if (mode === "compact") {
    return {
      identity: normalized.identity,
      summary: normalized.summary,
      arsenal: {
        counts: {
          warframes: normalized.arsenal.warframes.length,
          primary: normalized.arsenal.primary.length,
          secondary: normalized.arsenal.secondary.length,
          melee: normalized.arsenal.melee.length,
          xpEntries: normalized.arsenal.xpInfo.length
        },
        xpInfo: normalized.arsenal.xpInfo,
        weaponStats: normalized.arsenal.weaponStats
      },
      progression: {
        missions: normalized.progression.missions,
        challenges: normalized.progression.challenges,
        affiliations: normalized.progression.affiliations,
        operatorLoadouts: normalized.progression.operatorLoadouts
      }
    };
  }

  return normalized;
}

async function getStore() {
  const { tennoLinkState } = await chrome.storage.local.get("tennoLinkState");
  return tennoLinkState || {};
}

async function setStore(patch) {
  const current = await getStore();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ tennoLinkState: next });
  return next;
}

async function syncProfile(force = false) {
  const gid = await getGid();
  const state = await getStore();
  const now = Date.now();

  if (!force && state.profile?.nextAllowedSyncAt > now && state.profile?.raw) {
    return { cached: true, profile: state.profile };
  }

  const response = await fetch(
    `${PROFILE_ENDPOINT}?playerId=${encodeURIComponent(gid)}`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "omit"
    }
  );

  const body = await response.text();

  if (!response.ok) {
    const retryMs =
      response.status === 429
        ? 15 * 60 * 1000
        : response.status === 403
          ? 30 * 60 * 1000
          : PROFILE_MIN_REFRESH_MS;

    await setStore({
      profile: {
        ...(state.profile || {}),
        lastHttpStatus: response.status,
        nextAllowedSyncAt: now + retryMs
      }
    });

    throw new Error(`Warframe profile API returned HTTP ${response.status}.`);
  }

  let raw;

  try {
    raw = JSON.parse(body);
  } catch {
    throw new Error("Warframe profile endpoint returned invalid JSON.");
  }

  const maxAge = parseMaxAge(response.headers.get("cache-control"));
  const refreshMs = Math.max(
    PROFILE_MIN_REFRESH_MS,
    (maxAge || 0) * 1000
  );

  const normalized = normalizeProfile(raw);

  const profileState = {
    raw,
    normalized,
    recommended: sanitizeProfile(raw, "recommended"),
    compact: sanitizeProfile(raw, "compact"),
    lastHttpStatus: response.status,
    cacheControl: response.headers.get("cache-control"),
    lastSyncAt: now,
    nextAllowedSyncAt: now + refreshMs
  };

  await setStore({ profile: profileState });

  return { cached: false, profile: profileState };
}

async function syncWorldState(force = false) {
  const state = await getStore();
  const now = Date.now();

  if (!force && state.world?.nextAllowedSyncAt > now && state.world?.raw) {
    return { cached: true, world: state.world };
  }

  const response = await fetch(WORLDSTATE_ENDPOINT, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`World-state API returned HTTP ${response.status}.`);
  }

  const raw = await response.json();

  const worldState = {
    raw,
    lastSyncAt: now,
    nextAllowedSyncAt: now + WORLDSTATE_MIN_REFRESH_MS
  };

  await setStore({ world: worldState });

  return { cached: false, world: worldState };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "GET_STATE") {
        sendResponse({ ok: true, state: await getStore() });
        return;
      }

      if (message?.type === "CHECK_ACCOUNT") {
        const gid = await getGid();
        sendResponse({ ok: true, gidPreview: gid.slice(0, 6) + "…" });
        return;
      }

      if (message?.type === "SYNC_PROFILE") {
        sendResponse({
          ok: true,
          result: await syncProfile(Boolean(message.force))
        });
        return;
      }

      if (message?.type === "SYNC_WORLD") {
        sendResponse({
          ok: true,
          result: await syncWorldState(Boolean(message.force))
        });
        return;
      }

      if (message?.type === "SYNC_ALL") {
        const [profile, world] = await Promise.allSettled([
          syncProfile(Boolean(message.force)),
          syncWorldState(Boolean(message.force))
        ]);

        sendResponse({
          ok: true,
          result: {
            profile:
              profile.status === "fulfilled"
                ? profile.value
                : { error: profile.reason?.message },
            world:
              world.status === "fulfilled"
                ? world.value
                : { error: world.reason?.message }
          }
        });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message type." });
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  })();

  return true;
});
