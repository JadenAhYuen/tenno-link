const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('../catalog.js');
const {build,category,history} = globalThis.TennoCatalog;
assert.equal(category({category:'Primary',productCategory:'SentinelWeapons'}),'companionWeapons');
assert.equal(category({category:'Warframes',productCategory:'MechSuits'}),'necramechs');
assert.equal(category({category:'Misc',type:'Amp',productCategory:'Pistols'}),'amps');
assert.equal(category({category:'Mods',type:'Warframe Mod',productCategory:'Suits'}),'mods');
assert.equal(category({category:'Pets',type:'Pet Resource',productCategory:'Pistols'}),'parts');
assert.equal(category({category:'Misc',type:'Resource'}),'resources');
assert.equal(category({category:'Skins',productCategory:'Suits'}),'cosmetics');
assert.equal(category({category:'Arch-Gun'}),'archgun');
assert.equal(category({category:'Enemy'}),'enemies');
const entries=[{name:'Mag',uniqueName:'/Mag',category:'Warframes'}, {name:'Lato',uniqueName:'/Lato',category:'Secondary'}];
for(const wrapper of [entries,{items:entries},{data:entries},{payload:entries}]) assert.equal(Object.keys(build(wrapper)).length,2);
assert.equal(Object.keys(build({error:'bad response'})).length,0);
const rows=history({weaponStats:[{type:'/Mag',kills:12},{type:'/Hazard',kills:9}],xpInfo:[{ItemType:'/Mag',XP:100},{ItemType:'/Lato',XP:50}],primary:[{ItemType:'/Unknown'}]},build(entries));
assert.equal(rows.length,4);
assert.equal(rows.find(x=>x.path==='/Mag').xp,100);
assert.equal(rows.find(x=>x.path==='/Lato').category,'secondary');
assert.equal(rows.find(x=>x.path==='/Hazard').isEquipment,false);
assert.equal(rows.find(x=>x.path==='/Unknown').category,'primary');
assert.equal(rows.find(x=>x.path==='/Unknown').categorySource,'loadout');

if(process.argv[2]) {
  const index=build(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
  const context=vm.createContext({importScripts(){},chrome:{runtime:{onMessage:{addListener(){}}}}});
  for(const file of ['catalog.js','inventory.js','background.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context);
  for(const filename of process.argv.slice(3)) {
    context.input=JSON.parse(fs.readFileSync(filename,'utf8').replace(/^\uFEFF/,'')); context.index=index;
    const profile=vm.runInContext('normalizeProfile(input,index)',context);
    assert.equal(profile.inventory.items.length,0,'Public sample must not invent wallet or material balances');
    const records=history(profile.arsenal,index), grouped={};
    for(const row of records.filter(x=>x.isEquipment)) grouped[row.category]=(grouped[row.category]||0)+1;
    for(const [slot,cat] of Object.entries({warframes:'warframes',primary:'primary',secondary:'secondary',melee:'melee'})) {
      for(const x of profile.arsenal[slot]) assert.equal(records.find(r=>r.path===x.ItemType).category,cat);
    }
    console.log(`MR ${profile.identity.masteryRank}: ${JSON.stringify(grouped)}; balances correctly unavailable`);
  }
  console.log(`Live catalog indexed: ${Object.keys(index).length} items/components`);
}
console.log('catalog.test.cjs: metadata precedence, profile joins and sample coverage passed');
