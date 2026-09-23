const assert=require('node:assert/strict');
require('../inventory.js');
const {build,compactCatalog,readiness}=globalThis.TennoInventory;
const publicProfile={Results:[{Affiliations:[{Standing:999},{Standing:-500}],DailyFocus:20000,
  LoadOutInventory:{XPInfo:[{ItemType:'/Lotus/Test',XP:100,Count:9}]},
  ChallengeProgress:[{Name:'Test',Count:100}]}],Stats:{Income:40000,Credits:450,Weapons:[{type:'/Lotus/Gun',Count:10}]},
  TechProjects:[{ItemType:'/Lotus/Resource',Count:15}],recipes:[{name:'Test',Credits:50000}]};
assert.equal(build(publicProfile).items.length,0);
const data={Credits:90,Results:[{Inventory:{Credits:0,PremiumCredits:25,Platinum:25,Resources:[
  {ItemType:'/Lotus/Cell',ItemCount:2},{ItemType:'/Lotus/Cell',ItemCount:3},
  {ItemType:'/Lotus/Negative',ItemCount:-1},{ItemType:'/Lotus/Empty',ItemCount:''},
  {ItemType:'/Lotus/Boolean',ItemCount:true},{ItemType:'/Lotus/Zero',ItemCount:0}
]}}]};
const inventory=build(data,{'/Lotus/Cell':{name:'Orokin Cell',category:'resources'}});
assert.equal(inventory.items.find(x=>x.name==='Credits').quantity,0,'Prefer explicit inventory balance without summing mirrored root');
assert.equal(inventory.items.filter(x=>x.name==='Platinum').length,1);
assert.equal(inventory.items.find(x=>x.name==='Platinum').quantity,25,'Do not add currency aliases');
assert.equal(inventory.items.find(x=>x.name==='Orokin Cell').quantity,5);
assert.equal(inventory.items.find(x=>x.uniqueName==='/Lotus/Zero').quantity,0);
assert.equal(inventory.items.length,4);
const recipes=compactCatalog([{name:'Empty',components:[{name:'Blueprint',itemCount:1}]},
  {name:'Invalid',components:[{name:'Orokin Cell',itemCount:0}]},
  {name:'Missing',components:[{name:'Unknown',itemCount:1}]}]);
assert.equal(readiness([],recipes).length,0,'Empty or unknown requirements must never be ready');
assert.equal(readiness(inventory.items,recipes).length,0);
assert.equal(build(publicProfile).availability.materials,'not-reported');
console.log('inventory-safety.test.cjs: false currency, invalid quantities and unknown recipe inputs rejected');
