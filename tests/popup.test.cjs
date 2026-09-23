const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const elements = new Map();
const handlers = {};
const element = id => {
  if (!elements.has(id)) elements.set(id,{value:'',checked:true,textContent:'',innerHTML:'',classList:{add(){},remove(){}},addEventListener(){},insertAdjacentHTML(){},appendChild(){},replaceChildren(){},querySelector:()=>({disabled:false}),focus(){},setSelectionRange(){}});
  return elements.get(id);
};
const context = vm.createContext({console,structuredClone,setTimeout,clearTimeout,
  document:{addEventListener(type,handler){handlers[type]=handler;},getElementById:element,querySelectorAll:()=>[],createElement:()=>({}),body:{dataset:{}}},
  chrome:{runtime:{sendMessage:async()=>({ok:true,state:{}})}},navigator:{clipboard:{writeText:async()=>{}}}
});
for (const file of ['catalog.js','progression.js','inventory.js','insights.js','popup.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context);
setImmediate(()=>{(async()=>{
  const failedImage = {hidden:false,matches:selector=>selector === '.item-art img'};
  handlers.error({target:failedImage});
  assert.equal(failedImage.hidden,true);
  const art = vm.runInContext(`itemImage({imageName:'x" onerror="bad.png'})`,context);
  assert.ok(art.includes('https://cdn.warframestat.us/img/x%22%20onerror%3D%22bad.png'));
  assert.ok(!art.includes(' onerror="'));
  vm.runInContext(`state={profile:{normalized:{identity:{displayName:'Test'},summary:{missionsCompleted:0},arsenal:{weaponStats:[{type:'<img src=x onerror=alert(1)>',equipTime:60}]},progression:{affiliations:[]}}}}; includeOtherCombat=true; renderAll();`,context);
  assert.ok(element('home').innerHTML.includes('Not reported'));
  assert.ok(element('home').innerHTML.includes('Tonight in the Origin System'));
  assert.ok(element('live').innerHTML.includes('Pinned farming goal'));
  element('goalName').value='Vitality';
  context.chrome.runtime.sendMessage=async message=>message.type==='FIND_GOAL_SOURCES'
    ? {ok:true,goal:{name:'Vitality',checkedAt:Date.now(),sources:[{source:'Mantle, Earth',detail:'Mission reward',chance:10.84}],partial:false}}
    : {ok:true,state:{}};
  await element('goalForm').onsubmit({preventDefault(){}});
  assert.ok(element('live').innerHTML.includes('Mantle, Earth'));
  assert.ok(!element('home').innerHTML.includes('Cipher success'));
  const mission=vm.runInContext(`missionCard({name:'Apollodorus',missionType:'MT_SURVIVAL',minEnemyLevel:6,maxEnemyLevel:11,faction:'FC_GRINEER',tileset:'ShipTileset',masteryReq:5,questReqs:['ExampleQuest'],completed:true})`,context);
  assert.ok(mission.includes('Enemy level'));
  vm.runInContext(`state.items={index:{
    A:{category:'nodes',name:'Earth node',systemName:'Earth'},
    B:{category:'nodes',name:'Caloris',systemName:'Mercury'},
    C:{category:'nodes',name:'Kiliken',systemName:'Venus'}
  }}; state.profile.normalized.progression.missions=[
    {Tag:'A',Completes:1},
    {Tag:'EarthToMercuryJunction',Completes:1},{Tag:'EarthToVenusJunction',Completes:1}
  ];`,context);
  const suggestions=vm.runInContext('nextMissionPanel()',context);
  assert.ok(suggestions.includes('Mercury planet illustration'));
  assert.ok(suggestions.includes('Venus planet illustration'));
  assert.ok(!suggestions.includes('mission icon'));
  vm.runInContext('renderChart()',context);
  assert.ok(element('missionResults').innerHTML.includes('Caloris'));
  element('missionSearch').oninput({target:{value:'caloris'}});
  assert.ok(element('missionResults').innerHTML.includes('Caloris'));
  assert.ok(!element('missionResults').innerHTML.includes('Kiliken'));
  assert.equal(element('missionFilterCount').textContent,'1 of 3 nodes shown');
  element('onlyUnplayedMissions').onchange({target:{checked:true}});
  assert.ok(element('missionResults').innerHTML.includes('Caloris'));
  vm.runInContext("missionQuery='earth'; renderMissionResults(TennoProgression.chart(profile()?.progression?.missions,catalogIndex()))",context);
  assert.ok(!element('missionResults').innerHTML.includes('Earth node'));
  assert.ok(element('missionResults').innerHTML.includes('No nodes match'));
  for (const label of ['Faction','Location','Requirements']) assert.ok(!mission.includes(label));
  const html=fs.readFileSync('popup.html','utf8');
  assert.ok(!html.includes('data-page="resources"'));
  assert.ok(!html.includes('hero-decoration'));
  assert.ok(element('equipmentRows').innerHTML.includes('&lt;img'));
  assert.ok(!element('equipmentRows').innerHTML.includes('<img'));
  vm.runInContext(`state.profile.recommended={summary:{deaths:2},arsenal:{weaponStats:[{}]}};`,context);
  element('includeStats').checked=false;
  const exported=vm.runInContext('exportPackage()',context);
  assert.equal(exported.playerProfile.summary,undefined);
  assert.equal(exported.playerProfile.arsenal.weaponStats,undefined);
  assert.equal(vm.runInContext('state.profile.recommended.summary.deaths',context),2);
  console.log('popup.test.cjs: rendering, escaping and export isolation passed');
})().catch(error=>{console.error(error);process.exitCode=1;});});
