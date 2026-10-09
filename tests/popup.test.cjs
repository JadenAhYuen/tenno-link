const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const elements = new Map();
const handlers = {};
const countdownElements = [];
const element = id => {
  if (!elements.has(id)) elements.set(id,{value:'',checked:true,textContent:'',innerHTML:'',classList:{add(){},remove(){}},dataset:{},addEventListener(type,handler){this.listeners ||= {}; this.listeners[type]=handler;},setAttribute(){},insertAdjacentHTML(){},appendChild(){},replaceChildren(){},querySelector:()=>({disabled:false,focus(){}}),querySelectorAll:()=>[],focus(){},select(){},setSelectionRange(){}});
  return elements.get(id);
};
const context = vm.createContext({console,structuredClone,setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},
  document:{visibilityState:'visible',addEventListener(type,handler){handlers[type]=handler;},getElementById:element,querySelectorAll:selector=>selector==='[data-countdown]'?countdownElements:[],createElement:()=>({dataset:{},style:{},appendChild(){},setAttribute(){},select(){},remove(){}}),execCommand:()=>false,body:{dataset:{},appendChild(){}}},window:{addEventListener(){}},
  chrome:{runtime:{sendMessage:async()=>({ok:true,state:{}})}},navigator:{clipboard:{writeText:async()=>{}}}
});
for (const file of ['prompts.js','catalog.js','progression.js','inventory.js','insights.js','cycles.js','live-timers.js','popup.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context);
setImmediate(()=>{(async()=>{
  assert.ok(element('settings').innerHTML.includes('Cephalon announcements'));
  for (const phase of ['day','night','warm','cold','fass','vome','anger','envy','fear','sorrow','joy','grineer','corpus']) {
    const icon=vm.runInContext(`cycleStateIcon('${phase}')`,context);
    assert.ok(icon.includes(`cycle-${phase}`),`${phase} has vector artwork`);
    assert.ok(icon.includes('viewBox="0 0 24 24"'));
    const row=vm.runInContext(`liveRow('World',['${phase}'],null,12,{state:'${phase}'})`,context);
    assert.ok(row.includes('class="world-phase"'),'phase and icon wrap together');
  }

  assert.ok(element('settings').innerHTML.includes('Enable anyway'));
  assert.ok(element('settings').innerHTML.includes('Fortuna / Orb Vallis'));
  assert.ok(element('settings').innerHTML.includes('Necralisk / Cambion Drift'));
  assert.ok(element('settings').innerHTML.includes('Chrysalith on Zariman'));
  const toggle=element('notify-vallisCycle');
  toggle.dataset={cycleKey:'vallisCycle'}; toggle.checked=true;
  element('settings').listeners.change({target:toggle});
  assert.equal(toggle.checked,false,'unconfirmed access does not save or enable accidentally');
  assert.equal(element('access-warning-vallisCycle').hidden,false);
  toggle.dataset.accessOverride='true'; toggle.checked=true;
  element('settings').listeners.change({target:toggle});
  assert.equal(vm.runInContext('state.cycleNotifications.cycles.vallisCycle',context),true,'explicit override enables alert');
  assert.equal(element('access-warning-vallisCycle').hidden,true);

  assert.ok(element('settings').innerHTML.includes('Nightwave weekly challenges refresh'));
  assert.ok(element('settings').innerHTML.includes('Baro leaves in 30 minutes'));
  assert.ok(element('settings').innerHTML.includes('data-live-event-key'));
  assert.ok(element('settings').innerHTML.includes('Cambion Drift on Deimos'));
  assert.ok(!element('live').innerHTML.includes('cycleNotificationStatus'));
  assert.ok(!element('settings').innerHTML.includes('planet tones'));
  const failedImage = {hidden:false,matches:selector=>selector === '.item-art img'};
  handlers.error({target:failedImage});
  assert.equal(failedImage.hidden,true);
  const art = vm.runInContext(`itemImage({imageName:'x" onerror="bad.png'})`,context);
  assert.ok(art.includes('https://cdn.warframestat.us/img/x%22%20onerror%3D%22bad.png'));
  assert.ok(!art.includes(' onerror="'));
  vm.runInContext(`state={profile:{normalized:{identity:{displayName:'Test'},summary:{missionsCompleted:0},arsenal:{weaponStats:[{type:'<img src=x onerror=alert(1)>',equipTime:60}]},progression:{affiliations:[]}}}}; includeOtherCombat=true; renderAll();`,context);
  assert.ok(element('home').innerHTML.includes('Not reported'));
  assert.ok(element('home').innerHTML.includes('Live in the Origin System'));
  assert.ok(element('farming').innerHTML.includes('Search any item'));
  assert.ok(!element('live').innerHTML.includes('goalForm'));
  assert.match(vm.runInContext('timeLeft(new Date(Date.now()+61000).toISOString())',context),/^1m 0[0-2]s$/);
  assert.match(vm.runInContext('timeLeft(new Date(Date.now()+8*86400000).toISOString())',context),/^8d 0h$/);
  assert.equal(vm.runInContext('timeLeft(new Date(Date.now()+30*86400000).toISOString())',context),'time unavailable');
  assert.equal(vm.runInContext("displayWorldNode('SolNode000')",context),'Location unavailable');
  assert.ok(!vm.runInContext("itemWithOptionalCountdown('Arbitration','Location unavailable',new Date(Date.now()+100*365*86400000),2)",context).includes('data-countdown'));
  assert.ok(vm.runInContext('itemWithCountdown("Test", "Ends in ", new Date(Date.now()+60000).toISOString())',context).includes('data-countdown='));
  const ticking = {dataset:{countdown:new Date(Date.now()+3000).toISOString()},textContent:''};
  countdownElements.push(ticking);
  vm.runInContext('updateCountdowns()',context);
  assert.match(ticking.textContent,/^0m 0[1-3]s$/);
  element('goalName').value='Vitality';
  context.chrome.runtime.sendMessage=async message=>message.type==='FIND_GOAL_SOURCES'
    ? {ok:true,goal:{name:'Vitality',checkedAt:Date.now(),sources:[{source:'Mantle, Earth',detail:'Mission reward',chance:10.84}],partial:false}}
    : {ok:true,state:{}};
  await element('goalForm').onsubmit({preventDefault(){}});
  assert.ok(element('farming').innerHTML.includes('Mantle, Earth'));
  const acquisitionHtml=vm.runInContext(`goalAcquisition({name:'Test Gun',entry:{buildPrice:15000,buildTime:3600,description:'A test weapon'},components:[{name:'Test Gun Blueprint',itemCount:1,sources:[{source:'Ur, Uranus',detail:'Disruption reward',chance:1.25}]}]})`,context);
  assert.ok(acquisitionHtml.includes('Crafting recipe'));
  assert.ok(acquisitionHtml.includes('data-farm-item="Test Gun Blueprint"'));
  assert.ok(acquisitionHtml.includes('Ur, Uranus'));
  assert.ok(acquisitionHtml.includes('15,000 Credits'));

  vm.runInContext(`state.world={raw:{nightwave:{activeChallenges:Array(10),expiry:new Date(Date.now()+165*86400000).toISOString()},arbitration:{node:'SolNode000',expiry:new Date(Date.now()+100*365*86400000).toISOString()},steelPath:{currentReward:{name:'50,000 Kuva'}}},lastSyncAt:Date.now()}; renderLive();`,context);
  assert.ok(element('live').innerHTML.includes('Nightwave challenges'));
  assert.ok(element('live').innerHTML.includes('10 active'));
  assert.ok(!element('live').innerHTML.includes('ARBITRATION'));
  assert.ok(element('live').innerHTML.includes('Steel Path weekly offering'));
  assert.ok(!element('live').innerHTML.includes('SolNode000'));
  assert.ok(!element('live').innerHTML.includes('3949h'));
  assert.ok(!element('live').innerHTML.includes('2399502709h'));
  vm.runInContext(`state.world={raw:{
    cetusCycle:{isDay:false,expiry:new Date(Date.now()+900000).toISOString()},
    sortie:{boss:'General Sargas Ruk',expiry:new Date(Date.now()+21600000).toISOString(),variants:[{missionType:'Spy',node:'Pago, Kuva Fortress',modifier:'Energy Reduction'}]},
    fissures:[{tier:'Requiem',node:'Pago, Kuva Fortress',missionType:'Spy',enemy:'Grineer',minEnemyLevel:31,maxEnemyLevel:33,expiry:new Date(Date.now()+3600000).toISOString()},{tier:'Axi',node:'Adaro, Sedna',missionType:'Exterminate',isHard:true,expiry:new Date(Date.now()+3600000).toISOString()}],
    events:[{description:'Razorback Armada',expiry:new Date(Date.now()+86400000).toISOString()}],
    steelPath:{currentReward:{name:'50,000 Kuva'},incursions:{expiry:new Date(Date.now()+43200000).toISOString()}},
    dailyDeals:[{item:'Greater Vazarin Lens',salePrice:20,originalPrice:40,sold:0,total:50,expiry:new Date(Date.now()+3600000).toISOString()}]
  },lastSyncAt:Date.now()}; renderLive();`,context);
  assert.ok(element('live').innerHTML.includes('Cetus / Plains of Eidolon'));
  assert.ok(element('live').innerHTML.includes('Full phase: 50 minutes'));
  assert.ok(element('live').innerHTML.includes('Timing &amp; useful facts'));
  assert.ok(vm.runInContext("cycleInformation('cambionCycle','vome')",context).includes('Full phase: 50 minutes'));
  assert.ok(vm.runInContext("cycleInformation('vallisCycle','warm')",context).includes('6 minutes 40 seconds'));
  assert.ok(vm.runInContext("cycleInformation('zarimanCycle','corpus')",context).includes('2 hours 30 minutes'));
  assert.ok(vm.runInContext("cycleInformation('duviriCycle','sorrow')",context).includes('Next: fear'));
  assert.ok(!vm.runInContext("cycleInformation('cetusCycle',undefined)",context).includes('Next: undefined'));
  for (const title of ['World cycles','Sortie','Archon Hunt','Current events','Alerts','Void fissures','Steel Path fissures','Void storms','Vendors & weekly','Steel Path incursions','Nightwave challenges','Arbitration','Invasions',"Darvo's deal",'News']) {
    context.liveTitle=title;
    assert.ok(vm.runInContext('liveInformation(liveTitle)',context).includes('Read the guide'),title+' has helpful facts and a guide');
  }

  assert.equal(vm.runInContext('cycleRows({earthCycle:{state:"night",expiry:new Date(Date.now()+60000).toISOString()}}).length',context),0,'legacy Earth cycle is hidden');
  assert.ok(element('live').innerHTML.includes('cycle-night'));
  assert.ok(element('live').innerHTML.includes('alt="" aria-hidden="true"'));
  assert.equal(vm.runInContext("worldLocationSystem('Pago, Kuva Fortress')",context),'Kuva Fortress');
  assert.equal(vm.runInContext("worldLocationSystem('V Prime, Venus')",context),'Venus');
  assert.equal(vm.runInContext("worldLocationSystem('SolNode000')",context),null);
  assert.ok(vm.runInContext("cycleStateIcon('Day')",context).includes('cycle-day'));
  assert.ok(vm.runInContext("cycleStateIcon('Night')",context).includes('cycle-night'));
  assert.ok(element('live').innerHTML.includes('Energy Reduction'));
  assert.ok(element('live').innerHTML.includes('Razorback Armada'));
  assert.ok(element('live').innerHTML.includes('Steel Path fissures'));
  assert.ok(element('live').innerHTML.includes('Greater Vazarin Lens'));
  assert.ok(element('live').innerHTML.includes('data-live-expand="all"'));
  assert.ok(element('live').innerHTML.includes('class="live-chevron"'));
  assert.ok(element('live').innerHTML.includes('Timing &amp; useful facts'));
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
  element('promptFields').querySelectorAll=()=>[{parentElement:{textContent:'Materials or items to farm'},value:'Orokin Cells'}];
  element('promptNotes').value='Solo missions only';
  vm.runInContext("prompt=PROMPTS.find(entry=>entry.id==='farm'); updatePromptPreview()",context);
  const tailored=vm.runInContext('composedPrompt()',context);
  assert.ok(tailored.includes('Materials or items to farm: Orokin Cells'));
  assert.ok(tailored.includes('Other preferences: Solo missions only'));
  assert.ok(tailored.includes('https://www.warframe.com/en/patch-notes'));
  assert.ok(tailored.includes('https://wiki.warframe.com/'));
  assert.ok(tailored.includes('If you cannot browse or verify a claim'));
  assert.equal(element('promptPreview').textContent,vm.runInContext('combinedRequest()',context));
  assert.ok(element('promptPreview').textContent.includes('TENNO LINK DATA'));
  await vm.runInContext('draftWrite',context);
  vm.runInContext(`state.profile.recommended.identity={displayName:'Private Tenno',masteryRank:4};`,context);
  assert.equal(vm.runInContext('exportPackage().playerProfile.identity.displayName',context),undefined);
  assert.equal(vm.runInContext('exportPackage().playerProfile.identity.masteryRank',context),4);
  assert.equal(vm.runInContext('state.profile.recommended.identity.displayName',context),'Private Tenno');
  const calls=[];
  context.chrome.runtime.sendMessage=async message=>{
    calls.push(message);
    return message.type==='SYNC_ACTIVE' ? {ok:true,result:{profile:{cached:true},world:{cached:true}}} : {ok:true,state:{profile:{raw:{},lastSyncAt:1,nextAllowedSyncAt:Date.now()+300000},world:{raw:{},lastSyncAt:1,nextAllowedSyncAt:Date.now()+60000}}};
  };
  vm.runInContext("state.profile.nextAllowedSyncAt=0; document.visibilityState='hidden'; autoRefreshIfDue()",context);
  assert.equal(calls.length,0,'hidden interface must make no sync request');
  vm.runInContext("document.visibilityState='visible'; autoRefreshIfDue()",context);
  await new Promise(setImmediate);
  assert.equal(calls[0].type,'SYNC_ACTIVE');
  assert.equal(calls[0].force,false);
  assert.equal(calls[0].profile,false,'automatic polling never requests the player profile');
  assert.equal(calls[0].world,true);
  calls.length=0;
  vm.runInContext('state.profile.nextAllowedSyncAt=0; autoRefreshIfDue()',context);
  await new Promise(setImmediate);
  assert.equal(calls.length,0,'an expired profile alone cannot trigger automatic sync');
  vm.runInContext('state.world.nextAllowedSyncAt=0; autoRefreshIfDue()',context);
  await new Promise(setImmediate);
  assert.equal(calls[0].profile,false,'world refresh should not request a fresh profile');
  assert.equal(calls[0].world,true);
  calls.length=0;
  await element('syncAll').onclick();
  assert.equal(calls[0].type,'SYNC_ACTIVE');
  assert.equal(calls[0].force,true);
  assert.equal(element('loadingVeil').hidden,true,'loader should close after refresh');
  const popupHtml=fs.readFileSync('popup.html','utf8');
  assert.ok(popupHtml.includes('class="tenno-loader"'));
  assert.ok(popupHtml.includes('<section id="home" class="page active"'));
  assert.ok(popupHtml.includes('<section id="ai" class="page">'));
  assert.ok(popupHtml.includes('How AI Bridge works'));
  assert.ok(fs.readFileSync('content.js','utf8').includes("const popupUrl = chrome.runtime?.getURL?.('popup.html')"));
  context.chrome.runtime.sendMessage=async()=>({ok:true});
  await vm.runInContext("copy('extension copy', 'COPIED')",context);
  assert.equal(element('copyFallback').hidden,true,'extension copy should succeed without the frame Clipboard API');
  context.chrome.runtime.sendMessage=async()=>({ok:false,error:'Clipboard blocked'});
  context.document.execCommand=()=>true;
  await vm.runInContext("copy('example', 'COPIED')",context);
  assert.equal(element('copyFallback').hidden,true,'legacy copy should avoid the manual fallback');
  context.document.execCommand=()=>false;
  await vm.runInContext("copy('manual text', 'COPIED')",context);
  assert.equal(element('copyFallback').hidden,false,'manual fallback must appear when both copy methods fail');
  assert.equal(element('copyFallbackText').value,'manual text');
  assert.ok(popupHtml.indexOf('data-page="home"') < popupHtml.indexOf('data-page="ai"'));
  assert.ok(popupHtml.includes('class="profile-status"'));
  assert.ok(!popupHtml.includes('class="brand-subline"'));
  assert.ok(!fs.readFileSync('popup.js','utf8').includes('setLoading("sync"'));
  assert.ok(fs.readFileSync('content.js','utf8').includes('&returning=1'));
  console.log('popup.test.cjs: rendering, escaping and export isolation passed');
})().catch(error=>{console.error(error);process.exitCode=1;});});
