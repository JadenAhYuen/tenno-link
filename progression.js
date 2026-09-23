/* Completion evidence is not an authoritative account unlock list. */
(() => {
  function chart(missions = [], index = {}) {
    const completed = new Set();
    for (const row of missions) if (typeof row?.Tag === 'string' && Number.isFinite(Number(row.Completes)) && Number(row.Completes) > 0) completed.add(row.Tag);
    const groups = new Map();
    for (const [tag, node] of Object.entries(index)) {
      if (node.category !== 'nodes' || !node.systemName) continue;
      if (!groups.has(node.systemName)) groups.set(node.systemName, {name:node.systemName,order:node.systemIndex ?? 999,nodes:[],junctions:[]});
      groups.get(node.systemName).nodes.push({tag,name:node.name,completed:completed.has(tag),...
        Object.fromEntries(['missionType','missionName','factionIndex','minEnemyLevel','maxEnemyLevel','masteryReq','faction','tileset','questReqs','missionIndex','nodeType'].filter(key=>node[key] != null).map(key=>[key,node[key]]))});
    }
    const junctions = [];
    for (const tag of completed) {
      const match = /^([A-Za-z]+)To([A-Za-z]+)Junction$/.exec(tag);
      if (!match || !groups.has(match[1]) || !groups.has(match[2])) continue;
      const junction = {tag,from:match[1],to:match[2]};
      junctions.push(junction);
      groups.get(match[2]).junctions.push(junction);
    }
    const planets = [...groups.values()].sort((a,b) => a.order-b.order || a.name.localeCompare(b.name)).map(planet => ({...planet,
      nodes:planet.nodes.sort((a,b) => a.name.localeCompare(b.name)),
      completed:planet.nodes.filter(node => node.completed).length
    }));
    const matched = new Set(planets.flatMap(planet => planet.nodes.filter(node => node.completed).map(node => node.tag)));
    const junctionTags = new Set(junctions.map(row => row.tag));
    return {planets,junctions,completed:matched.size,total:planets.reduce((sum,p)=>sum+p.nodes.length,0),
      unmatched:[...completed].filter(tag=>!matched.has(tag) && !junctionTags.has(tag)).sort()};
  }
  globalThis.TennoProgression = {chart};
})();
