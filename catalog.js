/* WFCD identifiers are joined exactly; display-name/path guesses are not categories. */
(() => {
  const labels = {
    warframes: 'Warframes', primary: 'Primary', secondary: 'Secondary', melee: 'Melee',
    companions: 'Companions', companionWeapons: 'Companion weapons', archwing: 'Archwings',
    archgun: 'Archguns', archmelee: 'Archmelee', necramechs: 'Necramechs', amps: 'Amps',
    exalted: 'Exalted weapons', railjack: 'Railjack', resources: 'Materials', parts: 'Parts',
    blueprints: 'Blueprints', mods: 'Mods', arcanes: 'Arcanes', relics: 'Relics', gear: 'Gear',
    cosmetics: 'Cosmetics', quests: 'Quests', nodes: 'Mission nodes', enemies: 'Enemies', other: 'Other'
  };
  const equipmentCategories = ['warframes','primary','secondary','melee','companions','companionWeapons',
    'archwing','archgun','archmelee','necramechs','amps','exalted','railjack'];
  const products = { Suits:'warframes', LongGuns:'primary', Pistols:'secondary', Melee:'melee',
    KubrowPets:'companions', Sentinels:'companions', SentinelWeapons:'companionWeapons',
    SpaceSuits:'archwing', SpaceGuns:'archgun', SpaceMelee:'archmelee', MechSuits:'necramechs',
    OperatorAmps:'amps', CrewShipWeapons:'railjack' };
  function category(item) {
    const c = item.category, t = item.type || '';
    if (c === 'Mods' || /Mod$/.test(t)) return 'mods';
    if (c === 'Arcanes') return 'arcanes';
    if (['Skins','Glyphs','Sigils'].includes(c)) return 'cosmetics';
    if (c === 'Relics') return 'relics';
    if (c === 'Enemy') return 'enemies';
    if (c === 'Node') return 'nodes';
    if (c === 'Quests') return 'quests';
    if (t === 'Blueprint') return 'blueprints';
    if (t === 'Pet Resource' || /Component$/.test(t)) return 'parts';
    if (c === 'Resources' || c === 'Fish' || t === 'Resource' || t === 'Fish Part') return 'resources';
    if (t === 'Amp') return 'amps';
    if (t === 'Exalted Weapon') return 'exalted';
    if (item.sentinel === true) return 'companionWeapons';
    if (products[item.productCategory]) return products[item.productCategory];
    return {Warframes:'warframes',Primary:'primary',Secondary:'secondary',Melee:'melee',
      Archwing:'archwing','Arch-Gun':'archgun','Arch-Melee':'archmelee',Pets:'companions',
      Sentinels:'companions',Railjack:'railjack',Gear:'gear'}[c] || 'other';
  }
  function unwrap(payload) {
    if (Array.isArray(payload)) return payload;
    for (const key of ['items','payload','data']) if (Array.isArray(payload?.[key])) return payload[key];
    return [];
  }
  function build(payload) {
    const index = Object.create(null);
    const rows = unwrap(payload);
    for (const item of rows) {
      if (typeof item?.uniqueName !== 'string' || typeof item?.name !== 'string') continue;
      const itemCategory = category(item);
      const entry = {name:item.name,category:itemCategory,imageName:item.imageName || null};
      if (itemCategory === 'nodes' && typeof item.systemName === 'string') {
        Object.assign(entry, {
          systemName:item.systemName,systemIndex:item.systemIndex,missionIndex:item.missionIndex,nodeType:item.nodeType,
          missionType:item.missionType || null,missionName:item.missionName || null,
          minEnemyLevel:item.minEnemyLevel ?? null,maxEnemyLevel:item.maxEnemyLevel ?? null,
          masteryReq:item.masteryReq ?? null,faction:item.faction || null,factionIndex:item.factionIndex ?? null,tileset:item.tileset || null,
          questReqs:Array.isArray(item.questReqs) ? item.questReqs : []
        });
      } else if (equipmentCategories.includes(itemCategory)) {
        for (const key of ['description','masteryReq','totalDamage','damage','criticalChance','criticalMultiplier','procChance','fireRate','accuracy','magazineSize','reloadTime','health','shield','armor','sprintSpeed','polarities']) {
          if (item[key] != null) entry[key] = item[key];
        }
      }
      index[item.uniqueName] = entry;
    }
    // Recipe-only components (including blueprints) also need canonical names.
    for (const parent of rows) for (const part of parent.components || []) {
      if (!part?.uniqueName || !part.name || index[part.uniqueName]) continue;
      const blueprint = part.name === 'Blueprint';
      const genericPart = /^(Barrel|Receiver|Stock|Blade|Handle|Chassis|Neuroptics|Systems|Carapace|Cerebrum|Wings|Harness|Engines|String|Link|Guard|Hilt|Grip|Upper Limb|Lower Limb)$/i.test(part.name);
      const partCategory = category(part);
      index[part.uniqueName] = {name:blueprint ? `${parent.name} Blueprint` : genericPart ? `${parent.name} ${part.name}` : part.name,
        category:blueprint ? 'blueprints' : partCategory === 'other' ? 'parts' : partCategory,imageName:part.imageName || null};
    }
    return index;
  }
  function history(arsenal = {}, index = {}) {
    const rows = new Map();
    for (const row of arsenal.weaponStats || []) if (row?.type) rows.set(row.type, {...row});
    for (const row of arsenal.xpInfo || []) if (row?.ItemType) {
      const current = rows.get(row.ItemType) || {type:row.ItemType};
      rows.set(row.ItemType, {...current, xp:current.xp ?? row.XP, profileEvidence:true});
    }
    for (const [group, slot] of Object.entries({warframes:'warframes',primary:'primary',secondary:'secondary',melee:'melee'})) {
      for (const row of arsenal[group] || []) if (row?.ItemType) {
        rows.set(row.ItemType, {...(rows.get(row.ItemType) || {type:row.ItemType}),slotCategory:slot,profileEvidence:true});
      }
    }
    return Array.from(rows.values()).map(row => {
      const metadata = index[row.type];
      const cat = metadata?.category || row.slotCategory || 'other';
      return {...row, category:cat, categorySource:metadata ? 'catalog' : row.slotCategory ? 'loadout' : 'unknown',
        name:metadata?.name || row.type.split('/').pop().replace(/([a-z])([A-Z])/g,'$1 $2'),
        resolved:Boolean(metadata), path:row.type,
        isEquipment:equipmentCategories.includes(cat)};
    });
  }
  globalThis.TennoCatalog = {labels,equipmentCategories,category,unwrap,build,history};
})();
