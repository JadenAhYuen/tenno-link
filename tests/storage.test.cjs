const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let saved = {};
let writes = 0;
let onMessage;
const context = vm.createContext({importScripts(){},AbortSignal:{timeout:()=>undefined},fetch:async url=>({ok:true,json:async()=>({source:url})}),TennoFarming:{find:(name,datasets)=>[{source:'Test node',chance:10,detail:'Mission reward',kind:'mission'}]},TennoInventory:{build:()=>({items:[],availability:{materials:'unavailable'}}),readiness:()=>[]},chrome:{runtime:{onMessage:{addListener(listener){onMessage=listener;}}},storage:{local:{
  get:async()=>({tennoLinkState:structuredClone(saved)}),
  set:async value=>{ await new Promise(resolve=>setImmediate(resolve)); saved=structuredClone(value.tennoLinkState); writes++; }
}}}});
vm.runInContext(fs.readFileSync('background.js','utf8'),context);
(async()=>{
  await vm.runInContext('Promise.all([setStore({profile:{}}),setStore({world:{}}),setStore({items:{names:{test:"Test"}}})])',context);
  assert.deepEqual(Object.keys(saved).sort(),['items','profile','world']);
  assert.equal(saved.items.names.test,'Test');
  saved.profile = {raw:{Results:[{}],Stats:{}}};
  const writesBeforeRead = writes;
  const response = await new Promise(resolve=>onMessage({type:'GET_STATE'},null,resolve));
  assert.equal(response.ok,true);
  assert.ok(response.state.profile.normalized);
  assert.equal(writes,writesBeforeRead,'GET_STATE must not rewrite the saved profile');
  const found = await new Promise(resolve=>onMessage({type:'FIND_GOAL_SOURCES',name:'Vitality'},null,resolve));
  assert.equal(found.ok,true);
  assert.equal(saved.goal.name,'Vitality');
  assert.equal(saved.goal.sources[0].source,'Test node');
  assert.equal(saved.goal.partial,false);
  const cleared = await new Promise(resolve=>onMessage({type:'CLEAR_GOAL'},null,resolve));
  assert.equal(cleared.ok,true);
  assert.equal(saved.goal,null);
  console.log('storage.test.cjs: parallel writes preserve sections; GET_STATE reads without writing');
})().catch(error=>{console.error(error);process.exitCode=1;});
