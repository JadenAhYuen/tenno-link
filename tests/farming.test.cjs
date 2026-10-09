const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('farming.js','utf8'),context);
const datasets = {
  missions:{missionRewards:{Earth:{Mantle:{rewards:[{itemName:'Vitality',chance:10.84}]},Lith:{rewards:{A:[{itemName:'Vitality',chance:8}],B:[{itemName:'Other',chance:20}]}}}}},
  blueprints:{blueprintLocations:[{itemName:'Ash Chassis Blueprint',enemies:[{enemyName:'Grineer Manic',chance:38.72}]}]},
  mods:{modLocations:[{modName:'Vitality',enemies:[{enemyName:'Enemy',chance:7}]}]},
  relics:{relics:[{tier:'Lith',relicName:'A1',state:'Intact',rewards:[{itemName:'Vitality',chance:11}]},{tier:'Lith',relicName:'A1',state:'Radiant',rewards:[{itemName:'Vitality',chance:21}]}]}
};
context.datasets=datasets;
const sources=vm.runInContext("TennoFarming.find(' vitality ',datasets)",context);
assert.equal(sources.length,4);
assert.equal(sources[0].source,'Mantle, Earth');
assert.equal(sources[2].source,'Lith A1 Relic');
assert.ok(sources.some(row=>row.detail==='Rotation A'));
assert.ok(!sources.some(row=>row.chance===21));
assert.equal(vm.runInContext("TennoFarming.find('missing',datasets).length",context),0);
assert.equal(vm.runInContext("TennoFarming.find('ash chassis blueprint',datasets)[0].source",context),'Grineer Manic');
console.log('farming.test.cjs: exact matches, rotations, relic state and conditional sources passed');

context.index={Gun:{name:'Test Gun',category:'primary',components:[{name:'Ash Chassis Blueprint',itemCount:1}],buildPrice:100},Material:{name:'Oxium',category:'resources'}};
const recipe=vm.runInContext("TennoFarming.acquisition('Test Gun',datasets,index)",context);
assert.equal(recipe.components[0].sources[0].source,'Grineer Manic');
assert.equal(recipe.entry.buildPrice,100);
context.expanded={all:{cetusBountyRewards:[{bountyLevel:'Cetus on Earth',rewards:{A:[{itemName:'100X Oxium',chance:20,stage:'Stage 1'}]}}],resourceByAvatar:[{source:'Oxium Osprey',items:[{item:'Oxium',chance:100}]}],syndicates:[{Vendor:[{item:'Oxium',place:'Vendor rank',standing:100}]}]}};
const resources=vm.runInContext("TennoFarming.find('Oxium',expanded)",context);
assert.equal(resources.length,3);
assert.ok(resources.some(row=>row.detail.includes('Stage 1')));
assert.equal(resources.find(row=>row.source==='Vendor rank').chance,null,'vendor purchase is not a drop chance');

const captured=JSON.parse(fs.readFileSync('tests/fixtures/farming-api-shapes.json','utf8'));
context.captured={all:captured,missions:captured.missionRewards,blueprints:captured,mods:captured,relics:captured};
const koumei=vm.runInContext("TennoFarming.find('Koumei Blueprint',captured)",context);
assert.ok(koumei.some(row=>row.source.includes('Saya') && row.chance>0),'Koumei real API source parses with keyed syndicate object');
context.malformed={all:{syndicates:{Vendor:[]},cetusBountyRewards:{},sortieRewards:{}},blueprints:{blueprintLocations:{}},mods:{modLocations:{}},relics:{relics:{}}};
assert.equal(vm.runInContext("TennoFarming.find('Koumei Blueprint',malformed).length",context),0,'unexpected optional sections do not crash lookups');
