importScripts("catalog.js", "inventory.js", "farming.js", "ai-handoff.js", "cycles.js", "live-timers.js");

const PROFILE_ENDPOINT = "https://api.warframe.com/cdn/getProfileViewingData.php";
const WORLDSTATE_ENDPOINT = "https://api.warframestat.us/pc?language=en";
const ITEMS_ENDPOINT = "https://api.warframestat.us/items?only=uniqueName,name,category,productCategory,type,sentinel,imageName,components,buildPrice,buildTime,buildQuantity,systemName,systemIndex,missionIndex,nodeType,missionType,missionName,minEnemyLevel,maxEnemyLevel,masteryReq,faction,factionIndex,tileset,questReqs,description,totalDamage,damage,criticalChance,criticalMultiplier,procChance,fireRate,accuracy,magazineSize,reloadTime,health,shield,armor,sprintSpeed,polarities,drops,wikiaUrl,marketCost";
const CATALOG_VERSION = 6;
const DROP_DATA_BASE = "https://raw.githubusercontent.com/WFCD/warframe-drop-data/master/data/";

const PROFILE_MIN_REFRESH_MS = 15 * 60 * 1000;
const PROFILE_BLOCK_BACKOFF_MS = 60 * 60 * 1000;
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

let profileSync;
function syncProfile(force = false) {
  // Opening a panel, alarms and automatic refresh never contact the profile API.
  if (!force) return getStore().then(state=>state.profile?.raw
    ? {cached:true,manualOnly:true,profile:state.profile} : {skipped:true,manualOnly:true});
  if (!profileSync) profileSync=fetchProfile().finally(()=>{profileSync=null;});
  return profileSync;
}
function retryAfterMs(value,now=Date.now()) {
  if (!value) return 0;
  const text=String(value).trim();
  if (/^\d+$/.test(text)) return Number.isFinite(Number(text)*1000) ? Number(text)*1000 : 0;
  const at=Date.parse(text);
  return Number.isFinite(at) ? Math.max(0,at-now) : 0;
}
async function recordProfileRequest(at,status) {
  const current=await getStore();
  const history=(current.profileRequestHistory || []).filter(row=>row.at !== at);
  await setStore({profileRequestHistory:[...history,{at,status}].slice(-20)});
}
async function fetchProfile() {
  const state = await getStore();
  const now = Date.now();

  const nextAllowed=Math.max(state.profile?.nextAllowedSyncAt || 0,
    (state.profile?.lastAttemptAt || state.profile?.lastSyncAt || 0)+PROFILE_MIN_REFRESH_MS);
  if (nextAllowed > now) throw new Error(`Profile refresh paused. Try again in ${Math.ceil((nextAllowed-now)/60000)} minutes. Live events can still update.`);

  const gid = await getGid();

  // Reserve the interval before sending, so worker restarts and failed responses
  // cannot turn repeated Refresh clicks into more requests.
  await setStore({profile:{...(state.profile || {}),lastAttemptAt:now,nextAllowedSyncAt:now+PROFILE_MIN_REFRESH_MS}});
  await recordProfileRequest(now,'pending');
  let response;
  try { response = await fetch(
    `${PROFILE_ENDPOINT}?playerId=${encodeURIComponent(gid)}`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      signal:AbortSignal.timeout(20000)
    }
  ); } catch {
    await recordProfileRequest(now,'network-error');
    throw new Error('Profile request failed. Automatic retries are off; wait before refreshing again.');
  }
  await recordProfileRequest(now,response.status);
  await setStore({profile:{...(state.profile || {}),lastAttemptAt:now,lastHttpStatus:response.status,nextAllowedSyncAt:now+PROFILE_MIN_REFRESH_MS}});

  if (!response.ok) {
    const retryMs=Math.max(PROFILE_MIN_REFRESH_MS,
      [403,429].includes(response.status) ? PROFILE_BLOCK_BACKOFF_MS : 0,
      retryAfterMs(response.headers.get('retry-after')));

    await setStore({
      profile: {
        ...(state.profile || {}),
        lastHttpStatus: response.status,
        lastAttemptAt:now,
        nextAllowedSyncAt: Date.now() + retryMs
      }
    });

    throw new Error(`Warframe profile API returned HTTP ${response.status}. Profile requests are paused for at least ${Math.ceil(retryMs/60000)} minutes; Refresh cannot bypass this.`);
  }

  let raw;

  try {
    raw = JSON.parse(await response.text());
    if (!Array.isArray(raw?.Results) || !raw.Results.length || !raw.Results[0] || typeof raw.Results[0] !== 'object') throw new Error('Invalid profile payload');
  } catch {
    await recordProfileRequest(now,'invalid-response');
    throw new Error("Warframe returned an invalid profile. Saved data retained; automatic retries are off.");
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
    lastAttemptAt:now,
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

let worldSync;
function syncWorldState(force = false) {
  if (!worldSync) worldSync = fetchWorldState(force).finally(() => { worldSync = null; });
  return worldSync;
}
async function fetchWorldState(force = false) {
  const state = await getStore();
  const now = Date.now();

  if (!force && state.world?.nextAllowedSyncAt > now && state.world?.raw) {
    return { cached: true, world: state.world };
  }

  const response = await fetch(WORLDSTATE_ENDPOINT, { cache: "no-store", signal: AbortSignal.timeout(20000) });

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
  await processCycleChanges(raw);

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

let farmingDropCache;
async function findGoalSources(name) {
  const goalName = String(name || "").trim().slice(0,120);
  if (goalName.length < 2) throw new Error("Enter at least two characters for an item.");
  const files = {missions:"missionRewards.json",blueprints:"blueprintLocations.json",mods:"modLocations.json",relics:"relics.json"};
  let all;
  try {
    if (farmingDropCache && Date.now()-farmingDropCache.at < 10*60*1000) all=farmingDropCache.data;
    else {
      const response=await fetch(DROP_DATA_BASE+'all.json',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(20000)});
      if (!response.ok) throw new Error('Full drop table unavailable');
      all=await response.json();
      if (!all?.missionRewards || !Array.isArray(all.relics)) throw new Error('Invalid drop table');
      farmingDropCache={at:Date.now(),data:all};
    }
  } catch { all=null; /* Fall back to individual tables when the complete feed is unavailable. */ }
  const results = all ? [] : await Promise.allSettled(Object.entries(files).map(async ([key,file]) => {
    const response = await fetch(DROP_DATA_BASE + file, {cache:"no-store",credentials:"omit",signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    return [key,await response.json()];
  }));
  const datasets = all ? {all,missions:all.missionRewards,blueprints:all,mods:all,relics:all} : Object.fromEntries(results.filter(row => row.status === "fulfilled").map(row => row.value));
  const store=await getStore();
  const acquisition=TennoFarming.acquisition(goalName,datasets,store.items?.index || {});
  if (!Object.keys(datasets).length && !acquisition.entry) throw new Error("Item and drop data are unavailable. Refresh item data or try again later.");
  const goal = {
    name:goalName,
    ...acquisition,
    checkedAt:Date.now(),
    partial:!all
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
      reasons:['CLIPBOARD','AUDIO_PLAYBACK'],
      justification:'Copy selected AI Bridge text and play cycle notification chimes.'
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

const CYCLE_ALARM = 'tenno-cycle-check';
function hasNotificationSelections(prefs) { return Object.values(prefs.cycles).some(Boolean) || Object.values(prefs.events).some(Boolean); }
async function configureCycleAlarm() {
  const state = await getStore();
  const prefs = TennoCycles.preferences(state.cycleNotifications);
  if (prefs.enabled && hasNotificationSelections(prefs)) {
    const existing=chrome.alarms.get ? await chrome.alarms.get(CYCLE_ALARM) : null;
    if (!existing) await chrome.alarms.create(CYCLE_ALARM,{periodInMinutes:1});
  } else await chrome.alarms.clear(CYCLE_ALARM);
}
async function playCycleSound(key,volume) {
  const request = clipboardQueue.catch(()=>{}).then(async()=>{
    await ensureClipboardDocument();
    try {
      const result = await chrome.runtime.sendMessage({target:'offscreen',type:'PLAY_CYCLE_SOUND',key,volume});
      if (!result?.ok) throw new Error(result?.error || 'Sound playback failed');
    } finally { await chrome.offscreen.closeDocument().catch(()=>{}); }
  });
  clipboardQueue=request;
  return request;
}
async function speakCycle(key,phase,volume,voicePack='cephalon',chime=true) {
  if (voicePack === 'cephalon' && TennoCycles.packClip(key,phase)) {
    const request=clipboardQueue.catch(()=>{}).then(async()=>{
      await ensureClipboardDocument();
      try {
        const result=await chrome.runtime.sendMessage({target:'offscreen',type:'PLAY_CYCLE_VOICE',key,phase,volume,chime});
        if (!result?.ok) throw new Error(result?.error || 'Voice pack playback failed');
      } finally { await chrome.offscreen.closeDocument().catch(()=>{}); }
    });
    clipboardQueue=request;
    return request;
  }
  throw new Error('No bundled voice clip for this cycle phase');
}

async function speakLiveTimer(key,volume,chime) {
  const request=clipboardQueue.catch(()=>{}).then(async()=>{
    await ensureClipboardDocument();
    try {
      const result=await chrome.runtime.sendMessage({target:'offscreen',type:'PLAY_LIVE_TIMER_VOICE',key,volume,chime});
      if (!result?.ok) throw new Error(result?.error || 'Live announcement playback failed');
    } finally { await chrome.offscreen.closeDocument().catch(()=>{}); }
  });
  clipboardQueue=request;
  return request;
}
async function processLiveTimerChanges(world) {
  const state=await getStore(),prefs=TennoCycles.preferences(state.cycleNotifications);
  const current=TennoLiveTimers.snapshot(world);
  const changed=TennoLiveTimers.changes(state.liveTimerSnapshot,current);
  await setStore({liveTimerSnapshot:TennoLiveTimers.merge(state.liveTimerSnapshot,current)});
  for (const alert of changed) {
    if (!prefs.enabled || !prefs.events[alert.key]) continue;
    const recent=(await getStore()).cycleNotificationHistory || [];
    if (recent.some(entry=>entry.eventKey === alert.eventKey)) continue;
    const event={eventKey:alert.eventKey,key:alert.key,location:alert.name,phase:alert.phase,at:Date.now(),
      audio:prefs.speech ? (prefs.sound ? 'Chime + announcement':'Announcement') : prefs.sound ? 'Chime only':'Silent',status:'pending'};
    await setStore({cycleNotificationHistory:[event,...recent].slice(0,10)});
    try {
      await chrome.notifications.create(`live-timer-${alert.key}`,{type:'basic',iconUrl:'assets/icon-128.png',title:alert.name,message:alert.message,silent:true});
      if (prefs.speech) await speakLiveTimer(alert.key,prefs.volume,prefs.sound);
      else if (prefs.sound) await playCycleSound('cetusCycle',prefs.volume);
      event.status='delivered';
    } catch (error) { event.status='failed';event.error=error.message;console.warn('Live timer alert failed:',error.message); }
    const history=(await getStore()).cycleNotificationHistory || [];
    await setStore({cycleNotificationHistory:history.map(entry=>entry.eventKey === event.eventKey ? event:entry)});
  }
}
let cycleCheckQueue=Promise.resolve();
function processCycleChanges(world) {
  const request=cycleCheckQueue.catch(()=>{}).then(async()=>{ await processCycleChangesOnce(world); await processLiveTimerChanges(world); });
  cycleCheckQueue=request;
  return request;
}
async function processCycleChangesOnce(world) {
  const state = await getStore();
  const prefs = TennoCycles.preferences(state.cycleNotifications);
  const current = TennoCycles.snapshot(world);
  const changed = TennoCycles.changes(state.cycleSnapshot,current);
  // Persist before delivery, preventing repeated alerts after a worker restart.
  await setStore({cycleSnapshot:TennoCycles.mergeSnapshot(state.cycleSnapshot,current)});
  for (const {key,location} of changed) {
    if (!prefs.enabled || !prefs.cycles[key]) continue;
    const eventKey=`${key}:${current[key].phase}:${current[key].activation ?? current[key].expiry}`;
    const recent=(await getStore()).cycleNotificationHistory || [];
    if (recent.some(entry=>entry.eventKey === eventKey)) continue;
    const event={eventKey,key,location,phase:current[key].phase,at:Date.now(),
      audio:prefs.speech ? (prefs.sound ? 'Chime + announcement':'Announcement') : prefs.sound ? 'Chime only':'Silent',status:'pending'};
    await setStore({cycleNotificationHistory:[event,...recent].slice(0,10)});
    try {
      await chrome.notifications.create(`cycle-${key}`,{type:'basic',iconUrl:'assets/icon-128.png',
        title:`${location} cycle changed`,message:`Now: ${current[key].phase}. Open Tenno Link for the current PC cycle timer.`,silent:true});
      if (prefs.sound && !prefs.speech) await playCycleSound(key,prefs.volume).catch(error=>console.warn(error.message));
      if (prefs.speech) await speakCycle(key,current[key].phase,prefs.volume,prefs.voicePack,prefs.sound);
      event.status='delivered';
    } catch (error) {
      event.status='failed'; event.error=error.message;
      console.warn('Cycle notification delivery failed:',error.message);
    }
    const history=(await getStore()).cycleNotificationHistory || [];
    await setStore({cycleNotificationHistory:history.map(entry=>entry.eventKey === eventKey ? event:entry)});
  }
}
chrome.alarms?.onAlarm.addListener(alarm=>{
  if (alarm.name === CYCLE_ALARM) getStore().then(state=>{
    const prefs=TennoCycles.preferences(state.cycleNotifications);
    if (prefs.enabled && hasNotificationSelections(prefs)) return syncWorldState();
  }).catch(error=>console.warn('Cycle check failed:',error.message));
});
chrome.runtime.onStartup?.addListener(()=>configureCycleAlarm().catch(console.warn));
chrome.runtime.onInstalled?.addListener(()=>configureCycleAlarm().catch(console.warn));
// Restore a missing alarm whenever Chrome starts this worker, without opening the panel.
if (chrome.alarms?.get) configureCycleAlarm().catch(console.warn);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target === 'offscreen') return false;
  (async () => {
    try {
      if (message?.type === 'ENSURE_CYCLE_MONITOR') {
        if (!/^https:\/\/(?:www\.)?warframe\.com\//.test(sender?.url || '') &&
            !/^https:\/\/wiki\.warframe\.com\//.test(sender?.url || '')) throw new Error('Unsupported companion page');
        await configureCycleAlarm();
        sendResponse({ok:true});
        return;
      }
      if (message?.type === 'COPY_TEXT') {
        if (typeof message.text !== 'string') throw new Error('Nothing to copy');
        sendResponse(await copyTextOffscreen(message.text));
        return;
      }
      if (message?.type === 'PREVIEW_LIVE_TIMER_SPEECH') {
        if (!TennoLiveTimers.clip(message.key)) throw new Error('Unknown Live timer');
        await speakLiveTimer(message.key,TennoCycles.preferences({volume:message.volume}).volume,true);
        sendResponse({ok:true});
        return;
      }
      if (message?.type === 'SAVE_CYCLE_NOTIFICATIONS') {
        const preferences=TennoCycles.preferences(message.preferences);
        const current=await getStore();
        const previous=TennoCycles.preferences(current.cycleNotifications);
        const baseline=TennoCycles.mergeSnapshot(current.cycleSnapshot,TennoCycles.snapshot(current.world?.raw));
        // Re-enabling a world establishes a baseline; volume and audio changes preserve monitoring.
        const resets=!previous.enabled && preferences.enabled;
        for (const {key} of TennoCycles.definitions) {
          if (resets || (!previous.cycles[key] && preferences.cycles[key])) delete baseline[key];
        }
        const eventBaseline=TennoLiveTimers.merge(current.liveTimerSnapshot,TennoLiveTimers.snapshot(current.world?.raw));
        for (const {key} of TennoLiveTimers.definitions) {
          if (resets || (!previous.events[key] && preferences.events[key])) delete eventBaseline[key];
        }
        await setStore({cycleNotifications:preferences,cycleSnapshot:baseline,liveTimerSnapshot:eventBaseline});
        await configureCycleAlarm();
        if (preferences.enabled) await syncWorldState().catch(()=>{});
        sendResponse({ok:true,preferences});
        return;
      }
      if (message?.type === 'PREVIEW_CYCLE_SPEECH') {
        const voice=TennoCycles.voices[message.key];
        if (!Object.hasOwn(TennoCycles.voices,message.key)) throw new Error('Unknown cycle');
        await speakCycle(message.key,voice.preview,TennoCycles.preferences({volume:message.volume}).volume,'cephalon',message.chime !== false);
        sendResponse({ok:true});
        return;
      }
      if (message?.type === 'PREVIEW_CYCLE_SOUND') {
        if (!TennoCycles.definitions.some(row=>row.key === message.key)) throw new Error('Unknown cycle');
        await playCycleSound(message.key,TennoCycles.preferences({volume:message.volume}).volume);
        sendResponse({ok:true});
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
