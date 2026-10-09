/* Public drop tables describe possible sources, never account ownership or access. */
const TennoFarming = (() => {
  const rows = value => Array.isArray(value) ? value.filter(row=>row && typeof row === 'object') : [];
  const clean = value => String(value || '').trim();
  const same = (left, right) => clean(left).toLocaleLowerCase() === clean(right).toLocaleLowerCase();
  const probability = value => value != null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100
    ? Number(value) : null;
  function find(name, datasets, limit = 20) {
    const goal = clean(name);
    if (!goal) return [];
    const matches = [];
    const add = (itemName, source, chance, detail = '', kind = 'other') => {
      if (same(itemName, goal) || same(clean(itemName).replace(/^[\d,]+X\s+/i,''),goal)) matches.push({source, chance:probability(chance), detail, kind});
    };
    const missions = datasets.missions?.missionRewards || datasets.missions || {};
    for (const [planet, nodes] of Object.entries(missions)) {
      for (const [node, mission] of Object.entries(nodes || {})) {
        const rewards = mission?.rewards || {};
        for (const [rotation, entries] of Object.entries(Array.isArray(rewards) ? {Mission:rewards} : rewards)) {
          for (const entry of rows(entries)) {
            add(entry.itemName, `${node}, ${planet}`, entry.chance, rotation === 'Mission' ? 'Mission reward' : `Rotation ${rotation}`, 'mission');
          }
        }
      }
    }
    for (const row of rows(datasets.blueprints?.blueprintLocations)) {
      for (const enemy of rows(row?.enemies)) {
        add(row.itemName, enemy.enemyName, enemy.chance, 'Enemy blueprint table; chance is conditional on an item drop', 'enemy');
      }
    }
    for (const row of rows(datasets.mods?.modLocations)) {
      for (const enemy of rows(row?.enemies)) {
        add(row.modName, enemy.enemyName, enemy.chance, 'Enemy mod table; chance is conditional on a mod drop', 'enemy');
      }
    }
    for (const row of rows(datasets.relics?.relics)) {
      if (row.state && row.state !== 'Intact') continue;
      for (const reward of rows(row?.rewards)) {
        add(reward.itemName, `${row.tier} ${row.relicName} Relic`, reward.chance, 'Intact relic reward', 'relic');
      }
    }
    const all=datasets.all || {};
    for (const field of ['cetusBountyRewards','solarisBountyRewards','deimosRewards','zarimanRewards','entratiLabRewards','hexRewards','keyRewards','transientRewards']) {
      for (const row of rows(all[field])) {
        const rewards=Array.isArray(row.rewards) ? {Reward:row.rewards} : row.rewards || {};
        for (const [rotation,entries] of Object.entries(rewards)) for (const entry of rows(entries)) add(entry.itemName,row.bountyLevel || row.keyName || row.objectiveName,entry.chance,[rotation === 'Reward' ? '' : `Rotation ${rotation}`,entry.rotation ? `Rotation ${entry.rotation}`:'',entry.stage].filter(Boolean).join(' · '),'other');
      }
    }
    for (const entry of rows(all.sortieRewards)) add(entry.itemName,'Sortie',entry.chance,'Daily reward','other');
    for (const field of ['resourceByAvatar','additionalItemByAvatar']) for (const row of rows(all[field])) for (const entry of rows(row?.items)) add(entry.item,row.source,entry.chance,'Listed source table; check the Wiki for its location','other');
    const syndicateGroups=Array.isArray(all.syndicates) ? all.syndicates : all.syndicates && typeof all.syndicates === 'object' ? [all.syndicates] : [];
    for (const group of syndicateGroups) for (const [vendor,entries] of Object.entries(group || {})) for (const entry of rows(entries)) add(entry.item,entry.place || vendor,null,[entry.standing != null ? `${entry.standing} Standing`:'',entry.cost != null ? `${entry.cost} Credits`:''].filter(Boolean).join(' · '),'other');
    const seen = new Set();
    return matches.filter(row => {
      const key = `${row.source}|${row.detail}|${row.chance}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a,b) => ({mission:0,relic:1,enemy:2}[a.kind] ?? 3) - ({mission:0,relic:1,enemy:2}[b.kind] ?? 3) || (b.chance ?? -1) - (a.chance ?? -1)).slice(0,limit);
  }
  function acquisition(name,datasets,index={}) {
    const entry=Object.values(index).find(row=>same(row.name,name));
    const components=rows(entry?.components).map(part=>({...part,sources:find(part.name,datasets)}));
    const sources=find(name,datasets);
    for (const drop of rows(entry?.drops)) if (typeof drop.location === 'string') sources.push({source:drop.location,detail:[drop.type,drop.rarity].filter(v=>typeof v === 'string').join(' · '),chance:null,kind:'other'});
    return {entry:entry || null,components,sources};
  }
  return {find,acquisition};
})();
