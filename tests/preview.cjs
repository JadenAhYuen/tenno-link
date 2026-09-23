// Local-only UI harness. Optionally pass a profile path; never copies it into the repo.
const http = require('node:http');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({chrome:{runtime:{onMessage:{addListener(){}}}},importScripts(){}});
for (const file of ['catalog.js','inventory.js','background.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
context.input = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/,'')) : {
  Results:[{DisplayName:'Preview Tenno',PlayerLevel:4,LoadOutInventory:{},Missions:[{Tag:'PreviewEarth',Completes:1},{Tag:'EarthToMercuryJunction',Completes:1},{Tag:'EarthToVenusJunction',Completes:1}],Affiliations:[{Tag:'CetusSyndicate',Standing:250,Title:0}]}],
  Stats:{MissionsCompleted:80,TimePlayedSec:64594,CiphersSolved:60,Weapons:[{type:'/Lotus/Powersuits/Mag/Mag',equipTime:45448,kills:993},{type:'/Lotus/Weapons/TestRifle',equipTime:53652,kills:1243}]}
};
context.catalogPayload = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3],'utf8')) : [
  {name:'Mag',uniqueName:'/Lotus/Powersuits/Mag/Mag',category:'Warframes'},
  {name:'Test Rifle',uniqueName:'/Lotus/Weapons/TestRifle',category:'Primary'},
  {name:'E Prime',uniqueName:'PreviewEarth',category:'Node',systemName:'Earth',systemIndex:0,missionType:'MT_EXTERMINATION',minEnemyLevel:1,maxEnemyLevel:3},
  ...['Caloris','Elion','Odin'].map((name,i)=>({name,uniqueName:`PreviewMercury${i}`,category:'Node',systemName:'Mercury',systemIndex:1,minEnemyLevel:6,maxEnemyLevel:11})),
  {name:'Kiliken',uniqueName:'PreviewVenus',category:'Node',systemName:'Venus',systemIndex:2,minEnemyLevel:3,maxEnemyLevel:7}
];
const index = vm.runInContext('TennoCatalog.build(catalogPayload)',context);
context.index = index;
const normalized = vm.runInContext('normalizeProfile(input,index)',context);
normalized.identity.displayName = 'Preview Tenno';
const previewNow = Date.now();
const state = {profile:{raw:{},normalized,recommended:normalized,compact:normalized,lastSyncAt:previewNow,nextAllowedSyncAt:previewNow+5*60*1000},world:{raw:{fissures:[{tier:'Lith',node:'E Prime, Earth',missionType:'Exterminate',expiry:new Date(previewNow+16*60*1000).toISOString()}],alerts:[{node:'Mercury',expiry:new Date(previewNow+8*60*1000).toISOString()}],sortie:{boss:'Preview sortie'},voidTrader:{active:false,activation:new Date(previewNow+3*60*60*1000).toISOString()}},lastSyncAt:previewNow,nextAllowedSyncAt:previewNow+60*1000},items:{index,schemaVersion:5,lastSyncAt:previewNow,craftables:vm.runInContext('TennoInventory.compactCatalog(catalogPayload)',context)}};
http.createServer((req,res)=>{
  const url = new URL(req.url,'http://localhost');
  if (url.pathname === '/mock.js') {
    res.setHeader('Content-Type','text/javascript');
    const mockState = url.searchParams.has('empty') ? {} : url.searchParams.has('nocatalog') ? {...state,items:{}} : state;
    res.end(`window.__previewState=${JSON.stringify(mockState)};window.chrome={runtime:{getURL:file=>location.origin+'/'+file,sendMessage:async message=>message.type==='GET_STATE'?{ok:true,state:window.__previewState}:message.type==='FIND_GOAL_SOURCES'?(window.__previewState.goal={name:message.name,checkedAt:Date.now(),sources:[{source:'Mantle, Earth',detail:'Mission reward',chance:10.84},{source:'Ani, Void',detail:'Rotation A',chance:7.14}],partial:false},{ok:true,goal:window.__previewState.goal}):message.type==='CLEAR_GOAL'?(window.__previewState.goal=null,{ok:true}):message.type==='SYNC_ACTIVE'?{ok:true,result:{profile:{cached:true},world:{cached:true}}}:message.type==='SYNC_ITEMS'?{ok:false,error:'Preview catalog refresh unavailable; saved catalog retained.'}:{ok:true,result:{profile:{error:'Preview only: sign in to warframe.com in the extension to sync.'}}}}};`);
    return;
  }
  if (url.pathname === '/site') {
    res.setHeader('Content-Type','text/html');
    res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Overlay preview</title><style>body{margin:0;min-height:120vh;background:linear-gradient(145deg,#161d28,#263c49);color:#f1f5f6;font:18px/1.5 system-ui}header{padding:22px 5vw;border-bottom:1px solid #ffffff30}main{max-width:900px;margin:10vh auto;padding:24px}h1{font-size:clamp(36px,8vw,70px);line-height:1.1}</style></head><body><header>Warframe page - Local overlay preview</header><main><h1>Your Tenno companion stays close.</h1><p>Open the floating button, move the panel, and inspect all six sections.</p></main><script src="/mock.js"></script><script src="/content.js"></script></body></html>');
    return;
  }
  const file = url.pathname === '/' ? 'popup.html' : url.pathname.slice(1);
  if (!['popup.html','popup.css','visual.css','overlay-mode.css','popup.js','catalog.js','progression.js','inventory.js','insights.js','prompts.js','assets/tenno-link-logo.svg','assets/tenno-link-logo-animated.svg','content.js'].includes(file)) {res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/javascript');
  let body = fs.readFileSync(path.join(root,file),'utf8');
  if (file === 'popup.html') body = body.replace('<script src="prompts.js">',`<script src="/mock.js${url.searchParams.has('empty')?'?empty':url.searchParams.has('nocatalog')?'?nocatalog':''}"></script><script src="prompts.js">`);
  res.end(body);
}).listen(8765,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:8765'));
