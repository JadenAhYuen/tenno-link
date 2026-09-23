importScripts("catalog.js", "inventory.js", "farming.js");

const PROFILE_ENDPOINT = "https://api.warframe.com/cdn/getProfileViewingData.php";
const WORLDSTATE_ENDPOINT = "https://api.warframestat.us/pc?language=en";
const ITEMS_ENDPOINT = "https://api.warframestat.us/items?only=uniqueName,name,category,productCategory,type,sentinel,imageName,components,buildPrice,buildTime,buildQuantity,systemName,systemIndex,missionIndex,nodeType,missionType,missionName,minEnemyLevel,maxEnemyLevel,masteryReq,faction,factionIndex,tileset,questReqs,description,totalDamage,damage,criticalChance,criticalMultiplier,procChance,fireRate,accuracy,magazineSize,reloadTime,health,shield,armor,sprintSpeed,polarities";
const CATALOG_VERSION = 5;
const DROP_DATA_BASE = "https://raw.githubusercontent.com/WFCD/warframe-drop-data/master/data/";

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

function equipmentName(uniqueName, catalog = {}) {
  const known = {
    "/Lotus/Powersuits/Mag/Mag": "Mag",
    "/Lotus/Weapons/Tenno/LongGuns/TnWispRifle/TnWispRifle": "Fulmin",
    "/Lotus/Weapons/Tenno/Pistol/AutoPistol": "Furis",
    "/Lotus/Weapons/MK1Series/MK1Furax": "MK1-Furax"
  };

  if (!uniqueName) return "—";
  if (catalog[uniqueName]?.name) return catalog[uniqueName].name;
  if (known[uniqueName]) return known[uniqueName];

  const tail = String(uniqueName).split("/").filter(Boolean).pop() || String(uniqueName);

  return tail
    .replace(/^Tn/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim() || "—";
}

function normalizeProfile(profile, catalog = {}) {
  const result = arr(profile?.Results)[0] || {};
  const loadoutInventory = result?.LoadOutInventory || {};
  const stats = profile?.Stats || {};
  const inventory = TennoInventory.build(profile, catalog);

  return {
    identity: {
      displayName: cleanDisplayName(result?.DisplayName),
      masteryRank: result?.PlayerLevel ?? stats?.PlayerLevel ?? null
    },

    summary: {
      missionsCompleted: stats?.MissionsCompleted ?? null,
      missionsQuit: stats?.MissionsQuit ?? null,
      missionsFailed: stats?.MissionsFailed ?? null,
      missionsInterrupted: stats?.MissionsInterrupted ?? null,
      ciphersFailed: stats?.CiphersFailed ?? null,
      cipherTime: stats?.CipherTime ?? null,
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
        warframe: equipmentName(arr(loadoutInventory?.Suits)[0]?.ItemType, catalog),
        primary: equipmentName(arr(loadoutInventory?.LongGuns)[0]?.ItemType, catalog),
        secondary: equipmentName(arr(loadoutInventory?.Pistols)[0]?.ItemType, catalog),
        melee: equipmentName(arr(loadoutInventory?.Melee)[0]?.ItemType, catalog)
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

function sanitizeProfile(profile, mode = "recommended", catalog = {}) {
  if (mode === "raw") return profile;

  const normalized = normalizeProfile(profile, catalog);

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

function rebuildProfileState(profileState, catalog = {}) {
  if (!profileState?.raw) return profileState;

  const normalized = normalizeProfile(profileState.raw, catalog);

  return {
    ...profileState,
    normalized,
    recommended: sanitizeProfile(profileState.raw, "recommended", catalog),
    compact: sanitizeProfile(profileState.raw, "compact", catalog)
  };
}

async function getStore() {
  const { tennoLinkState } = await chrome.storage.local.get("tennoLinkState");
  return tennoLinkState || {};
}

// Serialize read/merge/write so parallel profile, world and catalog syncs cannot
// overwrite each other's newly fetched data.
let storeWrite = Promise.resolve();
function setStore(patch) {
  const write = storeWrite.then(async () => {
    const current = await getStore();
    const next = { ...current, ...patch };
    await chrome.storage.local.set({ tennoLinkState: next });
    return next;
  });
  storeWrite = write.catch(() => {});
  return write;
}

async function syncProfile(force = false) {
  const gid = await getGid();
  const state = await getStore();
  const now = Date.now();

  if (!force && state.profile?.nextAllowedSyncAt > now && state.profile?.raw) {
    const rebuilt = rebuildProfileState(state.profile, state.items?.index);
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

  const normalized = normalizeProfile(raw, state.items?.index);

  const profileState = {
    raw,
    normalized,
    recommended: sanitizeProfile(raw, "recommended", state.items?.index),
    compact: sanitizeProfile(raw, "compact", state.items?.index),
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

  if (!force && state.items?.nextAllowedSyncAt > now && state.items?.schemaVersion === CATALOG_VERSION && Object.keys(state.items?.index || {}).length) {
    return { cached: true, items: state.items };
  }

  const response = await fetch(ITEMS_ENDPOINT, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    credentials: "omit",
    signal: AbortSignal.timeout(45000)
  });

  if (!response.ok) {
    throw new Error(`Warframe item API returned HTTP ${response.status}.`);
  }

  const raw = await response.json();
  const craftables = TennoInventory.compactCatalog(raw);
  const index = TennoCatalog.build(raw);
  if (!Object.keys(index).length) throw new Error("Item catalog returned no usable items. Saved catalog retained; try again later.");

  const itemState = {
    craftables,
    index,
    schemaVersion: CATALOG_VERSION,
    itemCount: Object.keys(index).length,
    lastSyncAt: now,
    nextAllowedSyncAt: now + ITEMS_REFRESH_MS,
    source: ITEMS_ENDPOINT
  };

  await setStore({ items: itemState });

  return { cached: false, items: itemState };
}

function deriveProfileData(state) {
  const profile = rebuildProfileState(state.profile, state.items?.index);
  const inventory = profile?.normalized?.inventory;
  const craftables = state.items?.schemaVersion === CATALOG_VERSION ? state.items.craftables || [] : [];
  return {profile,crafting:{
    materialsReady:TennoInventory.readiness(inventory?.items || [], craftables, 20),
    status:inventory?.availability?.materials !== "reported" ? "materials-unavailable" :
      !craftables.length ? "catalog-unavailable" : "checked",
    generatedAt:Date.now()
  }};
}

async function recomputeCraftingReadiness() {
  const state = await getStore();
  const patch = deriveProfileData(state);
  if (!patch.profile) delete patch.profile;
  await setStore(patch);
  return patch.crafting.materialsReady;
}

async function findGoalSources(name) {
  const goalName = String(name || "").trim().slice(0,120);
  if (goalName.length < 2) throw new Error("Enter at least two characters for a blueprint, part, or mod.");
  const files = {missions:"missionRewards.json",blueprints:"blueprintLocations.json",mods:"modLocations.json",relics:"relics.json"};
  const results = await Promise.allSettled(Object.entries(files).map(async ([key,file]) => {
    const response = await fetch(DROP_DATA_BASE + file, {cache:"no-store",credentials:"omit",signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    return [key,await response.json()];
  }));
  const datasets = Object.fromEntries(results.filter(row => row.status === "fulfilled").map(row => row.value));
  if (!Object.keys(datasets).length) throw new Error("WFCD drop data is unavailable. Try again later.");
  const goal = {
    name:goalName,
    sources:TennoFarming.find(goalName,datasets),
    checkedAt:Date.now(),
    partial:Object.keys(datasets).length !== Object.keys(files).length
  };
  await setStore({goal});
  return goal;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "GET_STATE") {
        const state = await getStore();

        if (state.profile?.raw) {
          const patch = deriveProfileData(state);
          Object.assign(state, patch);
        }

        sendResponse({ ok: true, state });
        return;
      }

      if (message?.type === "CHECK_ACCOUNT") {
        const gid = await getGid();
        sendResponse({ ok: true, gidPreview: gid.slice(0, 6) + "…" });
        return;
      }

      if (message?.type === "FIND_GOAL_SOURCES") {
        sendResponse({ok:true,goal:await findGoalSources(message.name)});
        return;
      }

      if (message?.type === "CLEAR_GOAL") {
        await setStore({goal:null});
        sendResponse({ok:true});
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
