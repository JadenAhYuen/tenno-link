const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('../insights.js');
const { career, equipment } = globalThis.TennoInsights;
assert.equal(career({missionsCompleted: 20, timePlayedSec: 7200}).missionsPerHour, 10);
assert.equal(career({missionsCompleted: 0, timePlayedSec: 3600}).missionsPerHour, 0);
assert.equal(career({missionsCompleted: 20, timePlayedSec: 0}).missionsPerHour, null);
assert.equal(career({ciphersSolved: 60}).cipherSuccess, null);
assert.equal(career({ciphersSolved: 60, ciphersFailed: 0}).cipherSuccess, 1);
assert.equal(career({ciphersSolved: 3, ciphersFailed: 1, cipherTime: 12}).cipherSeconds, 4);
assert.equal(career({timePlayedSec: Infinity}).missionsPerHour, null);
const rows = [{type:'/a/TestRifle',kills:0,equipTime:80},{type:'/b/Other',kills:12,equipTime:10}];
assert.equal(equipment(rows, {}, '', 'kills')[0].kills, 12);
assert.equal(equipment(rows, {'/a/TestRifle':'Braton'}, 'braton')[0].resolved, true);
assert.equal(equipment(rows, {}, '/a/').length, 1);
assert.equal(rows[0].name, undefined, 'Source data stays unchanged');
const context = vm.createContext({chrome:{runtime:{onMessage:{addListener(){}}}},importScripts(){}});
vm.runInContext(fs.readFileSync('inventory.js','utf8'), context);
vm.runInContext(fs.readFileSync('background.js','utf8'), context);
for (const filename of process.argv.slice(2)) {
  context.input = JSON.parse(fs.readFileSync(filename,'utf8').replace(/^\uFEFF/,''));
  const result = vm.runInContext('normalizeProfile(input)',context);
  assert.equal(result.summary.missionsCompleted, context.input.Stats.MissionsCompleted);
  assert.equal(result.summary.ciphersFailed, context.input.Stats.CiphersFailed ?? null);
  assert.equal(equipment(result.arsenal.weaponStats).length, context.input.Stats.Weapons.length);
  console.log(`Sample MR ${result.identity.masteryRank}: ${result.arsenal.weaponStats.length} equipment records; normalization passed`);
}
console.log('insights.test.js: all assertions passed');
