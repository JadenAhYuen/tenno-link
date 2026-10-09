const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
let handler,finishChime,failVoice=false; const played=[],loaded=[];
class MockAudio {
 constructor(path){this.path=path;}
 load(){loaded.push(this.path);queueMicrotask(()=>{if(failVoice && this.path.includes('-night')) this.onerror(); else this.oncanplaythrough();});}
 play(){played.push(this.path);if(this.path.endsWith('chime.wav'))finishChime=()=>this.onended();else queueMicrotask(()=>this.onended());return Promise.resolve();}
 pause(){}
}
const context=vm.createContext({Audio:MockAudio,setTimeout,clearTimeout,chrome:{runtime:{getURL:path=>path,onMessage:{addListener(fn){handler=fn;}}}}});
vm.runInContext(fs.readFileSync('cycles.js','utf8'),context);
vm.runInContext(fs.readFileSync('live-timers.js','utf8'),context);
vm.runInContext(fs.readFileSync('offscreen.js','utf8'),context);
(async()=>{
 let result;
 assert.equal(handler({target:'offscreen',type:'PLAY_CYCLE_VOICE',key:'cetusCycle',phase:'night',volume:0.5},null,value=>{result=value;}),true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(loaded[0].endsWith('cetusCycle-night.wav'),'voice preloads before the chime');
 assert.equal(played.length,1); assert.ok(played[0].endsWith('chime.wav'));
 finishChime(); await new Promise(resolve=>setImmediate(resolve));
 assert.equal(played.length,2); assert.ok(played[1].endsWith('cetusCycle-night.wav')); assert.equal(result.ok,true);
 played.length=0;
 handler({target:'offscreen',type:'PLAY_CYCLE_VOICE',key:'cetusCycle',phase:'night',chime:false},null,value=>{result=value;});
 await new Promise(resolve=>setImmediate(resolve)); assert.equal(played.length,1);
 played.length=0; failVoice=true;
 handler({target:'offscreen',type:'PLAY_CYCLE_VOICE',key:'cetusCycle',phase:'night',chime:true},null,value=>{result=value;});
 await new Promise(resolve=>setImmediate(resolve)); assert.equal(result.ok,false); assert.equal(played.length,0,'failed voice loads emit no bare chime');
 played.length=0;failVoice=false;
 handler({target:'offscreen',type:'PLAY_LIVE_TIMER_VOICE',key:'sortieReset',volume:0.4,chime:true},null,value=>{result=value;});
 await new Promise(resolve=>setImmediate(resolve));assert.ok(played[0].endsWith('chime.wav'));
 finishChime();await new Promise(resolve=>setImmediate(resolve));assert.ok(played[1].endsWith('event-sortieReset.wav'));assert.equal(result.ok,true);
 played.length=0;
 handler({target:'offscreen',type:'PLAY_LIVE_TIMER_VOICE',key:'unknown'},null,value=>{result=value;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(result.ok,false);assert.equal(played.length,0);
 const data=fs.readFileSync('assets/voice/cephalon/chime.wav');
 assert.equal(data.readUInt32LE(40)/data.readUInt32LE(28),2);
 console.log('cycle-audio.test.cjs: voice preload, chime sequencing and failure suppression passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
