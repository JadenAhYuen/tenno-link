const assert = require('node:assert/strict');
const fs = require('node:fs');
require('../catalog.js');
require('../progression.js');
const index = TennoCatalog.build([
 {uniqueName:'A',name:'Alpha',category:'Node',systemName:'Earth',systemIndex:0},
 {uniqueName:'B',name:'Beta',category:'Node',systemName:'Venus',systemIndex:1},
 {uniqueName:'C',name:'Gamma',category:'Node',systemName:'Venus',systemIndex:1}
]);
const chart = TennoProgression.chart([{Tag:'A',Completes:1},{Tag:'A',Tier:1,Completes:2},{Tag:'B',Completes:0},{Tag:'C',Completes:-1},{Tag:'EarthToVenusJunction',Completes:1},{Tag:'EventNode',Completes:2},{Tag:'Bad',Completes:'no'}],index);
assert.equal(chart.completed,1);
assert.equal(chart.total,3);
assert.equal(chart.planets[1].completed,0);
assert.equal(chart.planets[1].junctions[0].from,'Earth');
assert.deepEqual(chart.unmatched,['EventNode']);
assert.equal(TennoProgression.chart([],{}).total,0);
if (process.argv[2]) {
 const live = TennoCatalog.build(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
 assert.ok(Object.values(live).some(n=>n.systemName==='Earth'));
 for (const file of process.argv.slice(3)) {
  const p=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
  const result=TennoProgression.chart(p.Results[0].Missions,live);
  assert.ok(result.completed>0 && result.completed<=result.total);
  console.log(JSON.stringify({rank:p.Results[0].PlayerLevel,nodes:result.completed,catalogNodes:result.total,junctions:result.junctions.length,otherRecords:result.unmatched.length}));
 }
}
console.log('progression.test.cjs: completion evidence, duplicate tiers, unknown nodes and junctions passed');
