const $ = id => document.getElementById(id);
const isOverlay = typeof location !== 'undefined' && new URLSearchParams(location.search).get('overlay') === '1';
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
let missionQuery = "";
let onlyUnplayedMissions = false;
const categoryLabel = category => TennoCatalog.labels[category] || "Unclassified";
function catalogIndex() { return state.items?.index || {}; }
function itemImage(entry) {
  const name = entry?.imageName;
  return `<span class="item-art" aria-hidden="true"><span>◇</span>${typeof name === 'string' && name ? `<img src="https://cdn.warframestat.us/img/${escapeHtml(encodeURIComponent(name))}" alt="" width="56" height="56" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}</span>`;
}
function planetArt(name, order) {
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
  return `<img class="planet-art" alt="${escapeHtml(name)} planet illustration" src="data:image/svg+xml,${encodeURIComponent(svg)}">`;
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
    $("home").innerHTML = `<div class="panel empty"><h2>Your next mission starts here</h2><p>Sign in to <a href="https://www.warframe.com/" target="_blank" rel="noopener">warframe.com</a>, then use Synchronize profile above.</p><p class="muted">Explore your career, equipment and standing here. No AI upload needed.</p></div>${activityPanel()}`;
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

  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  return hours
    ? `${hours}h ${minutes}m`
    : `${minutes}m`;
}

function activityPanel() {
  const w = world();
  const now = Date.now();
  const fissure = (w?.fissures || []).filter(row => !row.expired && new Date(row.expiry).getTime() > now)
    .sort((a,b) => new Date(a.expiry) - new Date(b.expiry))[0];
  const alert = (w?.alerts || []).filter(row => !row.expired && new Date(row.expiry).getTime() > now)
    .sort((a,b) => new Date(a.expiry) - new Date(b.expiry))[0];
  const activities = [
    fissure && {name:`${fissure.tier || 'Void'} fissure`,detail:`${fissure.node || 'Node unknown'} · ${timeLeft(fissure.expiry)} left`},
    alert && {name:'Alert',detail:`${alert.mission?.node || alert.node || 'Node unknown'} · ${timeLeft(alert.expiry)} left`},
    w?.sortie && {name:'Sortie',detail:w.sortie.boss || w.sortie.faction || 'Active on PC'},
    w?.voidTrader && {name:"Baro Ki'Teer",detail:w.voidTrader.active ? `At ${w.voidTrader.location || 'a relay'}` : `Returns in ${timeLeft(w.voidTrader.activation)}`}
  ].filter(Boolean).slice(0,3);
  return `<div class="panel"><div class="section-title"><div><h2>Tonight in the Origin System</h2><small>Public PC world state · ${state.world?.lastSyncAt ? `updated ${escapeHtml(new Date(state.world.lastSyncAt).toLocaleString())}` : 'sync to load'}</small></div></div><div class="list">${activities.length ? activities.map(row => item(row.name,row.detail)).join('') : '<p class="muted">Sync to see current activities.</p>'}</div><button class="secondary-action" data-open-live>Open Live</button></div>`;
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
    $("live").innerHTML = `${goalPanel()}
      <div class="panel">
        <p class="muted">Live data not loaded yet. Press ↻ to sync.</p>
      </div>
    `;
    bindGoalActions();
    return;
  }

  const activeFissures = (w.fissures || []).filter(entry => !entry.expired && new Date(entry.expiry).getTime() > Date.now());
  const fissures = activeFissures.slice(0, 5);

  const sortie = w.sortie;
  const baro = w.voidTrader;

  $("live").innerHTML = `${goalPanel()}
    <p class="muted">PC world state · Last fetched ${escapeHtml(state.world?.lastSyncAt ? new Date(state.world.lastSyncAt).toLocaleString() : "at an unknown time")}. Sync to refresh.</p>
    <div class="panel">
      <div class="section-title">
        <span>VOID FISSURES</span>
        <small>${fissures.length} of ${activeFissures.length} active</small>
      </div>

      <div class="list">
        ${
          fissures
            .map(entry =>
              item(
                `${entry.tier || ""} • ${entry.node || "Unknown"}`,
                `${entry.missionType || ""} • ${timeLeft(entry.expiry)}`
              )
            )
            .join("") ||
          item("No fissures", "—")
        }
      </div>
    </div>

    <div class="panel" style="margin-top:8px">
      <div class="section-title">
        <span>LIMITED-TIME</span>
        <small>World state</small>
      </div>

      <div class="list">
        ${item(
          "Sortie",
          sortie?.boss || sortie?.faction || "Unavailable"
        )}
        ${item(
          "Nightwave",
          w.nightwave?.activeChallenges?.length != null
            ? `${w.nightwave.activeChallenges.length} active challenges`
            : "Unavailable"
        )}
        ${item(
          "Baro Ki'Teer",
          baro?.active
            ? `Active at ${baro.location || "Relay"}`
            : `Returns ${timeLeft(baro?.activation)}`
        )}
        ${item(
          "Arbitration",
          w.arbitration?.node || "Unavailable"
        )}
        ${item(
          "Archon Hunt",
          w.archonHunt?.boss ||
            w.archonHunt?.faction ||
            "Unavailable"
        )}
        ${item(
          "Steel Path",
          w.steelPath?.currentReward?.name || "Unavailable"
        )}
      </div>
    </div>
  `;
  bindGoalActions();
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

  $("promptSelect").onchange = event => {
    prompt =
      list.find(entry => (entry.id || "") === event.target.value) ||
      list[$("promptSelect").selectedIndex] ||
      list[0];

    $("promptDesc").textContent = prompt.description || "";
  };
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
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch { showToast("Could not copy. Allow clipboard access and try again."); }
}

async function syncAll() {
  $("syncAll").disabled = true;
  $("status").textContent = "Synchronizing profile and public data…";
  try {
    const response = await chrome.runtime.sendMessage({ type: "SYNC_ALL" });
    if (!response?.ok) throw new Error(response?.error || "Sync failed. Try again.");
    const next = await chrome.runtime.sendMessage({ type: "GET_STATE" });
    if (!next?.ok) throw new Error(next?.error || "Could not load saved data. Reopen the extension.");
    state = next.state || {};
    renderAll();
    const failures = Object.entries(response.result || {}).filter(([,v]) => v?.error);
    $("status").textContent = failures.length ? failures.map(([key,v]) => `${key}: ${v.error}`).join(" · ") : "Up to date · Stats are interpreted locally";
  } catch (error) {
    $("status").textContent = error.message;
  } finally {
    $("syncAll").disabled = false;
  }
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

$("syncAll").onclick = syncAll;

$("copyPrompt").onclick = () =>
  copy(prompt.prompt || "", "PROMPT COPIED");

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
    `${prompt.prompt || ""}

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
  populatePrompts();

  const response = await chrome.runtime.sendMessage({
    type: "GET_STATE"
  });
  if (!response?.ok) throw new Error(response?.error || "Could not read saved profile. Reopen Tenno Link.");

  state = response.state || {};
  setActivePage("home");
  renderAll();

  if (!state.items?.index || state.items?.schemaVersion !== 5) await syncCatalog();
  if (!state?.profile?.raw) await syncAll();
})().catch(error => {
  renderAll();
  $("status").textContent = error.message || "Could not open Tenno Link. Reopen the extension.";
});
