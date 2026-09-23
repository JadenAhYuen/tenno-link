/* Public drop tables describe possible sources, never account ownership or access. */
const TennoFarming = (() => {
  const clean = value => String(value || '').trim();
  const same = (left, right) => clean(left).toLocaleLowerCase() === clean(right).toLocaleLowerCase();
  const probability = value => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100
    ? Number(value) : null;
  function find(name, datasets, limit = 20) {
    const goal = clean(name);
    if (!goal) return [];
    const matches = [];
    const add = (itemName, source, chance, detail = '', kind = 'other') => {
      if (same(itemName, goal)) matches.push({source, chance:probability(chance), detail, kind});
    };
    const missions = datasets.missions?.missionRewards || datasets.missions || {};
    for (const [planet, nodes] of Object.entries(missions)) {
      for (const [node, mission] of Object.entries(nodes || {})) {
        const rewards = mission?.rewards || {};
        for (const [rotation, entries] of Object.entries(Array.isArray(rewards) ? {Mission:rewards} : rewards)) {
          for (const entry of Array.isArray(entries) ? entries : []) {
            add(entry.itemName, `${node}, ${planet}`, entry.chance, rotation === 'Mission' ? 'Mission reward' : `Rotation ${rotation}`, 'mission');
          }
        }
      }
    }
    for (const row of datasets.blueprints?.blueprintLocations || []) {
      for (const enemy of row.enemies || []) {
        add(row.itemName, enemy.enemyName, enemy.chance, 'Enemy blueprint table; chance is conditional on an item drop', 'enemy');
      }
    }
    for (const row of datasets.mods?.modLocations || []) {
      for (const enemy of row.enemies || []) {
        add(row.modName, enemy.enemyName, enemy.chance, 'Enemy mod table; chance is conditional on a mod drop', 'enemy');
      }
    }
    for (const row of datasets.relics?.relics || []) {
      if (row.state && row.state !== 'Intact') continue;
      for (const reward of row.rewards || []) {
        add(reward.itemName, `${row.tier} ${row.relicName} Relic`, reward.chance, 'Intact relic reward', 'relic');
      }
    }
    const seen = new Set();
    return matches.filter(row => {
      const key = `${row.source}|${row.detail}|${row.chance}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a,b) => ({mission:0,relic:1,enemy:2}[a.kind] ?? 3) - ({mission:0,relic:1,enemy:2}[b.kind] ?? 3) || (b.chance ?? -1) - (a.chance ?? -1)).slice(0,limit);
  }
  return {find};
})();
