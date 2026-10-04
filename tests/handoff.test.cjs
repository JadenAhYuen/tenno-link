const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let listener,updated,removed;
let permission=true;
const session={};
const opened=[],injections=[];
const context = vm.createContext({console,URL,importScripts(){},chrome:{
  runtime:{onMessage:{addListener(handler){listener=handler;}}},
  permissions:{contains:async()=>permission},
  tabs:{onUpdated:{addListener(handler){updated=handler;}},onRemoved:{addListener(handler){removed=handler;}},
    create:async options=>{opened.push(options);return {id:opened.length};},get:async()=>({status:'loading'})},
  scripting:{executeScript:async options=>{injections.push(options);return [{result:{ok:true}}];}},
  storage:{session:{get:async key=>({[key]:session[key]}),set:async values=>Object.assign(session,values),remove:async key=>{delete session[key];}}}
}});
vm.runInContext(fs.readFileSync('ai-handoff.js','utf8'),context);
vm.runInContext(fs.readFileSync('background.js','utf8'),context);
const message = input => new Promise(resolve=>listener(input,{},resolve));
(async()=>{
  permission=false;
  assert.equal((await message({type:'OPEN_AI_PROVIDER',provider:'claude',autofill:true,text:'private'})).ok,false);
  assert.equal(opened.length,0,'denied access must not create a fill tab');
  permission=true;
  assert.equal((await message({type:'OPEN_AI_PROVIDER',provider:'claude',autofill:true,text:'selected request'})).ok,true);
  assert.equal(session['aiHandoff:1'].text,'selected request');
  updated(1,{status:'complete'}); updated(1,{status:'complete'});
  await new Promise(setImmediate);
  assert.equal(session['aiHandoff:1'],undefined,'remove the payload before insertion');
  assert.equal(injections.length,2,'one fill and one status notification despite repeated load events');
  assert.deepEqual(Array.from(injections[0].args),['claude','selected request','https://claude.ai']);
  assert.equal(injections[0].target.tabId,1);
  assert.equal(injections[0].world,'ISOLATED','preserve Claude’s existing execution context');
  await message({type:'OPEN_AI_PROVIDER',provider:'gemini',autofill:true,text:'Gemini request'});
  updated(2,{status:'complete'}); await new Promise(setImmediate);
  assert.equal(injections[2].world,'MAIN','Gemini needs access to its page-owned editor');
  session['aiHandoff:2']={provider:'chatgpt',text:'expired',createdAt:Date.now()-121000};
  updated(2,{status:'complete'}); await new Promise(setImmediate);
  assert.equal(session['aiHandoff:2'],undefined);
  assert.equal(injections.length,4,'expired requests must not be filled');
  session['aiHandoff:3']={text:'closed'}; removed(3); await new Promise(setImmediate);
  assert.equal(session['aiHandoff:3'],undefined,'closing a tab removes its queued request');
  assert.equal((await message({type:'OPEN_AI_PROVIDER',provider:'toString',autofill:true,text:'bad'})).ok,false);
  console.log('handoff.test.cjs: provider allowlist, permission gating, single delivery, expiry and payload cleanup passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
