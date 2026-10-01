importScripts("catalog.js", "inventory.js", "farming.js", "ai-handoff.js");

const PROFILE_ENDPOINT = "https://api.warframe.com/cdn/getProfileViewingData.php";
const WORLDSTATE_ENDPOINT = "https://api.warframestat.us/pc?language=en";
const ITEMS_ENDPOINT = "https://api.warframestat.us/items?only=uniqueName,name,category,productCategory,type,sentinel,imageName,components,buildPrice,buildTime,buildQuantity,systemName,systemIndex,missionIndex,nodeType,missionType,missionName,minEnemyLevel,maxEnemyLevel,masteryReq,faction,factionIndex,tileset,questReqs,description,totalDamage,damage,criticalChance,criticalMultiplier,procChance,fireRate,accuracy,magazineSize,reloadTime,health,shield,armor,sprintSpeed,polarities";
const CATALOG_VERSION = 5;
const DROP_DATA_BASE = "https://raw.githubusercontent.com/WFCD/warframe-drop-data/master/data/";

const PROFILE_MIN_REFRESH_MS = 5 * 60 * 1000;
const WORLDSTATE_MIN_REFRESH_MS = 60 * 1000;
const ITEMS_REFRESH_MS = 24 * 60 * 60 * 1000;
const AI_PROVIDERS = {chatgpt:'https://chatgpt.com/',claude:'https://claude.ai/new',gemini:'https://gemini.google.com/app',grok:'https://grok.com/'};
const deliveringTabs = new Set();

async function deliverAIRequest(tabId) {
  if (deliveringTabs.has(tabId)) return;
  deliveringTabs.add(tabId);
  try { await deliverAIRequestOnce(tabId); }
  finally { deliveringTabs.delete(tabId); }
}

async function deliverAIRequestOnce(tabId) {
  const key = `aiHandoff:${tabId}`;
  const pending = (await chrome.storage.session.get(key))[key];
  if (!pending) return;
  // Claim once before injection, so repeated tab updates cannot insert twice.
  await chrome.storage.session.remove(key);
  if (Date.now()-pending.createdAt > 120000) return;
  let result;
  try {
    const results = await chrome.scripting.executeScript({target:{tabId},func:fillAIInput,
      // Gemini's Quill instance is in the page context; Claude keeps its working path.
      world:pending.provider === 'gemini' ? 'MAIN' : 'ISOLATED',
      args:[pending.provider,pending.text,new URL(AI_PROVIDERS[pending.provider]).origin]});
    result = results[0]?.result || {ok:false,error:'Automatic fill did not complete. Paste the copied request.'};
  } catch {
    result = {ok:false,error:'Automatic fill could not start. Check website access for Tenno Link, or paste the copied request.'};
  }
  try {
    await chrome.scripting.executeScript({target:{tabId},func:(message)=>{
      const notice = document.createElement('div');
      notice.setAttribute('role','status');
      notice.textContent = message;
      Object.assign(notice.style,{position:'fixed',bottom:'20px',right:'20px',maxWidth:'380px',padding:'16px',background:'#19252b',color:'#eff5f6',border:'1px solid #7cdacf',borderRadius:'12px',zIndex:'2147483647',font:'14px/1.5 system-ui'});
      const close = document.createElement('button'); close.textContent = 'Dismiss'; close.onclick = () => notice.remove();
      notice.appendChild(document.createElement('br')); notice.appendChild(close); document.body.appendChild(notice);
    },args:[result.ok ? 'Tenno Link filled your request. Review it, then press Send when ready.' : `Tenno Link: ${result.error}`]});
  } catch { /* The tab may have closed or website access may have been removed. */ }
}
chrome.tabs?.onUpdated?.addListener((tabId,change)=>{ if (change.status === 'complete') deliverAIRequest(tabId).catch(()=>{}); });
chrome.tabs?.onRemoved?.addListener(tabId=>{ chrome.storage.session.remove(`aiHandoff:${tabId}`).catch(()=>{}); });

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
  const state = await getStore();
  const now = Date.now();

  if (!force && state.profile?.nextAllowedSyncAt > now) {
    if (state.profile?.raw) return { cached: true, profile: state.profile };
    throw new Error('Profile refresh is waiting for its retry interval.');
  }

  const gid = await getGid();

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

  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(gid));
  const accountKey = Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  const accountChanged = state.progressHistory?.accountKey && state.progressHistory.accountKey !== accountKey;
  const rawResult = raw.Results?.[0] || {};
  await setStore({profile:profileState,progressHistory:recordProgress(state.progressHistory,normalized,accountKey,now,{missions:Object.hasOwn(rawResult,'Missions'),standing:Object.hasOwn(rawResult,'Affiliations')}),
    ...(accountChanged ? {goal:null,bridgeDraft:null} : {})});

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

let creatingClipboardDocument;
let clipboardQueue = Promise.resolve();

async function ensureClipboardDocument() {
  const url = chrome.runtime.getURL('offscreen.html');
  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT'],documentUrls:[url]});
    if (contexts.length) return;
  }
  if (!creatingClipboardDocument) {
    creatingClipboardDocument = chrome.offscreen.createDocument({
      url:'offscreen.html',
      reasons:['CLIPBOARD'],
      justification:'Copy the AI Bridge text selected by the player.'
    }).finally(() => { creatingClipboardDocument = null; });
  }
  await creatingClipboardDocument;
}

function recordProgress(history,profile,accountKey,at,reported = {missions:true,standing:true}) {
  const missions = (profile.progression?.missions || []).filter(row=>Number(row.Completes)>0).map(row=>row.Tag).filter(tag=>typeof tag === 'string');
  const standing = Object.fromEntries((profile.progression?.affiliations || []).filter(row=>typeof row.Tag === 'string' && typeof row.Standing === 'number' && Number.isFinite(row.Standing)).map(row=>[row.Tag,row.Standing]));
  const snapshots = history?.accountKey === accountKey && Array.isArray(history.snapshots) ? history.snapshots.slice(-29) : [];
  const last = snapshots.at(-1);
  const snapshot = {at,missions:[...new Set([...(last?.missions || []),...(reported.missions ? missions : [])])].sort(),standing:{...(last?.standing || {}),...(reported.standing ? standing : {})}};
  if (last && JSON.stringify(last.missions) === JSON.stringify(snapshot.missions) && JSON.stringify(last.standing) === JSON.stringify(snapshot.standing)) return {accountKey,snapshots};
  return {accountKey,snapshots:[...snapshots,snapshot]};
}

function copyTextOffscreen(text) {
  const request = clipboardQueue.catch(() => {}).then(async () => {
    await ensureClipboardDocument();
    try {
      const result = await chrome.runtime.sendMessage({target:'offscreen',type:'COPY_TEXT_OFFSCREEN',text});
      if (!result?.ok) throw new Error(result?.error || 'Clipboard write failed');
      return {ok:true};
    } finally {
      await chrome.offscreen.closeDocument().catch(() => {});
    }
  });
  clipboardQueue = request;
  return request;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target === 'offscreen') return false;
  (async () => {
    try {
      if (message?.type === 'COPY_TEXT') {
        if (typeof message.text !== 'string') throw new Error('Nothing to copy');
        sendResponse(await copyTextOffscreen(message.text));
        return;
      }
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

      if (message?.type === "SAVE_BRIDGE_DRAFT") {
        const draft = message.draft;
        if (draft !== null && (!draft || typeof draft !== 'object' || JSON.stringify(draft).length > 20000)) throw new Error('Invalid AI Bridge draft.');
        await setStore({bridgeDraft:draft});
        sendResponse({ok:true});
        return;
      }

      if (message?.type === "OPEN_AI_PROVIDER") {
        const url = Object.hasOwn(AI_PROVIDERS,message.provider) ? AI_PROVIDERS[message.provider] : null;
        if (!url) throw new Error('Unknown AI provider.');
        if (message.autofill) {
          if (typeof message.text !== 'string' || message.text.length > 2000000) throw new Error('AI request is too large. Use the clipboard copy instead.');
          const allowed = await chrome.permissions.contains({permissions:['scripting'],origins:[`${new URL(url).origin}/*`]});
          if (!allowed) throw new Error('Website access is not enabled. Use copy + open instead.');
        }
        const tab = await chrome.tabs.create({url});
        if (message.autofill) {
          await chrome.storage.session.set({[`aiHandoff:${tab.id}`]:{provider:message.provider,text:message.text,createdAt:Date.now()}});
          const current = await chrome.tabs.get(tab.id);
          if (current.status === 'complete') deliverAIRequest(tab.id).catch(()=>{});
        }
        sendResponse({ok:true});
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

      if (message?.type === "SYNC_ACTIVE") {
        const [profile, world] = await Promise.allSettled([
          message.profile === false ? Promise.resolve({skipped:true}) : syncProfile(Boolean(message.force)),
          message.world === false ? Promise.resolve({skipped:true}) : syncWorldState(Boolean(message.force))
        ]);
        sendResponse({
          ok: true,
          result: {
            profile: profile.status === "fulfilled" ? profile.value : {error:profile.reason?.message},
            world: world.status === "fulfilled" ? world.value : {error:world.reason?.message}
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
