// Local-only UI harness. Optionally pass a profile path; never copies it into the repo.
const http = require('node:http');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({chrome:{runtime:{onMessage:{addListener(){}}}},importScripts(){}});
for (const file of ['catalog.js','inventory.js','background.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
context.input = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/,'')) : {
  Results:[{DisplayName:'Preview Tenno',PlayerLevel:4,LoadOutInventory:{},Affiliations:[{Tag:'CetusSyndicate',Standing:250,Title:0}]}],
  Stats:{MissionsCompleted:80,TimePlayedSec:64594,CiphersSolved:60,Weapons:[{type:'/Lotus/Powersuits/Mag/Mag',equipTime:45448,kills:993},{type:'/Lotus/Weapons/TestRifle',equipTime:53652,kills:1243}]}
};
context.catalogPayload = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3],'utf8')) : [
  {name:'Mag',uniqueName:'/Lotus/Powersuits/Mag/Mag',category:'Warframes'},
  {name:'Test Rifle',uniqueName:'/Lotus/Weapons/TestRifle',category:'Primary'}
];
const index = vm.runInContext('TennoCatalog.build(catalogPayload)',context);
context.index = index;
const normalized = vm.runInContext('normalizeProfile(input,index)',context);
normalized.identity.displayName = 'Preview Tenno';
const state = {profile:{raw:{},normalized,recommended:normalized,compact:normalized,lastSyncAt:Date.now()},items:{index,schemaVersion:5,lastSyncAt:Date.now(),craftables:vm.runInContext('TennoInventory.compactCatalog(catalogPayload)',context)}};
http.createServer((req,res)=>{
  const url = new URL(req.url,'http://localhost');
  if (url.pathname === '/mock.js') {
    res.setHeader('Content-Type','text/javascript');
    const mockState = url.searchParams.has('empty') ? {} : url.searchParams.has('nocatalog') ? {...state,items:{}} : state;
    res.end(`window.chrome={runtime:{sendMessage:async message=>message.type==='GET_STATE'?{ok:true,state:${JSON.stringify(mockState)}}:message.type==='SYNC_ITEMS'?{ok:false,error:'Preview catalog refresh unavailable; saved catalog retained.'}:{ok:true,result:{profile:{error:'Preview only: sign in to warframe.com in the extension to sync.'}}}}};`);
    return;
  }
  const file = url.pathname === '/' ? 'popup.html' : url.pathname.slice(1);
  if (!['popup.html','popup.css','visual.css','popup.js','catalog.js','progression.js','inventory.js','insights.js','prompts.js','assets/tenno-link-logo.svg'].includes(file)) {res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/javascript');
  let body = fs.readFileSync(path.join(root,file),'utf8');
  if (file === 'popup.html') body = body.replace('<script src="prompts.js">',`<script src="/mock.js${url.searchParams.has('empty')?'?empty':url.searchParams.has('nocatalog')?'?nocatalog':''}"></script><script src="prompts.js">`);
  res.end(body);
}).listen(8765,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:8765'));
