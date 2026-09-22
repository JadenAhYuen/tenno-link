const $ = id => document.getElementById(id);

let state = {};
let format = "recommended";
let prompt =
  typeof PROMPTS !== "undefined" && PROMPTS.length
    ? PROMPTS[0]
    : {
        title: "Progression Advisor",
        description: "Analyze my profile.",
        prompt: "Analyze my Warframe profile and recommend what to do next."
      };

function fmtHours(sec) {
  return sec == null ? "—" : `${Math.floor(sec / 3600)}h`;
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
      <small>${label}</small>
      <strong>${value ?? "—"}</strong>
    </div>
  `;
}

function item(label, value) {
  return `
    <div class="item">
      <b>${label}</b>
      <span>${value ?? "—"}</span>
    </div>
  `;
}

function profile() {
  return state?.profile?.normalized || null;
}

function world() {
  return state?.world?.raw || null;
}

function renderIdentity() {
  const p = profile();

  $("name").textContent = p?.identity?.displayName || "Tenno";
  $("mr").textContent = p?.identity?.masteryRank ?? "—";
}

function renderHome() {
  const p = profile();
  const summary = p?.summary || {};
  const arsenal = p?.arsenal || {};

  $("home").innerHTML = `
    <div class="stats-grid">
      ${card("MISSIONS", summary.missionsCompleted)}
      ${card("TIME PLAYED", fmtHours(summary.timePlayedSec))}
      ${card("WARFRAMES", arsenal.warframes?.length ?? 0)}
      ${card("PRIMARY", arsenal.primary?.length ?? 0)}
      ${card("SECONDARY", arsenal.secondary?.length ?? 0)}
      ${card("MELEE", arsenal.melee?.length ?? 0)}
    </div>

    <div class="panel" style="margin-top:8px">
      <div class="section-title">
        <span>CAREER SNAPSHOT</span>
        <small>Account profile</small>
      </div>

      <div class="list">
        ${item("Missions quit", summary.missionsQuit)}
        ${item("Deaths", summary.deaths)}
        ${item("Revives", summary.revives)}
        ${item("Ciphers solved", summary.ciphersSolved)}
      </div>
    </div>
  `;
}

function renderProgress() {
  const progression = profile()?.progression || {};

  $("progress").innerHTML = `
    <div class="stats-grid">
      ${card("MISSION RECORDS", progression.missions?.length ?? 0)}
      ${card("CHALLENGES", progression.challenges?.length ?? 0)}
      ${card("AFFILIATIONS", progression.affiliations?.length ?? 0)}
      ${card("OPERATOR LOADOUTS", progression.operatorLoadouts?.length ?? 0)}
      ${card("XP ENTRIES", profile()?.arsenal?.xpInfo?.length ?? 0)}
      ${card("DAILY FOCUS", progression.dailyFocus ?? 0)}
    </div>

    <div class="panel" style="margin-top:8px">
      <div class="section-title">
        <span>SYNDICATE DATA</span>
        <small>${progression.affiliations?.length ?? 0} records</small>
      </div>

      <div class="list">
        ${
          (progression.affiliations || [])
            .slice(0, 6)
            .map((entry, index) =>
              item(
                entry.Tag ||
                  entry.tag ||
                  entry.Name ||
                  `Affiliation ${index + 1}`,
                entry.Standing ??
                  entry.standing ??
                  entry.Level ??
                  "tracked"
              )
            )
            .join("") ||
          item(
            "No readable affiliation labels",
            "Raw data is still available to AI export"
          )
        }
      </div>
    </div>
  `;
}

function renderArsenal() {
  const arsenal = profile()?.arsenal || {};

  const topWeapons = (arsenal.weaponStats || [])
    .slice()
    .sort((a, b) => (b.equipTime || 0) - (a.equipTime || 0))
    .slice(0, 6);

  $("arsenal").innerHTML = `
    <div class="stats-grid">
      ${card("WARFRAMES", arsenal.warframes?.length ?? 0)}
      ${card("PRIMARY", arsenal.primary?.length ?? 0)}
      ${card("SECONDARY", arsenal.secondary?.length ?? 0)}
      ${card("MELEE", arsenal.melee?.length ?? 0)}
      ${card("XP ENTRIES", arsenal.xpInfo?.length ?? 0)}
      ${card("WEAPON STATS", arsenal.weaponStats?.length ?? 0)}
    </div>

    <div class="panel" style="margin-top:8px">
      <div class="section-title">
        <span>MOST USED WEAPONS</span>
        <small>By equip time</small>
      </div>

      <div class="list">
        ${
          topWeapons
            .map(weapon =>
              item(
                weapon.type || "Unknown weapon",
                `${Math.round((weapon.equipTime || 0) / 60)} min • ${weapon.kills || 0} kills`
              )
            )
            .join("") ||
          item("No weapon usage data", "—")
        }
      </div>
    </div>
  `;
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

function renderResources() {
  const w = world();

  const invasions = (w?.invasions || [])
    .filter(entry => !entry.completed)
    .slice(0, 6);

  $("resources").innerHTML = `
    <div class="panel">
      <div class="section-title">
        <span>RESOURCE OPPORTUNITIES</span>
        <small>Live rewards</small>
      </div>

      <p class="muted">
        The public profile endpoint does not currently expose a verified
        complete material inventory, so Tenno Link will not invent resource
        counts. This page surfaces real live reward opportunities instead.
      </p>

      <div class="list">
        ${
          invasions
            .map(entry =>
              item(entry.node || "Invasion", rewardText(entry))
            )
            .join("") ||
          item("No current invasion rewards loaded", "Refresh live data")
        }
      </div>
    </div>
  `;
}

function timeLeft(expiry) {
  if (!expiry) return "—";

  const ms = new Date(expiry).getTime() - Date.now();

  if (ms <= 0) return "expired";

  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  return hours
    ? `${hours}h ${minutes}m`
    : `${minutes}m`;
}

function renderLive() {
  const w = world();

  if (!w) {
    $("live").innerHTML = `
      <div class="panel">
        <p class="muted">Live data not loaded yet. Press ↻ to sync.</p>
      </div>
    `;
    return;
  }

  const fissures = (w.fissures || [])
    .filter(entry => !entry.expired)
    .slice(0, 5);

  const sortie = w.sortie;
  const baro = w.voidTrader;

  $("live").innerHTML = `
    <div class="panel">
      <div class="section-title">
        <span>VOID FISSURES</span>
        <small>${(w.fissures || []).length} active</small>
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
          w.steelPath?.currentReward?.name || "Available"
        )}
      </div>
    </div>
  `;
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
        ? profileState.raw
        : format === "compact"
          ? profileState.compact
          : profileState.recommended;
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

  return sections;
}

async function copy(text, message) {
  await navigator.clipboard.writeText(text);
  showToast(message);
}

async function syncAll() {
  $("status").textContent = "Synchronizing profile + world state…";

  const response = await chrome.runtime.sendMessage({
    type: "SYNC_ALL"
  });

  if (!response?.ok) {
    showToast(response?.error || "Sync failed");
    return;
  }

  const next = await chrome.runtime.sendMessage({
    type: "GET_STATE"
  });

  state = next?.state || {};

  renderAll();

  $("status").textContent =
    "Local-first • Unofficial passion project";
}

function renderAll() {
  renderIdentity();
  renderHome();
  renderProgress();
  renderArsenal();
  renderResources();
  renderLive();
}

document.querySelectorAll("#nav button").forEach(button => {
  button.onclick = () => {
    document
      .querySelectorAll("#nav button")
      .forEach(entry => entry.classList.remove("active"));

    document
      .querySelectorAll(".page")
      .forEach(entry => entry.classList.remove("active"));

    button.classList.add("active");
    $(button.dataset.page).classList.add("active");
  };
});

document.querySelectorAll(".format button").forEach(button => {
  button.onclick = () => {
    document
      .querySelectorAll(".format button")
      .forEach(entry => entry.classList.remove("active"));

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

  state = response?.state || {};
  renderAll();

  if (!state?.profile?.raw || !state?.world?.raw) {
    await syncAll();
  }
})();
