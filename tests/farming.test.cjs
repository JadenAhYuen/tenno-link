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
