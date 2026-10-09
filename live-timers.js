/* Low-frequency public Live activity alerts. No player-completion assumptions. */
(function(root) {
  const definitions = [
  {
    "key": "baroArrival",
    "name": "Baro Ki'Teer arrives",
    "help": "Hear when a new visit begins. Relay details appear in the desktop alert."
  },
  {
    "key": "baroDeparture",
    "name": "Baro leaves in 30 minutes",
    "help": "One reminder near the end of his visit."
  },
  {
    "key": "sortieReset",
    "name": "New daily Sortie",
    "help": "Hear when a new Sortie rotation is confirmed by the API."
  },
  {
    "key": "archonReset",
    "name": "New weekly Archon Hunt",
    "help": "Hear when a new Archon Hunt rotation is available."
  },
  {
    "key": "incursionReset",
    "name": "Steel Path incursions refresh",
    "help": "Hear when the daily incursion timer rolls over."
  },
  {
    "key": "nightwaveReset",
    "name": "Nightwave weekly challenges refresh",
    "help": "Tracks weekly Acts, rather than the Nightwave season timer."
  }
];
  const keys=new Set(definitions.map(row=>row.key));
  function selected(preferences) { return Object.fromEntries(definitions.map(row=>[row.key,preferences?.[row.key] === true])); }
  function windowFor(value,now,maxDays) {
    const activation=Date.parse(value?.activation),expiry=Date.parse(value?.expiry);
    if (!Number.isFinite(activation) || !Number.isFinite(expiry) || activation >= expiry || expiry <= now ||
        expiry-now > maxDays*86400000 || expiry-activation > maxDays*86400000) return null;
    return {activation,expiry};
  }
  function snapshot(world,now=Date.now()) {
    const result={};
    const baro=windowFor(world?.voidTrader,now,30);
    if (baro && typeof world.voidTrader.active === 'boolean') {
      const visit={...baro,active:world.voidTrader.active && baro.activation <= now,observedAt:now,
        location:typeof world.voidTrader.location === 'string' ? world.voidTrader.location.slice(0,120) : 'a relay'};
      result.baroArrival=visit; result.baroDeparture=visit;
    }
    for (const [key,value,days] of [['sortieReset',world?.sortie,2],['archonReset',world?.archonHunt,8],['incursionReset',world?.steelPath?.incursions,2]]) {
      const timer=windowFor(value,now,days);
      if (timer && timer.activation <= now) result[key]={...timer,observedAt:now};
    }
    const weekly=(Array.isArray(world?.nightwave?.activeChallenges) ? world.nightwave.activeChallenges : []).filter(row=>row.isDaily === false)
      .map(row=>windowFor(row,now,8)).filter(row=>row && row.activation <= now);
    if (weekly.length) {
      const activation=Math.max(...weekly.map(row=>row.activation));
      const expiry=Math.min(...weekly.filter(row=>row.activation === activation).map(row=>row.expiry));
      result.nightwaveReset={activation,expiry,observedAt:now};
    }
    return result;
  }
  function merge(previous,current) {
    const merged={};
    for (const {key} of definitions) {
      const before=previous?.[key],after=current[key];
      if (before) merged[key]=before;
      if (after && (!before || after.activation > before.activation || (after.activation === before.activation && after.expiry >= before.expiry))) merged[key]=(key.startsWith('baro') && before && after.activation === before.activation) ? {...after,active:before.active || after.active} : after;
    }
    return merged;
  }
  function changes(previous,current,now=Date.now()) {
    const result=[];
    for (const definition of definitions) {
      const {key,name}=definition,before=previous?.[key],after=current[key];
      if (!before || !after || after.activation < before.activation) continue;
      let trigger,message;
      if (key === 'baroArrival') {
        if (after.active && (!before.active || after.activation > before.activation)) {
          trigger=after.activation; message=`Baro Ki'Teer has arrived at ${after.location}.`;
        }
      } else if (key === 'baroDeparture') {
        const warning=after.expiry-30*60000;
        if (after.active && after.activation === before.activation && after.expiry === before.expiry &&
            before.observedAt < warning && now >= warning) {
          trigger=warning; message=`Baro Ki'Teer leaves ${after.location} in about ${Math.ceil((after.expiry-now)/60000)} minutes.`;
        }
      } else if (after.activation > before.activation && after.expiry > before.expiry && before.expiry <= now && after.activation >= before.expiry-60000) {
        trigger=after.activation; message=`${name}. Open Live for the current rotation.`;
      }
      if (Number.isFinite(trigger) && trigger <= now && now-trigger <= 5*60000) {
        result.push({key,name,phase:key === 'baroDeparture' ? 'Leaving soon':'Available',message,eventKey:`timer:${key}:${trigger}`});
      }
    }
    return result;
  }
  function clip(key) { return keys.has(key) ? `assets/voice/cephalon/event-${key}.wav` : null; }
  async function play(key,volume,chime) {
    const path=clip(key);
    if (!path) throw new Error('Unknown Live timer announcement');
    await root.TennoCycles.playClipTransmission(path,volume,chime);
  }
  root.TennoLiveTimers={definitions,selected,snapshot,merge,changes,clip,play};
})(globalThis);
