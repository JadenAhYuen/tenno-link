/* Shared cycle definitions and original synthesized notification themes. */
(function(root) {
  const definitions = [
    ['cetusCycle','Cetus / Plains of Eidolon','Earth','night'],
    ['vallisCycle','Fortuna / Orb Vallis','Venus','cold'],
    ['cambionCycle','Necralisk / Cambion Drift','Deimos','vome'],
    ['duviriCycle','Duviri','Duviri','joy'],
    ['zarimanCycle','Chrysalith','Zariman','grineer']
  ].map(([key,name,planet,preview])=>({key,name,planet,preview,location:name === planet ? name : `${name} on ${planet}`}));
  const voices=Object.fromEntries(definitions.map(row=>[row.key,{preview:row.preview}]));
  const packPhases = {
    cetusCycle:['day','night'],vallisCycle:['warm','cold'],
    cambionCycle:['fass','vome'],duviriCycle:['anger','envy','fear','sorrow','joy'],zarimanCycle:['grineer','corpus']
  };
  function packClip(key,phase) {
    const normalized=typeof phase === 'string' ? phase.toLowerCase().trim() : '';
    return Object.hasOwn(packPhases,key) && packPhases[key].includes(normalized)
      ? `assets/voice/cephalon/${key}-${normalized}.wav` : null;
  }
  async function playVoice(key,phase,volume) {
    const path=packClip(key,phase);
    if (!path) throw new Error('No bundled voice clip for this phase');
    await playAudio(path,volume);
  }
  async function loadAudio(path,volume) {
    const audio=new Audio(chrome.runtime.getURL(path));
    audio.volume=preferences({volume}).volume;
    audio.preload='auto';
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>finish(new Error('Notification audio load timed out')),10000);
      function finish(error) {
        clearTimeout(timer); audio.oncanplaythrough=null; audio.onerror=null;
        if (error) reject(error); else resolve();
      }
      audio.oncanplaythrough=()=>finish();
      audio.onerror=()=>finish(new Error('Could not load notification audio'));
      audio.load();
    });
    return audio;
  }
  async function runAudio(audio) {
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>finish(new Error('Audio playback timed out')),15000);
      function finish(error) {
        clearTimeout(timeout); audio.pause(); audio.onended=null; audio.onerror=null;
        if (error) reject(error); else resolve();
      }
      audio.onended=()=>finish();
      audio.onerror=()=>finish(new Error('Could not play notification audio'));
      audio.play().catch(finish);
    });
  }
  async function playAudio(path,volume) { await runAudio(await loadAudio(path,volume)); }
  async function playTransmission(key,phase,volume,chime=true) {
    const path=packClip(key,phase);
    if (!path) throw new Error('No bundled voice clip for this phase');
    await playClipTransmission(path,volume,chime);
  }
  async function playClipTransmission(path,volume,chime=true) {
    // Load the voice before emitting any sound, so a missing clip cannot leave a bare chime.
    const voice=await loadAudio(path,volume);
    if (chime) await playAudio('assets/voice/cephalon/chime.wav',volume);
    await runAudio(voice);
  }
  function announcement(key,phase,volume) {
    const cycle=definitions.find(row=>row.key === key);
    if (!cycle) throw new Error('Unknown cycle');
    const text=typeof phase === 'string' ? phase.trim().slice(0,60) : '';
    if (!text || !/^[a-zA-Z -]+$/.test(text)) throw new Error('Invalid cycle phase');
    return {text:`Cycle changed at ${cycle.location} to ${text}.`,
      options:{lang:'en-US',pitch:1,rate:1,
        volume:preferences({volume}).volume,enqueue:true}};
  }
  function preferences(value) {
    return {enabled:value?.enabled === true,sound:value?.sound !== false,speech:value?.speech !== false,voicePack:'cephalon',
      events:Object.fromEntries(['baroArrival','baroDeparture','sortieReset','archonReset','incursionReset','nightwaveReset'].map(key=>[key,value?.events?.[key] === true])),
      volume:typeof value?.volume === 'number' && Number.isFinite(value.volume) ? Math.min(1,Math.max(0,value.volume)) : 0.5,
      cycles:Object.fromEntries(definitions.map(({key})=>[key,key === 'cetusCycle' ? (value?.cycles?.cetusCycle === true || value?.cycles?.earthCycle === true) : value?.cycles?.[key] === true]))};
  }
  // Sanity bounds follow current provider phase lengths, not locally calculated schedules.
  const maximumPhaseMs={cetusCycle:100*60000,vallisCycle:20*60000,cambionCycle:100*60000,duviriCycle:120*60000,zarimanCycle:150*60000};
  function snapshot(world,now=Date.now()) {
    const result = {};
    for (const {key} of definitions) {
      const cycle = world?.[key];
      const phase = cycle?.state || cycle?.active || (typeof cycle?.isDay === 'boolean' ? (cycle.isDay ? 'day':'night') : typeof cycle?.isWarm === 'boolean' ? (cycle.isWarm ? 'warm':'cold') : '');
      const expiry = Date.parse(cycle?.expiry || cycle?.next);
      const activation=Date.parse(cycle?.activation);
      const normalized=typeof phase === 'string' ? phase.trim().toLowerCase() : '';
      if (packPhases[key].includes(normalized) && Number.isFinite(expiry) && expiry > now && expiry-now <= maximumPhaseMs[key]+120000 &&
          (!Number.isFinite(activation) || (activation <= now && activation < expiry))) {
        result[key] = {phase:normalized,expiry,...(Number.isFinite(activation) ? {activation} : {})};
      }
    }
    return result;
  }
  function mergeSnapshot(previous,current,now=Date.now()) {
    const merged={};
    for (const {key} of definitions) {
      const before=previous?.[key],after=current[key];
      if (before) merged[key]=before;
      if (!after) continue;
      if (!before || (after.phase === before.phase && after.expiry >= before.expiry) ||
          (after.phase !== before.phase && after.expiry > before.expiry && before.expiry <= now)) merged[key]=after;
    }
    return merged;
  }
  function changes(previous,current,now=Date.now()) {
    return definitions.filter(({key})=>{
      const before=previous?.[key],after=current[key];
      if (!before || !after || after.expiry <= before.expiry || after.phase === before.phase) return false;
      // API corrections before the boundary and old transitions after sleep are silent.
      const started=after.activation ?? before.expiry;
      return before.expiry <= now && started <= now && now-started <= 5*60*1000;
    });
  }
  async function play(key,volume=0.5) {
    if (!definitions.some(row=>row.key === key)) throw new Error('Unknown cycle sound');
    await playAudio('assets/voice/cephalon/chime.wav',volume);
  }
  root.TennoCycles={definitions,voices,packClip,playVoice,playTransmission,playClipTransmission,announcement,preferences,snapshot,mergeSnapshot,changes,play};
})(globalThis);
