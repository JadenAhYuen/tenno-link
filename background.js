importScripts("inventory.js");

const PROFILE_ENDPOINT = "https://api.warframe.com/cdn/getProfileViewingData.php";
const WORLDSTATE_ENDPOINT = "https://api.warframestat.us/pc?language=en";
const ITEMS_ENDPOINT = "https://api.warframestat.us/items";

const PROFILE_MIN_REFRESH_MS = 5 * 60 * 1000;
const WORLDSTATE_MIN_REFRESH_MS = 60 * 1000;
const ITEMS_REFRESH_MS = 24 * 60 * 60 * 1000;

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

function cleanDisplayName(value) {
  return String(value ?? "Tenno")
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(/[\u0000-\u001F]/g, "")
    .trim() || "Tenno";
}

function equipmentName(uniqueName) {
  const known = {
    "/Lotus/Powersuits/Mag/Mag": "Mag",
    "/Lotus/Weapons/Tenno/LongGuns/TnWispRifle/TnWispRifle": "Fulmin",
    "/Lotus/Weapons/Tenno/Pistol/AutoPistol": "Furis",
    "/Lotus/Weapons/MK1Series/MK1Furax": "MK1-Furax"
  };

  if (!uniqueName) return "—";
  if (known[uniqueName]) return known[uniqueName];

  const tail = String(uniqueName).split("/").filter(Boolean).pop() || String(uniqueName);

  return tail
    .replace(/^Tn/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim() || "—";
}

function normalizeProfile(profile) {
  const result = arr(profile?.Results)[0] || {};
  const loadoutInventory = result?.LoadOutInventory || {};
  const stats = profile?.Stats || {};
  const inventory = TennoInventory.build(profile);

  return {
    identity: {
      displayName: cleanDisplayName(result?.DisplayName),
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
      warframes: arr(loadoutInventory?.Suits),
      primary: arr(loadoutInventory?.LongGuns),
      secondary: arr(loadoutInventory?.Pistols),
      melee: arr(loadoutInventory?.Melee),
      xpInfo: arr(loadoutInventory?.XPInfo),
      weaponStats: arr(stats?.Weapons),
      current: {
        warframe: equipmentName(arr(loadoutInventory?.Suits)[0]?.ItemType),
        primary: equipmentName(arr(loadoutInventory?.LongGuns)[0]?.ItemType),
        secondary: equipmentName(arr(loadoutInventory?.Pistols)[0]?.ItemType),
        melee: equipmentName(arr(loadoutInventory?.Melee)[0]?.ItemType)
      }
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
    },

    inventory
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
      },
      inventory: {
        items: normalized.inventory.items.map(item => ({
          name: item.name,
          uniqueName: item.uniqueName,
          quantity: item.quantity,
          category: item.category
        })),
        summary: normalized.inventory.summary
      }
    };
  }

  return normalized;
}

function rebuildProfileState(profileState) {
  if (!profileState?.raw) return profileState;

  const normalized = normalizeProfile(profileState.raw);

  return {
    ...profileState,
    normalized,
    recommended: sanitizeProfile(profileState.raw, "recommended"),
    compact: sanitizeProfile(profileState.raw, "compact")
  };
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
    const rebuilt = rebuildProfileState(state.profile);
    await setStore({ profile: rebuilt });
    return { cached: true, profile: rebuilt };
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

async function syncItemCatalog(force = false) {
  const state = await getStore();
  const now = Date.now();

  if (!force && state.items?.nextAllowedSyncAt > now && state.items?.craftables?.length) {
    return { cached: true, items: state.items };
  }

  const response = await fetch(ITEMS_ENDPOINT, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Warframe item API returned HTTP ${response.status}.`);
  }

  const raw = await response.json();
  const craftables = TennoInventory.compactCatalog(raw);

  const itemState = {
    craftables,
    lastSyncAt: now,
    nextAllowedSyncAt: now + ITEMS_REFRESH_MS,
    source: ITEMS_ENDPOINT
  };

  await setStore({ items: itemState });

  return { cached: false, items: itemState };
}

async function recomputeCraftingReadiness() {
  const state = await getStore();
  const inventoryItems = state.profile?.normalized?.inventory?.items || [];
  const craftables = state.items?.craftables || [];

  const materialsReady = TennoInventory.readiness(
    inventoryItems,
    craftables,
    20
  );

  await setStore({
    crafting: {
      materialsReady,
      generatedAt: Date.now()
    }
  });

  return materialsReady;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "GET_STATE") {
        const state = await getStore();

        if (state.profile?.raw) {
          state.profile = rebuildProfileState(state.profile);
          await setStore({ profile: state.profile });
        }

        sendResponse({ ok: true, state });
        return;
      }

      if (message?.type === "CHECK_ACCOUNT") {
        const gid = await getGid();
        sendResponse({ ok: true, gidPreview: gid.slice(0, 6) + "…" });
        return;
      }

      if (message?.type === "SYNC_PROFILE") {
        const result = await syncProfile(Boolean(message.force));
        await recomputeCraftingReadiness();
        sendResponse({ ok: true, result });
        return;
      }

      if (message?.type === "SYNC_WORLD") {
        sendResponse({
          ok: true,
          result: await syncWorldState(Boolean(message.force))
        });
        return;
      }

      if (message?.type === "SYNC_ITEMS") {
        const result = await syncItemCatalog(Boolean(message.force));
        await recomputeCraftingReadiness();
        sendResponse({ ok: true, result });
        return;
      }

      if (message?.type === "SYNC_ALL") {
        const [profile, world, items] = await Promise.allSettled([
          syncProfile(Boolean(message.force)),
          syncWorldState(Boolean(message.force)),
          syncItemCatalog(Boolean(message.force))
        ]);

        await recomputeCraftingReadiness();

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
                : { error: world.reason?.message },
            items:
              items.status === "fulfilled"
                ? items.value
                : { error: items.reason?.message }
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
