const $ = id => document.getElementById(id);
const openingParams = typeof location !== 'undefined' ? new URLSearchParams(location.search) : {get:()=>null};
const isOverlay = openingParams.get('overlay') === '1';
const returningOpen = openingParams.get('returning') === '1';
if (returningOpen) document.documentElement.classList.add('returning-open');
if (isOverlay) {
  document.documentElement.classList.add('overlay-mode');
  document.addEventListener('keydown',event => {
    if (event.key === 'Escape') window.parent.postMessage({type:'tenno-link-close'},'*');
  });
}

let state = {};
let format = "recommended";
let equipmentQuery = "";
let equipmentSort = "equipTime";
let equipmentLimit = 50;
let includeOtherCombat = false;
let equipmentCategory = "all";
let catalogSyncing = false;
let activeSyncing = false;
let nextAutoAttemptAt = 0;
let missionQuery = "";
let onlyUnplayedMissions = false;
const categoryLabel = category => TennoCatalog.labels[category] || "Unclassified";
function catalogIndex() { return state.items?.index || {}; }
function itemImage(entry) {
  const name = entry?.imageName;
  return `<span class="item-art" aria-hidden="true"><span>◇</span>${typeof name === 'string' && name ? `<img src="https://cdn.warframestat.us/img/${escapeHtml(encodeURIComponent(name))}" alt="" width="56" height="56" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}</span>`;
}
function planetArt(name, order, decorative = false) {
  const scenes = {
    Mercury:['#d1c5b2','#62594e','<g fill="none" stroke="#463f39" stroke-width="3"><circle cx="25" cy="28" r="7"/><circle cx="49" cy="22" r="5"/><circle cx="51" cy="49" r="9"/><circle cx="25" cy="54" r="4"/></g>'],
    Venus:['#ffe19a','#9b5e32','<path d="M12 29q12-14 27-5t30-3M9 43q14-12 30-1t30-3M14 56q13-12 25-2t30-4" fill="none" stroke="#f4bf70" stroke-width="5"/>'],
    Earth:['#54b9e6','#183a78','<path d="M23 22l13 3 6 9-9 6-1 9-11-3-6-12zm24 22 12-6 9 4-4 12-12 5-8-7z" fill="#62a96a"/><path d="M16 27q24-12 46 0M13 51q25 12 52 0" fill="none" stroke="#d7f4fc" stroke-opacity=".65" stroke-width="3"/>'],
    Mars:['#e8794b','#652d32','<path d="M10 27q14 8 24 0t34 2M12 44q14-8 29 1t27-2M19 57q14-7 24 0" fill="none" stroke="#f3a276" stroke-width="4"/><circle cx="30" cy="32" r="5" fill="#54282d"/>'],
    Jupiter:['#e9c398','#704533','<path d="M8 23h64v7H8zm0 13h64v9H8zm0 15h64v7H8z" fill="#f4dfc4" opacity=".72"/><ellipse cx="53" cy="42" rx="9" ry="5" fill="#bd634e"/>'],
    Saturn:['#e8c888','#785838','<ellipse cx="40" cy="41" rx="37" ry="11" fill="none" stroke="#d7bd87" stroke-width="5" transform="rotate(-20 40 41)"/><path d="M12 29h56M12 45h56" stroke="#fff0c4" stroke-width="3" opacity=".6"/>'],
    Uranus:['#8ddedb','#32748d','<ellipse cx="40" cy="40" rx="37" ry="10" fill="none" stroke="#bcebea" stroke-width="3" transform="rotate(68 40 40)"/><path d="M16 37q24-8 48 0M19 47q21-6 42 0" fill="none" stroke="#d4ffff" stroke-width="3" opacity=".55"/>'],
    Neptune:['#548df1','#182e8a','<path d="M12 24q22 12 55 0M10 38q24-10 60 2M13 52q22 9 53-1" fill="none" stroke="#a8c9ff" stroke-width="4"/><ellipse cx="52" cy="41" rx="8" ry="5" fill="#27417f"/>'],
    Pluto:['#e4d2c8','#79625e','<path d="M13 32q15-13 29-4t26 0M14 49q17-10 28-1t24-1" fill="none" stroke="#fff0df" stroke-width="7"/><ellipse cx="43" cy="36" rx="9" ry="5" fill="#cf9582"/>'],
    Europa:['#dbeaf0','#718caa','<path d="M8 30l23 10-11 6 27 7 17-15M16 16l11 19-7 10 12 20M55 14L40 34l11 7-9 23" fill="none" stroke="#f6fbff" stroke-width="2"/>'],
    Ceres:['#c6c7c0','#65696c','<g fill="#50565b"><circle cx="24" cy="29" r="6"/><circle cx="48" cy="23" r="4"/><circle cx="48" cy="49" r="8"/><circle cx="27" cy="52" r="4"/></g><path d="M33 40l7-3 6 4-8 4z" fill="#f6f2df"/>'],
    Deimos:['#c97758','#542d36','<path d="M13 31q12-18 28-8t26 1M10 48q19-10 34 2t26-5" fill="none" stroke="#ea9b6f" stroke-width="6"/><circle cx="27" cy="38" r="8" fill="#482a36"/>'],
    Phobos:['#a8a49a','#474954','<ellipse cx="35" cy="36" rx="17" ry="12" fill="#76736d" transform="rotate(-20 35 36)"/><circle cx="31" cy="35" r="6" fill="#383a43"/><circle cx="56" cy="50" r="4" fill="#393c45"/>'],
    Lua:['#9cb9d6','#394d75','<g fill="none" stroke="#d8e7f4"><circle cx="25" cy="28" r="7"/><circle cx="49" cy="22" r="5"/><circle cx="51" cy="49" r="9"/><circle cx="25" cy="54" r="4"/></g><path d="M13 39q27-16 54 0" stroke="#6bbad0" fill="none"/>'],
    Eris:['#dab9c1','#675663','<path d="M9 30q20-13 36-2t27-2M12 49q17-8 32 0t24-2" stroke="#f2dfe3" stroke-width="6" fill="none"/><circle cx="44" cy="37" r="7" fill="#ba8c9c"/>'],
    Sedna:['#d57d79','#653744','<path d="M10 29q16 8 31-2t28 2M14 48q17-12 31 0t23-1" stroke="#f1aaa0" stroke-width="5" fill="none"/><circle cx="29" cy="38" r="8" fill="#803f4e"/>'],
    'Kuva Fortress':['#9e3932','#351b29','<path d="M15 58V28l9 8 8-24 8 23 8-13 6 23 11-6v19z" fill="#b34b38" stroke="#f3a354" stroke-width="2"/><circle cx="40" cy="42" r="6" fill="#ffcf68"/>'],
    'Void':['#ac9bdf','#30245c','<circle cx="40" cy="40" r="19" fill="none" stroke="#edd7a4" stroke-width="3"/><circle cx="40" cy="40" r="10" fill="#f4e4ae"/><path d="M9 40h62M40 9v62" stroke="#c4a8ff" stroke-opacity=".6"/>'],
    Duviri:['#d4878d','#313d79','<path d="M40 10a30 30 0 0 0 0 60z" fill="#4977b4"/><path d="M40 10a30 30 0 0 1 0 60z" fill="#b86678"/><path d="M15 40h50" stroke="#edcaad" stroke-width="2"/>'],
    Zariman:['#9eabb5','#313d50','<path d="M9 39l31-12 31 12-31 12z" fill="#d0d4cb"/><path d="M21 36V24h38v12M30 34v-6m10 6v-6m10 6v-6" fill="none" stroke="#f5df9c" stroke-width="3"/>'],
    Höllvania:['#a9c5b4','#3b5156','<path d="M13 61V34h7V22h7v39m5 0V28h8v33m4 0V18h10v43m5 0V33h7v28" fill="#d0c4a4"/><path d="M17 40h4m15-7h4m7-8h4" stroke="#e8dcaa" stroke-width="3"/>']
  };
  const [top,bottom,details] = scenes[name] || (name.includes('Deimos') ? scenes.Deimos : scenes.Earth);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><radialGradient id="g" cx="30%" cy="25%"><stop stop-color="${top}"/><stop offset=".7" stop-color="${bottom}"/><stop offset="1" stop-color="#10151e"/></radialGradient><clipPath id="c"><circle cx="40" cy="40" r="29"/></clipPath></defs><circle cx="40" cy="40" r="29" fill="url(#g)"/><g clip-path="url(#c)">${details}<ellipse cx="28" cy="20" rx="34" ry="8" fill="#fff" opacity=".1"/></g><circle cx="40" cy="40" r="29" fill="none" stroke="#d9e3ec" stroke-opacity=".5"/></svg>`;
  return `<img class="planet-art" alt="${decorative ? '' : `${escapeHtml(name)} planet illustration`}"${decorative ? ' aria-hidden="true"' : ''} src="data:image/svg+xml,${encodeURIComponent(svg)}">`;
}
const missionTypes = {
  MT_EXTERMINATION:['Exterminate','Clear the marked enemy force.'], MT_CAPTURE:['Capture','Track down and capture the target, then reach extraction.'],
  MT_RESCUE:['Rescue','Find the prisoner, free them, and escort them to safety.'], MT_INTEL:['Spy','Recover data from security vaults; alarms make the vaults harder.'],
  MT_DEFENSE:['Defense','Protect the objective through waves of enemy attacks.'], MT_MOBILE_DEFENSE:['Mobile Defense','Carry a data mass to consoles and defend each upload.'],
  MT_SURVIVAL:['Survival','Keep life support active while enemies arrive; extract when ready.'], MT_EXCAVATE:['Excavation','Power excavators and defend them while they collect resources.'],
  MT_TERRITORY:['Interception','Capture and hold signal towers against enemy squads.'], MT_SABOTAGE:['Sabotage','Locate the facility target and destroy or disable it.'],
  MT_ASSASSINATION:['Assassination','Find and defeat the planet’s boss target.'], MT_ARTIFACT:['Disruption','Find conduits and protect them from demolysts.'],
  MT_LANDSCAPE:['Landscape','Explore an open world and take on its available activities.'], MT_RACE:['Race','Reach the finish before the timer expires.'],
  MT_HIVE:['Hive','Destroy the infested hives and their tumor nodes.'], MT_RETRIEVAL:['Hijack','Steal the marked vehicle and escort it to extraction.'],
  MT_ALCHEMY:['Alchemy','Collect and combine reagents while defending the crucible.'], MT_ASCENSION:['Ascension','Recover the capsule and carry it through the ascent.'],
  MT_VOID_CASCADE:['Void Cascade','Contain the Void ruptures and defend the exolizers.'], MT_ARMAGEDDON:['Void Armageddon','Defend the reliquary while clearing incoming threats.']
};
function missionInfo(node) {
  const [title,description] = missionTypes[node.missionType] || [node.missionName?.split('/').pop()?.replace(/^MissionName_/,'').replace(/([a-z])([A-Z])/g,'$1 $2') || 'Mission','Complete the objective shown at this node.'];
  const icons = {MT_EXTERMINATION:'⌖',MT_CAPTURE:'◎',MT_RESCUE:'♙',MT_INTEL:'▤',MT_DEFENSE:'⬡',MT_MOBILE_DEFENSE:'▣',MT_SURVIVAL:'♥',MT_EXCAVATE:'⛏',MT_TERRITORY:'⚑',MT_SABOTAGE:'✹',MT_ASSASSINATION:'⚔',MT_ARTIFACT:'◉',MT_LANDSCAPE:'⌂',MT_RACE:'➤',MT_HIVE:'✺',MT_RETRIEVAL:'⇧',MT_ALCHEMY:'⚗',MT_ASCENSION:'⇡',MT_VOID_CASCADE:'◌',MT_ARMAGEDDON:'⬢'};
  return {title,description,icon:icons[node.missionType] || '✦'};
}
function missionThumb(node) {
  const info = missionInfo(node);
  return `<span class="mission-art mission-${escapeHtml(String(node.missionType || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}" role="img" aria-label="${escapeHtml(info.title)} mission icon">${info.icon}</span>`;
}
function missionCard(node) {
  const info = missionInfo(node);
  const level = node.minEnemyLevel != null && node.maxEnemyLevel != null ? `${node.minEnemyLevel}–${node.maxEnemyLevel}` : node.minEnemyLevel ?? node.maxEnemyLevel ?? 'Not provided';
  return `<details class="mission-card"><summary>${missionThumb(node)}<span><b>${escapeHtml(node.name)}</b><small>${escapeHtml(info.title)}${level === 'Not provided' ? '' : ` · enemy level ${escapeHtml(level)}`}</small></span><span class="mission-status">${node.completed ? 'Completed' : 'Unplayed'}</span></summary><div class="mission-details"><p><b>What you do</b>${escapeHtml(info.description)}</p>${level === 'Not provided' ? '' : `<div class="mission-facts">${item('Enemy level',level)}</div>`}</div></details>`;
}
function equipmentDetails(path) {
  const data = catalogIndex()[path];
  if (!data) return '<p class="muted">Description and base stats are not available for this item.</p>';
  const values = [];
  const number = (key,label,suffix='') => { if (Number.isFinite(Number(data[key]))) values.push(item(label,`${Number(data[key]).toLocaleString(undefined,{maximumFractionDigits:2})}${suffix}`)); };
  number('masteryReq','Mastery Rank');
  if (data.totalDamage != null) number('totalDamage','Base damage per shot');
  if (data.criticalChance != null) values.push(item('Critical chance', `${(Number(data.criticalChance)*100).toLocaleString(undefined,{maximumFractionDigits:1})}%`));
  number('criticalMultiplier','Critical multiplier','×');
  const status = data.procChance ?? data.statusChance; if (status != null) values.push(item('Status chance',`${(Number(status)*100).toLocaleString(undefined,{maximumFractionDigits:1})}%`));
  number('fireRate','Fire rate'); number('magazineSize','Magazine'); number('reloadTime','Reload time',' s');
  number('health','Health'); number('shield','Shields'); number('armor','Armor'); number('sprintSpeed','Sprint speed');
  if (Array.isArray(data.polarities) && data.polarities.length) values.push(item('Polarities',data.polarities.map(x=>String(x).replace(/^./,x[0].toUpperCase())).join(', ')));
  const damage = data.damage && typeof data.damage === 'object' ? Object.entries(data.damage).filter(([key,value])=>!['total','true','healthDrain','energyDrain','shieldDrain','cinematic'].includes(key) && Number(value)>0).map(([key,value])=>item(key.charAt(0).toUpperCase()+key.slice(1),Number(value).toLocaleString(undefined,{maximumFractionDigits:1}))).join('') : '';
  return `${data.description ? `<p class="equipment-description">${escapeHtml(data.description)}</p>` : '<p class="muted">No description is available for this item.</p>'}${values.length || damage ? `<div class="gear-facts">${values.join('')}${damage}</div>` : '<p class="muted">No base stats are listed for this item.</p>'}`;
}
document.addEventListener('error', event => {
  if (event.target?.matches?.('.item-art img')) event.target.hidden = true;
}, true);
function equipmentHistory() { return TennoCatalog.history(profile()?.arsenal, catalogIndex()); }
function categoryOptions(keys, selected, allLabel = "All categories") {
  return `<option value="all">${allLabel}</option>` + keys.map(key => `<option value="${key}" ${key === selected ? "selected" : ""}>${escapeHtml(categoryLabel(key))}</option>`).join("");
}
const escapeHtml = value => String(value ?? "—").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
let prompt =
  typeof PROMPTS !== "undefined" && PROMPTS.length
    ? PROMPTS[0]
    : {
        title: "Progression Advisor",
        description: "Analyze my profile.",
        prompt: "Analyze my Warframe profile and recommend what to do next."
      };

function fmtHours(sec) {
  if (TennoInsights.number(sec) === null) return "—";
  const totalMinutes = Math.floor(Number(sec) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function showToast(text) {
  const toast = $("toast");
  toast.textContent = text;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(
    () => toast.classList.remove("show"),
    1500
  );
}

function card(label, value) {
  return `
    <div class="stat">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(value ?? "—")}</strong>
    </div>
  `;
}

function item(label, value) {
  return `
    <div class="item">
      <b>${escapeHtml(label)}</b>
      <span>${escapeHtml(value ?? "—")}</span>
    </div>
  `;
}

function cleanUiText(value) {
  return String(value ?? "")
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(/[\u0000-\u001F]/g, "")
    .trim();
}

function profile() {
  return state?.profile?.normalized || null;
}

function world() {
  return state?.world?.raw || null;
}

function renderIdentity() {
  const p = profile();

  $("name").textContent = cleanUiText(p?.identity?.displayName) || "No profile synced";
  $("mr").textContent = p?.identity?.masteryRank ?? "—";
}

function renderHome() {
  const p = profile();
  if (!p) {
    $("home").innerHTML = `<div class="panel empty"><h2>Your next mission starts here</h2><p>Sign in to <a href="https://www.warframe.com/" target="_blank" rel="noopener">warframe.com</a>, then use the round refresh button above.</p><p class="muted">Explore your career, equipment and standing here. AI Bridge can also prepare a question without account data.</p><button type="button" class="bridge-entry" data-open-ai>Explore AI Bridge</button></div>${activityPanel()}`;
    bindLiveShortcut();
    return;
  }
  const s = p.summary || {};
  const insight = TennoInsights.career(s);
  const metric = (label, value, explanation) => `<div class="stat"><small>${label}</small><strong>${escapeHtml(value)}</strong><p>${explanation}</p></div>`;
  const decimal = value => value === null ? "Not reported" : value.toLocaleString(undefined, {maximumFractionDigits: 1});
  const current = Object.fromEntries(Object.entries({warframe:"warframes", primary:"primary", secondary:"secondary", melee:"melee"}).map(([slot,group]) => {
    const path = p.arsenal?.[group]?.[0]?.ItemType;
    return [slot, catalogIndex()[path]?.name || p.arsenal?.current?.[slot] || "—"];
  }));
  $("home").innerHTML = `
    <div class="section-title"><div><h2>Your career, at a glance</h2><small>Lifetime records from the latest profile snapshot</small></div></div>
    <div class="bridge-invitation"><div><strong>Need a plan for your next session?</strong><small>Choose a goal, then build a question with the account details you want to share.</small></div><button type="button" class="bridge-entry" data-open-ai>Open AI Bridge</button></div>
    <div class="stats-grid">
      ${metric("Missions completed", formatQuantity(s.missionsCompleted), "Successful mission completions recorded by the profile.")}
      ${metric("Time played", fmtHours(s.timePlayedSec), "Profile play time; may differ from platform launcher hours.")}
      ${metric("Completions / hour", decimal(insight.missionsPerHour), "Completed missions ÷ profile hours. A play-style measure, not a skill score.")}
    </div>
    <div class="panel"><h2>Explore your equipment</h2><p>${formatQuantity(equipmentHistory().filter(row => row.isEquipment || row.profileEvidence).length)} equipment records are available. Search and sort Equipment to find your most-used gear and compare recorded kills or affinity.</p><p class="muted">Usage and affinity are historical; they do not prove current ownership or mastery completion.</p></div>
    <div class="panel"><h2>Profile loadout</h2><p class="muted">Equipment returned in this snapshot, not a complete inventory.</p><div class="career-grid">${Object.entries(current).map(([k,v]) => `<div class="loadout-card">${itemImage(catalogIndex()[p.arsenal?.[k === "warframe" ? "warframes" : k]?.[0]?.ItemType])}<div><small>${escapeHtml(k.charAt(0).toUpperCase()+k.slice(1))}</small><b>${escapeHtml(v)}</b></div></div>`).join("")}</div></div>
    ${nextMissionPanel()}${activityPanel()}`;
  document.querySelectorAll("[data-open-chart]").forEach(button => button.onclick = () => $("nav").querySelector('[data-page="chart"]').click());
  bindLiveShortcut();
  $("home").insertAdjacentHTML("beforeend", `<details class="panel"><summary>More career stats & how to read them</summary><div class="career-grid">
      ${item("Missions quit", formatQuantity(s.missionsQuit))}${item("Missions failed", formatQuantity(s.missionsFailed))}
      ${item("Missions interrupted", formatQuantity(s.missionsInterrupted))}${item("Deaths", formatQuantity(s.deaths))}
      ${item("Revives", formatQuantity(s.revives))}${item("Melee kills", formatQuantity(s.meleeKills))}
      ${item("Ciphers solved", formatQuantity(s.ciphersSolved))}
    </div><p class="muted">A dash means the API omitted a value, not zero. These lifetime figures do not measure recent progress or build strength.</p></details>`);
}

function renderProgress() {
  const entries = profile()?.progression?.affiliations || [];
  const names = { ArbitersSyndicate: "Arbiters of Hexis", CephalonSudaSyndicate: "Cephalon Suda", PerrinSyndicate: "The Perrin Sequence", RedVeilSyndicate: "Red Veil", NewLokaSyndicate: "New Loka", SteelMeridianSyndicate: "Steel Meridian", CetusSyndicate: "Ostron", QuillsSyndicate: "The Quills", SolarisSyndicate: "Solaris United", VoxSyndicate: "Vox Solaris", VentKidsSyndicate: "Ventkids", EntratiSyndicate: "Entrati", NecraloidSyndicate: "Necraloid", ZarimanSyndicate: "The Holdfasts", CaviaSyndicate: "Cavia", HexSyndicate: "The Hex", LibrarySyndicate: "Cephalon Simaris", ConclaveSyndicate: "Conclave" };
  $("progress").innerHTML = `<div class="panel"><h2>Syndicate records</h2><p class="muted">Reported standing and rank. Historical event affiliations may also appear. These values are not a spendable-balance or rank-up requirement estimate.</p><div class="list">${entries.map(e => item(names[e.Tag] || e.Tag?.replace(/([a-z])([A-Z])/g, "$1 $2") || "Unknown affiliation", `${formatQuantity(e.Standing)} standing · Rank ${e.Title ?? "—"}${e.Standing < 0 ? " · Negative standing" : ""}`)).join("") || item("No standing records", "Sync a profile to see available affiliations.")}</div></div>`;
}

function nextMissionPanel() {
  const data = TennoProgression.chart(profile()?.progression?.missions, catalogIndex());
  const candidates = data.planets.filter(planet => planet.junctions.length).flatMap(planet => planet.nodes.filter(node => !node.completed).slice(0,3).map(node=>({planet,node}))).slice(0,4);
  return `<div class="panel"><div class="section-title"><div><h2>Missions to explore next</h2><small>Unplayed nodes on planets with a recorded cleared junction</small></div></div>${candidates.length ? `<div class="mission-suggestions">${candidates.map(({planet,node})=>`<div class="mission-suggestion">${planetArt(planet.name,planet.order)}<span><b>${escapeHtml(node.name)}</b><small>${escapeHtml(planet.name)} · ${escapeHtml(missionInfo(node).title)} · enemy ${node.minEnemyLevel ?? '—'}–${node.maxEnemyLevel ?? '—'}</small></span></div>`).join('')}</div><p class="muted">Your profile may omit unlocked routes; confirm access in game.</p>` : `<p class="muted">Sync your profile to find approachable nodes near recorded junction progress.</p>`}<button class="secondary-action" data-open-chart>Open Star Chart</button></div>`;
}

function renderChart() {
  const data = TennoProgression.chart(profile()?.progression?.missions, catalogIndex());
  if (!profile() || !data.total) {
    $("chart").innerHTML = `<div class="panel"><h2>Your Star Chart</h2><p>${!profile() ? 'Synchronize your profile to see recorded mission progress.' : 'Update planet and equipment data to load destinations and mission nodes.'}</p></div>`;
    return;
  }
  $("chart").innerHTML = `<div class="panel"><h2>Your Star Chart</h2><p>See where you have played and which junctions you have cleared.</p><p class="muted">This profile reports completions, not a current unlock list. Activity can include missions joined with other players. No record does not mean locked. Counts combine reported tiers and compare against the cached game data, not Steel Path or Arbitration eligibility.</p></div>
    <div class="stats-grid">${card('Nodes with completions', `${data.completed} / ${data.total}`)}${card('Junctions cleared',data.junctions.length)}</div>
    <button id="refreshGameData" ${catalogSyncing ? 'disabled' : ''}>${catalogSyncing ? 'Updating…' : 'Update planet and equipment data'}</button>
    <div class="panel mission-filter-panel"><div class="mission-filter-controls"><label for="missionSearch">Search nodes<input id="missionSearch" type="search" placeholder="Node, planet or mission type" value="${escapeHtml(missionQuery)}" autocomplete="off"></label><label class="mission-filter-toggle"><input id="onlyUnplayedMissions" type="checkbox" ${onlyUnplayedMissions ? 'checked' : ''}> Show only unplayed missions</label></div><p id="missionFilterCount" class="muted" role="status" aria-live="polite"></p></div>
    <div id="missionResults" class="list"></div>
    ${data.unmatched.length ? `<details class="panel"><summary>${data.unmatched.length} other mission records</summary><p class="muted">These identifiers have no destination match in the current game data. They may include hubs, events or retired missions; they are excluded from the node counts above.</p><p class="source-path">${data.unmatched.map(escapeHtml).join(' · ')}</p></details>` : ''}`;
  $("refreshGameData").onclick = () => syncCatalog(true);
  $("missionSearch").oninput = event => { missionQuery = event.target.value; renderMissionResults(data); };
  $("onlyUnplayedMissions").onchange = event => { onlyUnplayedMissions = event.target.checked; renderMissionResults(data); };
  renderMissionResults(data);
}

function renderMissionResults(data) {
  const query = missionQuery.trim().toLocaleLowerCase();
  const filtered = data.planets.map(planet => ({planet, nodes:planet.nodes.filter(node =>
    (!onlyUnplayedMissions || !node.completed) &&
    (!query || `${node.name} ${planet.name} ${missionInfo(node).title}`.toLocaleLowerCase().includes(query))
  )})).filter(entry => entry.nodes.length);
  const count = filtered.reduce((sum,entry) => sum + entry.nodes.length, 0);
  $("missionFilterCount").textContent = `${count} of ${data.total} nodes shown${onlyUnplayedMissions ? ' · no completion recorded' : ''}`;
  $("missionResults").innerHTML = count ? filtered.map(({planet,nodes}) => `<details class="panel planet-row" ${query || onlyUnplayedMissions ? 'open' : ''}><summary>${planetArt(planet.name,planet.order)}<span><b>${escapeHtml(planet.name)}</b><small>${planet.junctions.length ? 'Incoming junction cleared' : planet.completed ? 'Activity recorded' : 'Access unconfirmed'}</small></span><span>${nodes.length} shown<small>${planet.completed} / ${planet.nodes.length} recorded</small></span></summary><progress value="${planet.completed}" max="${planet.nodes.length}" aria-label="${escapeHtml(planet.name)} nodes with completions"></progress>
    ${planet.junctions.map(j=>`<p>${escapeHtml(j.from)} → ${escapeHtml(j.to)} junction cleared</p>`).join('')}
    <p class="muted">Use nodes without a completion record as a checklist; check access and requirements in game.</p>
    <div class="list">${nodes.map(missionCard).join('')}</div></details>`).join('') : '<div class="panel"><p class="muted">No nodes match these filters. Try another search or turn off the unplayed filter.</p></div>';
}

async function syncCatalog(force = false) {
  if (catalogSyncing) return;
  catalogSyncing = true;
  renderChart();
  try {
    const response = await chrome.runtime.sendMessage({type:"SYNC_ITEMS",force});
    if (!response?.ok) throw new Error(response?.error || "Could not update planet and equipment data.");
    const next = await chrome.runtime.sendMessage({type:"GET_STATE"});
    if (!next?.ok) throw new Error(next?.error || "Could not read saved data.");
    state = next.state || {};
  } catch (error) { showToast(error.message); }
  finally { catalogSyncing = false; renderAll(); }
}

function renderArsenal() {
  const hasCatalog = Object.keys(catalogIndex()).length > 0;
  $("arsenal").innerHTML = `<div class="panel"><h2>Equipment history</h2><p class="muted">Profile loadout, affinity and usage records, grouped by item type. History does not prove current ownership.</p>
    ${!hasCatalog ? '<p class="data-notice">Equipment data has not loaded yet. Update it from Star Chart to see complete names, categories and pictures.</p>' : ''}
    <div class="equipment-controls"><label>Find equipment<input id="equipmentSearch" type="search" placeholder="Search name or item path" value="${escapeHtml(equipmentQuery)}"></label><label>Equipment category<select id="equipmentCategory">${categoryOptions(TennoCatalog.equipmentCategories, equipmentCategory, "All equipment")}</select></label><label>Sort by<select id="equipmentSort"><option value="equipTime">Equipped time</option><option value="kills">Recorded kills</option><option value="xp">Recorded affinity</option></select></label></div>
    <label class="combat-toggle"><input id="otherCombat" type="checkbox"> Include unmatched and other combat records in All equipment</label>
    <p id="equipmentCount" class="muted" role="status"></p><div id="equipmentRows" class="list"></div><button id="moreEquipment" hidden>Show more equipment</button>
    <p class="muted">Equipped time overlaps across slots. A dash means a counter was not reported. Affinity is not converted to rank.</p></div>`;
  $("otherCombat").checked = includeOtherCombat;
  $("otherCombat").onchange = event => { includeOtherCombat = event.target.checked; equipmentLimit = 50; renderEquipmentRows(); };
  $("equipmentCategory").onchange = event => { equipmentCategory = event.target.value; equipmentLimit = 50; renderEquipmentRows(); };
  $("equipmentSort").value = equipmentSort;
  $("equipmentSearch").oninput = event => { equipmentQuery = event.target.value; equipmentLimit = 50; renderEquipmentRows(); };
  $("equipmentSort").onchange = event => { equipmentSort = event.target.value; equipmentLimit = 50; renderEquipmentRows(); };
  $("moreEquipment").onclick = () => { equipmentLimit += 50; renderEquipmentRows(); };
  renderEquipmentRows();
}

function renderEquipmentRows() {
  const query = equipmentQuery.trim().toLowerCase();
  const rows = equipmentHistory().filter(row => equipmentCategory === "all" ? row.isEquipment || includeOtherCombat : row.category === equipmentCategory)
    .filter(row => `${row.name} ${row.path}`.toLowerCase().includes(query))
    .sort((a,b) => (TennoInsights.number(b[equipmentSort]) ?? -1) - (TennoInsights.number(a[equipmentSort]) ?? -1) || a.name.localeCompare(b.name));
  $("equipmentCount").textContent = `${Math.min(equipmentLimit, rows.length)} of ${rows.length} matching records`;
  $("moreEquipment").hidden = rows.length <= equipmentLimit;
  $("equipmentRows").innerHTML = rows.slice(0,equipmentLimit).map(row => `<details class="equipment-row"><summary><span class="item-identity">${itemImage(catalogIndex()[row.path])}<span><b>${escapeHtml(row.name)}</b><small>${escapeHtml(categoryLabel(row.category))}${!row.resolved ? " · Item match unavailable" : ""}</small></span></span><span>${equipmentSort === "equipTime" ? fmtHours(row.equipTime) : formatQuantity(row[equipmentSort])}<small>${{equipTime:"equipped",kills:"kills",xp:"affinity"}[equipmentSort]}</small></span></summary><div class="career-grid">${item("Equipped time",fmtHours(row.equipTime))}${item("Kills",formatQuantity(row.kills))}${item("Assists",formatQuantity(row.assists))}${item("Affinity",formatQuantity(row.xp))}</div>${equipmentDetails(row.path)}<p class="source-path">${escapeHtml(row.path)}</p></details>`).join("") || '<p>No matching equipment. Try another category or search, or update item data.</p>';
}

function rewardText(invasion) {
  const attacker = invasion?.attacker?.reward;
  const defender = invasion?.defender?.reward;

  return (
    attacker?.asString ||
    defender?.asString ||
    attacker?.countedItems?.[0]?.type ||
    defender?.countedItems?.[0]?.type ||
    "See invasion details"
  );
}

function formatQuantity(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString();
}

function timeLeft(expiry) {
  if (!expiry) return "—";

  const ms = new Date(expiry).getTime() - Date.now();

  if (!Number.isFinite(ms)) return "—";

  if (ms <= 0) return "expired";
  if (ms > 21 * 24 * 60 * 60 * 1000) return "time unavailable";

  const secondsLeft = Math.ceil(ms / 1000);
  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  if (days) return `${days}d ${hours % 24}h`;
  return hours ? `${hours}h ${String(minutes).padStart(2,'0')}m` : `${minutes}m ${String(seconds).padStart(2,'0')}s`;
}

function plausibleExpiry(expiry, maxHours = 21 * 24) {
  const remaining = new Date(expiry).getTime() - Date.now();
  return Number.isFinite(remaining) && remaining > 0 && remaining <= maxHours * 3600000;
}

function countdown(expiry) {
  const ms = new Date(expiry).getTime();
  if (!Number.isFinite(ms)) return '—';
  const iso = new Date(ms).toISOString();
  return `<time class="live-countdown" datetime="${iso}" data-countdown="${iso}">${escapeHtml(timeLeft(iso))}</time>`;
}

function itemWithCountdown(label, prefix, expiry, suffix = '') {
  const detail = String(prefix || '').trim().replace(/[·•]\s*$/, '').trim();
  return `<div class="item"><b>${escapeHtml(label)}</b><span class="world-detail">${detail ? `<span class="world-value">${escapeHtml(detail)}</span>` : ''}<span class="world-timer">${countdown(expiry)}${escapeHtml(suffix)}</span></span></div>`;
}

function itemWithOptionalCountdown(label, value, expiry, maxHours) {
  return plausibleExpiry(expiry,maxHours) ? itemWithCountdown(label,value,expiry,' left') : item(label,value);
}

function displayWorldNode(value) {
  const node = cleanUiText(value);
  if (!node) return 'Location unavailable';
  if (!/^SolNode\d+$/i.test(node)) return node;
  const match = catalogIndex()[node];
  if (!match?.name || /^SolNode\d+$/i.test(match.name)) return 'Location unavailable';
  return match.systemName ? `${match.name}, ${match.systemName}` : match.name;
}

function liveText(...values) {
  return values.map(cleanUiText).filter(value => value && !/^SolNode\d+$/i.test(value)).join(' · ');
}

const LIVE_SYSTEMS = ['Kuva Fortress','Höllvania','Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Europa','Ceres','Deimos','Phobos','Lua','Eris','Sedna','Void','Duviri','Zariman'];

function worldLocationSystem(value) {
  const text = cleanUiText(value);
  const catalogSystem = /^SolNode\d+$/i.test(text) ? catalogIndex()[text]?.systemName : null;
  if (LIVE_SYSTEMS.includes(catalogSystem)) return catalogSystem;
  return LIVE_SYSTEMS.find(name => text === name || text.endsWith(`, ${name}`) || text.endsWith(`(${name})`)) || null;
}

function cycleStateIcon(state) {
  const key = cleanUiText(state).toLowerCase();
  const paths = {
    day:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5M19.1 4.9l-1.5 1.5M6.4 17.6l-1.5 1.5"/>',
    night:'<path d="M20 16.5A8.5 8.5 0 0 1 7.5 4 8.5 8.5 0 1 0 20 16.5z"/><path d="m17 4 .4 1.6L19 6l-1.6.4L17 8l-.4-1.6L15 6l1.6-.4z"/>',
    warm:'<path d="M12 3v11m-3 0a4 4 0 1 0 6 0V6a3 3 0 0 0-6 0z"/><path d="M12 13v5"/>',
    cold:'<path d="M12 2v20M4 6l16 12M20 6 4 18M9 4l3 3 3-3M9 20l3-3 3 3"/>',
    vome:'<path d="M4 18c2-8 7-13 16-14-1 9-6 14-14 16M7 17l9-9"/>',
    fass:'<path d="M12 3c3 4 5 7 5 11a5 5 0 0 1-10 0c0-4 2-7 5-11zM10 16c0 1 1 2 2 2"/>'
  };
  if (!paths[key]) return '';
  return `<svg class="cycle-state-icon cycle-${key}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key]}</svg>`;
}

function liveRow(label, values, expiry, maxHours = 48, options = {}) {
  const detail = liveText(...values) || 'Details unavailable';
  const system = options.system;
  const heading = system && LIVE_SYSTEMS.includes(system) ? `<span class="live-entry-heading">${planetArt(system,0,true)}<b>${escapeHtml(label)}</b></span>` : `<b>${escapeHtml(label)}</b>`;
  const timer = plausibleExpiry(expiry,maxHours) ? `<span class="world-timer">${countdown(expiry)} left</span>` : '';
  return `<div class="item live-entry">${heading}<span class="world-detail">${options.state ? cycleStateIcon(options.state) : ''}<span class="world-value">${escapeHtml(detail)}</span>${timer}</span></div>`;
}

function liveIcon(title) {
  const shapes = {
    'World cycles':'<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/>',
    'Sortie':'<path d="m12 3 7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7z"/><path d="m9 12 2 2 4-4"/>',
    'Archon Hunt':'<path d="m12 2 7 7-7 12L5 9z"/><path d="m5 9 7 3 7-3"/>',
    'Current events':'<path d="m12 2 2.1 6.9L21 11l-6.9 2.1L12 20l-2.1-6.9L3 11l6.9-2.1z"/>',
    'Alerts':'<path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6zM10 20h4"/>',
    'Void fissures':'<path d="m13 2-7 10h5l-1 10 8-12h-5z"/>',
    'Steel Path fissures':'<path d="m13 2-7 10h5l-1 10 8-12h-5zM3 18h4M18 18h3"/>',
    'Void storms':'<path d="M4 13a5 5 0 0 1 5-7 6 6 0 0 1 11 4 4 4 0 0 1-1 8H7"/><path d="m12 11-2 4h3l-1 4"/>',
    'Vendors & weekly':'<path d="M4 8h16v12H4zM3 8l2-5h14l2 5M9 12h6M12 12v8"/>',
    'Steel Path incursions':'<path d="M4 12h16M12 4l8 8-8 8M5 5l4 4M5 19l4-4"/>',
    'Nightwave challenges':'<path d="M3 15a9 9 0 1 0 12-12 7 7 0 1 1-12 12z"/><path d="m17 16 1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
    'Arbitration':'<path d="M5 5h14v14H5zM8 12h8M12 8v8"/>',
    'Invasions':'<path d="M4 4 20 20M20 4 4 20M4 4v5M4 4h5M20 4v5M20 4h-5"/>',
    "Darvo's deal":'<path d="M3 8V4h7l11 11-6 6L4 10z"/><circle cx="7" cy="7" r="1"/>',
    'News':'<path d="M4 4h16v15H4zM8 8h8M8 12h8M8 16h5"/>'
  };
  return `<svg class="live-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[title] || shapes.News}</svg>`;
}

const LIVE_TIPS = {
  'World cycles':'Cycle timers are public PC estimates. Check the phase before starting a bounty or a time-sensitive farm.',
  'Sortie':'Open each stage to check its mission type and modifier before choosing a loadout.',
  'Archon Hunt':'The three stages share a weekly target. Check the mission sequence before starting.',
  'Current events':'Event details can change with game updates. Open the event in game before committing to a reward plan.',
  'Alerts':'Alerts expire quickly. Check the mission and reward in game before joining.',
  'Void fissures':'Match the fissure tier to the relic you want to open, then check mission type and time left.',
  'Steel Path fissures':'Steel Path fissures need Steel Path access. This public list cannot confirm your unlocks.',
  'Void storms':'Void storms are Railjack fissures. Bring a relic for the listed tier and check your Railjack access.',
  'Vendors & weekly':'Baro arrival and Steel Path offerings are public rotations. A timer does not confirm that you own the required currency.',
  'Steel Path incursions':'Incursions rotate daily. If mission details are absent here, inspect the current node in game.',
  'Nightwave challenges':'Choose challenges that fit your current session. Progress is not read from this public feed.',
  'Arbitration':'Arbitrations rotate hourly. The public node does not confirm your eligibility.',
  'Invasions':'Check both sides and their rewards before choosing a faction in game.',
  "Darvo's deal":'Stock can change before your next refresh. Confirm the current price in game.',
  'News':'Open the official post for details and patch changes before following a build or farming guide.'
};

function liveGroup(title, rows, open = false) {
  if (!rows.length) return '';
  return `<details class="panel live-group" data-live-group${open ? ' open' : ''}><summary>${liveIcon(title)}<span class="live-group-title">${escapeHtml(title)}</span><small>${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}</small><svg class="live-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 4 6 6-6 6"/></svg></summary><div class="live-group-content"><div class="list world-list">${rows.join('')}</div>${LIVE_TIPS[title] ? `<details class="live-tip"><summary>Tenno tip</summary><p>${escapeHtml(LIVE_TIPS[title])}</p></details>` : ''}</div></details>`;
}

function bindLiveActions() {
  const root = $('live');
  root.querySelectorAll('[data-live-expand]').forEach(button => button.onclick = () => {
    const expand = button.dataset.liveExpand === 'all';
    root.querySelectorAll('[data-live-group]').forEach(group => { group.open = expand; });
  });
}

function liveMission(row, label) {
  const level = row.minEnemyLevel != null && row.maxEnemyLevel != null && Number.isFinite(Number(row.minEnemyLevel)) && Number.isFinite(Number(row.maxEnemyLevel))
    ? `Level ${row.minEnemyLevel}–${row.maxEnemyLevel}` : '';
  return liveRow(label,[row.node ? displayWorldNode(row.node) : '',row.missionType,row.enemy,row.faction,level,row.modifier,row.modifierDescription],row.expiry,48,{system:worldLocationSystem(row.node)});
}

function sortieRows(sortie, maxHours = 48) {
  if (!sortie) return [];
  const stages = Array.isArray(sortie.variants) && sortie.variants.length ? sortie.variants : sortie.missions || [];
  return [liveRow('Target',[sortie.boss,sortie.faction],sortie.expiry,maxHours),
    ...stages.map((stage,index) => liveRow(`Stage ${index+1}`,[stage.missionType,stage.node ? displayWorldNode(stage.node) : '',stage.modifier,stage.modifierDescription,stage.enemy],null,48,{system:worldLocationSystem(stage.node)}))];
}

function cycleRows(w) {
  const cycles = [
    ['Earth','Earth',w.earthCycle,typeof w.earthCycle?.isDay === 'boolean' ? (w.earthCycle.isDay ? 'Day' : 'Night') : ''],
    ['Plains of Eidolon','Earth',w.cetusCycle,typeof w.cetusCycle?.isDay === 'boolean' ? (w.cetusCycle.isDay ? 'Day' : 'Night') : ''],
    ['Orb Vallis','Venus',w.vallisCycle,typeof w.vallisCycle?.isWarm === 'boolean' ? (w.vallisCycle.isWarm ? 'Warm' : 'Cold') : ''],
    ['Cambion Drift','Deimos',w.cambionCycle,w.cambionCycle?.active],
    ['Duviri','Duviri',w.duviriCycle,w.duviriCycle?.state],
    ['Zariman','Zariman',w.zarimanCycle,w.zarimanCycle?.state]
  ];
  return cycles.filter(([, ,cycle]) => cycle).map(([name,system,cycle,fallback]) => {
    const current = cycle.state || cycle.active || fallback;
    return liveRow(name,[current],cycle.expiry || cycle.next,12,{system,state:current});
  });
}

function updateCountdowns() {
  document.querySelectorAll('[data-countdown]').forEach(element => {
    element.textContent = timeLeft(element.dataset.countdown);
  });
}

function activityPanel() {
  const w = world();
  const now = Date.now();
  const fissure = (w?.fissures || []).filter(row => !row.expired && new Date(row.expiry).getTime() > now)
    .sort((a,b) => new Date(a.expiry) - new Date(b.expiry))[0];
  const alert = (w?.alerts || []).filter(row => !row.expired && new Date(row.expiry).getTime() > now)
    .sort((a,b) => new Date(a.expiry) - new Date(b.expiry))[0];
  const activities = [
    fissure && {name:`${fissure.tier || 'Void'} fissure`,detail:`${fissure.node || 'Node unknown'} · `,expiry:fissure.expiry,suffix:' left'},
    alert && {name:'Alert',detail:`${alert.mission?.node || alert.node || 'Node unknown'} · `,expiry:alert.expiry,suffix:' left'},
    w?.sortie && {name:'Sortie',detail:w.sortie.boss || w.sortie.faction || 'Active on PC',expiry:plausibleExpiry(w.sortie.expiry,48) ? w.sortie.expiry : null,suffix:' left'},
    w?.voidTrader && (w.voidTrader.active ? {name:"Baro Ki'Teer",detail:`At ${w.voidTrader.location || 'a relay'}`} : {name:"Baro Ki'Teer",detail:plausibleExpiry(w.voidTrader.activation) ? 'Returns in' : 'Return time unavailable',expiry:plausibleExpiry(w.voidTrader.activation) ? w.voidTrader.activation : null})
  ].filter(Boolean).slice(0,3);
  return `<div class="panel"><div class="section-title"><div><h2>Live in the Origin System</h2><small>Public PC world state · ${state.world?.lastSyncAt ? `updated ${escapeHtml(new Date(state.world.lastSyncAt).toLocaleString())}` : 'sync to load'}</small></div></div><div class="list world-list">${activities.length ? activities.map(row => row.expiry ? itemWithCountdown(row.name,row.detail,row.expiry,row.suffix) : item(row.name,row.detail)).join('') : '<p class="muted">Sync to see current activities.</p>'}</div><button class="secondary-action" data-open-live>Open Live</button></div>`;
}

function bindLiveShortcut() {
  document.querySelectorAll('[data-open-live]').forEach(button => button.onclick = () => $("nav").querySelector('[data-page="live"]').click());
}

function goalPanel() {
  const goal = state.goal;
  const image = goal && Object.values(catalogIndex()).find(entry => entry.name?.toLocaleLowerCase() === goal.name.toLocaleLowerCase());
  const chart = TennoProgression.chart(profile()?.progression?.missions,catalogIndex());
  const recorded = new Set(chart.planets.flatMap(planet => planet.nodes.filter(node => node.completed).map(node => `${node.name}, ${planet.name}`.toLocaleLowerCase())));
  return `<div class="panel"><div class="section-title"><div><h2>Pinned farming goal</h2><small>WFCD public drop tables · your chosen item</small></div></div>
    <form id="goalForm" class="goal-form"><label for="goalName">Blueprint, part, or mod name</label><div><input id="goalName" type="search" list="goalSuggestions" maxlength="120" minlength="2" required placeholder="e.g. Vitality" value="${escapeHtml(goal?.name || '')}"><button type="submit">Find sources</button></div><datalist id="goalSuggestions"></datalist></form>
    ${goal ? `<div class="goal-title">${itemImage(image)}<div><b>${escapeHtml(goal.name)}</b><small>Checked ${escapeHtml(new Date(goal.checkedAt).toLocaleString())}${goal.partial ? ' · some tables unavailable' : ''}</small></div><button id="clearGoal" type="button" class="quiet-action">Clear</button></div>
    <div class="list">${goal.sources?.length ? goal.sources.map(row => item(row.source,`${row.detail}${row.chance == null ? '' : ` · ${row.chance}% listed chance`}${recorded.has(row.source.toLocaleLowerCase()) ? ' · completion recorded in profile' : ''}`)).join('') : '<p class="muted">No exact match in the checked tables. Try a specific part or blueprint name.</p>'}</div>
    <p class="muted">Drop chances describe the listed reward table. Enemy table chances are conditional on an item or mod drop. Your ownership and access are not checked.</p>` : '<p class="muted">Pin a goal to see published mission, enemy, or relic sources. This does not check ownership.</p>'}
    <p id="goalStatus" class="muted" role="status"></p></div>`;
}

function bindGoalActions() {
  const suggestions = $("goalSuggestions");
  $("goalName").oninput = () => {
    const query = $("goalName").value.trim().toLocaleLowerCase();
    if (query.length < 2) { suggestions.replaceChildren(); return; }
    const names = [...new Set(Object.values(catalogIndex())
      .filter(entry => ['blueprints','parts','mods'].includes(entry.category) && entry.name?.toLocaleLowerCase().includes(query))
      .map(entry => entry.name))].slice(0,15);
    suggestions.replaceChildren(...names.map(name => {
      const option = document.createElement('option');
      option.value = name;
      return option;
    }));
  };
  $("goalForm").onsubmit = async event => {
    event.preventDefault();
    const name = $("goalName").value.trim();
    if (name.length < 2) return;
    $("goalStatus").textContent = 'Checking WFCD drop tables…';
    const button = $("goalForm").querySelector('button');
    button.disabled = true;
    try {
      const result = await chrome.runtime.sendMessage({type:'FIND_GOAL_SOURCES',name});
      if (!result?.ok) throw new Error(result?.error || 'Drop lookup failed.');
      state.goal = result.goal;
      renderLive();
    } catch (error) {
      $("goalStatus").textContent = error.message;
      button.disabled = false;
    }
  };
  if ($("clearGoal")) $("clearGoal").onclick = async () => {
    const result = await chrome.runtime.sendMessage({type:'CLEAR_GOAL'});
    if (!result?.ok) { $("goalStatus").textContent = result?.error || 'Could not clear goal.'; return; }
    state.goal = null;
    renderLive();
  };
}

function renderLive() {
  const w = world();

  if (!w) {
    $("live").innerHTML = `<div class="panel"><p class="muted">Live data not loaded yet. Refresh to sync PC world state.</p></div>${goalPanel()}`;
    bindGoalActions();
    return;
  }

  const activeFissures = (w.fissures || []).filter(entry => !entry.expired && plausibleExpiry(entry.expiry,48));
  const normalFissures = activeFissures.filter(entry => !entry.isHard && !entry.isStorm);
  const hardFissures = activeFissures.filter(entry => entry.isHard && !entry.isStorm);
  const storms = activeFissures.filter(entry => entry.isStorm);
  const baro = w.voidTrader;
  const eventRows = (w.events || []).filter(event => !event.expired).map(event =>
    liveRow(event.description || event.name || 'Event',[event.tooltip,event.node ? displayWorldNode(event.node) : ''],event.expiry,21*24,{system:worldLocationSystem(event.node)}));
  const alertRows = (w.alerts || []).filter(alert => !alert.expired && plausibleExpiry(alert.expiry,48)).map(alert =>
    liveRow(alert.mission?.type || 'Alert',[alert.mission?.node || alert.node ? displayWorldNode(alert.mission?.node || alert.node) : '',alert.mission?.reward?.asString || alert.mission?.reward?.itemString,alert.mission?.faction],alert.expiry,48,{system:worldLocationSystem(alert.mission?.node || alert.node)}));
  const incursionMissions = w.steelPath?.incursions?.missions;
  const incursionRows = Array.isArray(incursionMissions) ? incursionMissions.map((mission,index) => liveMission(mission,`Incursion ${index+1}`)) : [];
  if (w.steelPath?.incursions?.expiry) incursionRows.unshift(liveRow('Daily reset',['Steel Path incursions'],w.steelPath.incursions.expiry,48));
  const challengeRows = (w.nightwave?.activeChallenges || []).filter(challenge => challenge.title || challenge.description).map(challenge =>
    liveRow(challenge.title || challenge.description || 'Challenge',[challenge.reputation ? `${challenge.reputation} standing` : '',challenge.isElite ? 'Elite' : ''],challenge.expiry,8*24));
  const invasionRows = (w.invasions || []).filter(invasion => !invasion.completed).map(invasion =>
    liveRow(displayWorldNode(invasion.node),[invasion.attacker?.reward?.asString,invasion.defender?.reward?.asString,invasion.desc],invasion.expiry,8*24,{system:worldLocationSystem(invasion.node)}));
  const newsRows = (w.news || []).slice(0,8).map(entry => item(entry.message || 'News',entry.date && Number.isFinite(new Date(entry.date).getTime()) ? new Date(entry.date).toLocaleDateString() : ''));
  const dealRows = (w.dailyDeals || []).map(deal => liveRow(deal.item || 'Darvo deal',[
    deal.salePrice != null && Number.isFinite(Number(deal.salePrice)) ? `${deal.salePrice} Platinum` : '',
    deal.originalPrice != null && Number.isFinite(Number(deal.originalPrice)) ? `was ${deal.originalPrice}` : '',
    deal.sold != null && deal.total != null && Number.isFinite(Number(deal.sold)) && Number.isFinite(Number(deal.total)) ? `${deal.sold}/${deal.total} sold` : ''
  ],deal.expiry,48));

  $("live").innerHTML = `<div class="live-brief"><div><small>PUBLIC PC WORLD STATE</small><h2>Origin System now</h2><p>Explore current rotations and mission details. Account access and completion are checked in game.</p></div><span class="live-beacon" aria-hidden="true"></span></div>
    <div class="live-tools"><span>Fetched ${escapeHtml(state.world?.lastSyncAt ? new Date(state.world.lastSyncAt).toLocaleString() : 'at an unknown time')}</span><div><button type="button" data-live-expand="all">Expand all</button><button type="button" data-live-expand="none">Collapse all</button></div></div>
    ${liveGroup('World cycles',cycleRows(w),true)}
    ${liveGroup('Sortie',sortieRows(w.sortie),true)}
    ${liveGroup('Archon Hunt',sortieRows(w.archonHunt,8*24),true)}
    ${liveGroup('Current events',eventRows,true)}
    ${liveGroup('Alerts',alertRows,true)}
    ${liveGroup('Void fissures',normalFissures.map(entry => liveMission(entry,entry.tier || 'Fissure')),true)}
    ${liveGroup('Steel Path fissures',hardFissures.map(entry => liveMission(entry,entry.tier || 'Fissure')))}
    ${liveGroup('Void storms',storms.map(entry => liveMission(entry,entry.tier || 'Storm')))}
    ${liveGroup('Vendors & weekly',[
      baro?.active ? liveRow("Baro Ki'Teer",[`At ${baro.location || 'a relay'}`],baro.expiry,4*24,{system:worldLocationSystem(baro.location)}) : plausibleExpiry(baro?.activation) ? liveRow("Baro Ki'Teer",[`Returns at ${baro.location || 'a relay'}`],baro.activation,21*24,{system:worldLocationSystem(baro.location)}) : item("Baro Ki'Teer","Return time unavailable"),
      item('Steel Path weekly offering',w.steelPath?.currentReward?.name || 'Unavailable'),
      w.duviriCycle?.choices?.length ? item('Circuit choices',w.duviriCycle.choices.map(choice => liveText(choice.category, ...(choice.choices || []))).join(' · ')) : '',
      item('Nightwave challenges',w.nightwave?.activeChallenges?.length != null ? `${w.nightwave.activeChallenges.length} active` : 'Unavailable')
    ].filter(Boolean),true)}
    ${liveGroup('Steel Path incursions',incursionRows)}
    ${liveGroup('Nightwave challenges',challengeRows)}
    ${liveGroup('Arbitration',w.arbitration && (plausibleExpiry(w.arbitration.expiry,2) || w.arbitration.missionType) ? [liveMission(w.arbitration,w.arbitration.missionType || 'Current mission')] : [])}
    ${liveGroup('Invasions',invasionRows)}
    ${liveGroup("Darvo's deal",dealRows)}
    ${liveGroup('News',newsRows)}
    ${goalPanel()}`;
  bindGoalActions();
  bindLiveActions();
}

function populatePrompts() {
  $("promptSelect").innerHTML = "";

  const list =
    typeof PROMPTS !== "undefined" && PROMPTS.length
      ? PROMPTS
      : [prompt];

  list.forEach((entry, index) => {
    const option = document.createElement("option");
    option.value = entry.id || String(index);
    option.textContent = entry.title || `Prompt ${index + 1}`;
    $("promptSelect").appendChild(option);
  });

  prompt = list[0];
  $("promptDesc").textContent = prompt.description || "";
  renderPromptFields();

  $("promptSelect").onchange = event => {
    prompt =
      list.find(entry => (entry.id || "") === event.target.value) ||
      list[$("promptSelect").selectedIndex] ||
      list[0];

    $("promptDesc").textContent = prompt.description || "";
    renderPromptFields();
  };
  $("promptNotes").oninput = updatePromptPreview;
}

const promptFieldValues = new Map();

function renderPromptFields() {
  const container = $("promptFields");
  container.replaceChildren();
  for (const field of prompt.fields || []) {
    const label = document.createElement("label");
    label.textContent = field.label;
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 160;
    input.placeholder = field.placeholder;
    input.dataset.promptField = field.id;
    input.value = promptFieldValues.get(`${prompt.id}:${field.id}`) || "";
    input.oninput = () => {
      promptFieldValues.set(`${prompt.id}:${field.id}`, input.value);
      updatePromptPreview();
    };
    label.appendChild(input);
    container.appendChild(label);
  }
  updatePromptPreview();
}

function composedPrompt() {
  const values = Array.from($("promptFields").querySelectorAll("input"))
    .map(input => ({ label: input.parentElement.textContent.trim(), value: input.value.trim() }))
    .filter(entry => entry.value);
  const notes = $("promptNotes").value.trim();
  if (notes) values.push({ label: "Other preferences", value: notes });
  const request = values.length ? `\n\nMy specific request:\n${values.map(entry => `- ${entry.label}: ${entry.value}`).join("\n")}\n\nTreat these as my preferences and targets. If I ask for farming, address the named materials and quantities first.` : "";
  return `${prompt.prompt || ""}${request}\n\nCURRENT-GAME CHECK (requested ${new Date().toISOString().slice(0,10)}):\n${typeof PROMPT_FRESHNESS !== "undefined" ? PROMPT_FRESHNESS : "Verify current Warframe patch notes before recommending a build or farm."}`;
}

function updatePromptPreview() {
  $("promptPreview").textContent = composedPrompt();
}

function exportPackage() {
  const sections = {};
  const profileState = state?.profile;

  if ($("includeProfile").checked && profileState) {
    sections.playerProfile =
      format === "raw"
        ? structuredClone(profileState.raw)
        : format === "compact"
          ? structuredClone(profileState.compact)
          : structuredClone(profileState.recommended);
  }

  if ($("includeLive").checked && state?.world?.raw) {
    const w = state.world.raw;

    sections.liveWorldState = {
      fissures: w.fissures,
      invasions: w.invasions,
      sortie: w.sortie,
      nightwave: w.nightwave,
      voidTrader: w.voidTrader,
      arbitration: w.arbitration,
      archonHunt: w.archonHunt,
      steelPath: w.steelPath,
      cetusCycle: w.cetusCycle,
      vallisCycle: w.vallisCycle,
      cambionCycle: w.cambionCycle,
      events: w.events,
      alerts: w.alerts
    };
  }

  if (
    !$("includeStats").checked &&
    sections.playerProfile?.summary
  ) {
    delete sections.playerProfile.summary;
  }

  if (!$("includeStats").checked && sections.playerProfile) {
    delete sections.playerProfile.Stats;
    if (sections.playerProfile.arsenal) delete sections.playerProfile.arsenal.weaponStats;
  }
  return sections;
}

async function copy(text, message) {
  try {
    const result = await chrome.runtime.sendMessage({ type: "COPY_TEXT", text });
    if (!result?.ok) throw new Error(result?.error || "Clipboard write failed");
    $("copyFallback").hidden = true;
    showToast(message);
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch { /* Use manual fallback below. */ }
    field.remove();
    if (copied) {
      $("copyFallback").hidden = true;
      showToast(message);
      return;
    }
    $("copyFallbackText").value = text;
    $("copyFallback").hidden = false;
    $("copyFallbackText").focus();
    $("copyFallbackText").select();
    showToast("Clipboard blocked. Select the text below and press Ctrl+C.");
  }
}

$("selectCopyFallback").onclick = () => {
  $("copyFallbackText").focus();
  $("copyFallbackText").select();
};

function interfaceVisible() {
  return document.visibilityState !== 'hidden';
}

function setStartupLoading(active) {
  $("loadingVeil").hidden = !active;
}

function renderRefreshedState() {
  const activeId = document.activeElement?.id;
  const goalDraft = $("goalName")?.value;
  renderAll();
  if (goalDraft != null && $("goalName")) $("goalName").value = goalDraft;
  if (activeId && $(activeId)) $(activeId).focus({preventScroll:true});
}

async function syncActive(force = false, resources = {profile:true,world:true}) {
  if (activeSyncing || !interfaceVisible()) return;
  activeSyncing = true;
  $("syncAll").disabled = true;
  $("syncAll").classList.add("is-refreshing");
  $("status").textContent = "Refreshing profile and live events…";
  try {
    const response = await chrome.runtime.sendMessage({ type: "SYNC_ACTIVE", force, ...resources });
    if (!response?.ok) throw new Error(response?.error || "Sync failed. Try again.");
    const next = await chrome.runtime.sendMessage({ type: "GET_STATE" });
    if (!next?.ok) throw new Error(next?.error || "Could not load saved data. Reopen the extension.");
    const previousProfileSync = state.profile?.lastSyncAt;
    const previousWorldSync = state.world?.lastSyncAt;
    state = next.state || {};
    if (previousProfileSync !== state.profile?.lastSyncAt || previousWorldSync !== state.world?.lastSyncAt) renderRefreshedState();
    else updateSyncMeta();
    const failures = Object.entries(response.result || {}).filter(([,v]) => v?.error);
    $("status").textContent = failures.length ? failures.map(([key,v]) => `${key}: ${v.error}`).join(" · ") : "Profile and events up to date";
    nextAutoAttemptAt = failures.length ? Date.now() + 60_000 : 0;
  } catch (error) {
    $("status").textContent = error.message;
    nextAutoAttemptAt = Date.now() + 60_000;
  } finally {
    activeSyncing = false;
    $("syncAll").disabled = false;
    $("syncAll").classList.remove("is-refreshing");
  }
}

function autoRefreshIfDue() {
  if (!interfaceVisible() || activeSyncing || catalogSyncing || Date.now() < nextAutoAttemptAt) return;
  const due = section => !section?.nextAllowedSyncAt || Date.now() >= section.nextAllowedSyncAt;
  const resources = {profile:due(state.profile),world:due(state.world)};
  if (resources.profile || resources.world) void syncActive(false,resources);
}

function updateSyncMeta() {
  const lastSyncAt = state?.profile?.lastSyncAt;
  const syncAge = $("syncAge");
  const linkState = $("linkState");

  if (!lastSyncAt) {
    if (syncAge) syncAge.textContent = "No sync yet";
    if (linkState) linkState.textContent = "Awaiting profile sync";
    return;
  }

  const mins = Math.max(0, Math.floor((Date.now() - lastSyncAt) / 60000));
  if (syncAge) syncAge.textContent = mins < 1 ? "Synced just now" : `Synced ${mins}m ago`;
  if (linkState) linkState.textContent = "Saved profile snapshot";
}

function renderAll() {
  renderIdentity();
  renderHome();
  renderArsenal();
  renderProgress();
  renderChart();
  renderLive();
  updateSyncMeta();
}

function setActivePage(page) {
  document.body.dataset.page = page;
}

$("home").addEventListener("click", event => {
  if (event.target.closest?.("[data-open-ai]")) $("nav").querySelector('[data-page="ai"]').click();
});

document.querySelectorAll("#nav button").forEach(button => {
  button.onclick = () => {
    document
      .querySelectorAll("#nav button")
      .forEach(entry => { entry.classList.remove("active"); entry.removeAttribute("aria-current"); });

    document
      .querySelectorAll(".page")
      .forEach(entry => { entry.classList.remove("active"); entry.removeAttribute("aria-current"); });

    button.classList.add("active");
    button.setAttribute("aria-current", "page");
    $(button.dataset.page).classList.add("active");
    setActivePage(button.dataset.page);
  };
});

document.querySelectorAll(".format button").forEach(button => {
  button.onclick = () => {
    document
      .querySelectorAll(".format button")
      .forEach(entry => { entry.classList.remove("active"); entry.removeAttribute("aria-current"); });

    button.classList.add("active");
    format = button.dataset.format;
  };
});

$("syncAll").onclick = () => syncActive(true);

$("copyPrompt").onclick = () =>
  copy(composedPrompt(), "PROMPT COPIED");

$("copyProfile").onclick = () =>
  copy(
    JSON.stringify(
      exportPackage(),
      null,
      format === "compact" ? 0 : 2
    ),
    "PROFILE PACKAGE COPIED"
  );

$("copyBoth").onclick = () =>
  copy(
    `${composedPrompt()}

TENNO LINK DATA
===============

${JSON.stringify(
      exportPackage(),
      null,
      format === "compact" ? 0 : 2
    )}`,
    "AI PACKAGE COPIED"
  );

(async () => {
  const openedAt = Date.now();
  populatePrompts();

  const response = await chrome.runtime.sendMessage({
    type: "GET_STATE"
  });
  if (!response?.ok) throw new Error(response?.error || "Could not read saved profile. Reopen Tenno Link.");

  state = response.state || {};
  const quickOpen = returningOpen || Boolean(state.profile?.lastSyncAt);
  if (quickOpen) document.documentElement.classList.add('returning-open');
  setActivePage("home");
  renderAll();
  const countdownTimer = setInterval(() => { if (interfaceVisible()) { updateCountdowns(); updateSyncMeta(); } },1000);
  const refreshTimer = setInterval(autoRefreshIfDue,15000);
  document.addEventListener('visibilitychange',() => { if (interfaceVisible()) { updateCountdowns(); autoRefreshIfDue(); } });
  window.addEventListener('pagehide',() => { clearInterval(countdownTimer); clearInterval(refreshTimer); });
  if (quickOpen) {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 220 - (Date.now() - openedAt))));
    setStartupLoading(false);
  }
  if (interfaceVisible()) {
    await syncActive(false);
    if (!state.items?.index || state.items?.schemaVersion !== 5) await syncCatalog();
  }
  if (!quickOpen) setStartupLoading(false);
})().catch(error => {
  renderAll();
  $("status").textContent = error.message || "Could not open Tenno Link. Reopen the extension.";
  setStartupLoading(false);
});
