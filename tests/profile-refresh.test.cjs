const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
let now=Date.parse('2026-10-04T10:00:00Z'),saved={},calls=0;
let reply={status:200,body:JSON.stringify({Results:[{DisplayName:'Synthetic Tenno',Missions:[]}],Stats:{}}),headers:{}};
class Clock extends Date { static now(){return now;} }
function worker() {
  const context=vm.createContext({console,Date:Clock,TextEncoder,crypto:webcrypto,importScripts(){},AbortSignal:{timeout:ms=>({timeout:ms})},
    fetch:async(url,options)=>{calls++;assert.equal(options.credentials,'omit');assert.equal(options.signal.timeout,20000);if(reply.error)throw Error('network');return {ok:reply.status===200,status:reply.status,text:async()=>reply.body,headers:{get:key=>reply.headers[key] || null}};},
    chrome:{cookies:{get:async()=>({value:'synthetic-profile-id'})},runtime:{onMessage:{addListener(){}}},storage:{local:{get:async()=>({tennoLinkState:structuredClone(saved)}),set:async data=>{saved=structuredClone(data.tennoLinkState);}}}}
  });
  for(const file of ['catalog.js','inventory.js','farming.js','cycles.js','live-timers.js','background.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
  return context;
}
(async()=>{
  let context=worker();
  assert.equal((await vm.runInContext('syncProfile(false)',context)).skipped,true);
  assert.equal(calls,0,'opening an empty panel cannot send profile requests');
  await vm.runInContext('Promise.all([syncProfile(true),syncProfile(true),syncProfile(true)])',context);
  assert.equal(calls,1,'concurrent manual refreshes join one request');
  assert.equal(saved.profileRequestHistory.length,1);
  const original=structuredClone(saved.profile.raw);
  await assert.rejects(vm.runInContext('syncProfile(true)',context),/paused/);
  assert.equal(calls,1,'manual refresh respects success interval');
  assert.equal((await vm.runInContext('syncProfile(false)',context)).cached,true);
  context=worker();
  await assert.rejects(vm.runInContext('syncProfile(true)',context),/paused/);
  assert.equal(calls,1,'cooldown survives worker restart');
  now+=16*60000;
  reply={status:429,headers:{'retry-after':'7200'},body:''};
  await assert.rejects(vm.runInContext('syncProfile(true)',context),/429/);
  assert.equal(saved.profile.nextAllowedSyncAt,now+7200*1000,'honors longer server Retry-After');
  assert.deepEqual(saved.profile.raw,original,'rate limit retains saved account data');
  const count=calls;
  await assert.rejects(vm.runInContext('syncProfile(true)',context),/paused/);
  await vm.runInContext('syncProfile(false)',context);
  assert.equal(calls,count,'rate limited profiles are not retried automatically or by Refresh');
  now+=7200*1000+1;
  reply={status:403,headers:{},body:''};
  await assert.rejects(vm.runInContext('syncProfile(true)',context),/403/);
  assert.equal(saved.profile.nextAllowedSyncAt,now+3600000);
  now+=3600001;
  reply={error:true};
  await assert.rejects(vm.runInContext('syncProfile(true)',context),/failed/);
  assert.equal(saved.profile.nextAllowedSyncAt,now+15*60000,'network failures reserve a durable interval');
  assert.equal(saved.profileRequestHistory.at(-1).status,'network-error');
  now+=16*60000;
  reply={status:200,headers:{},body:'{}'};
  await assert.rejects(vm.runInContext('syncProfile(true)',context),/invalid profile/);
  assert.deepEqual(saved.profile.raw,original,'invalid payload cannot replace profile');
  await assert.rejects(vm.runInContext('syncProfile(true)',context),/paused/);
  context.retryDate=new Date(now+120000).toUTCString();
  assert.equal(vm.runInContext('retryAfterMs(retryDate)',context),Date.parse(context.retryDate)-now);
  assert.equal(vm.runInContext("retryAfterMs('invalid')",context),0);
  assert.ok(!JSON.stringify(saved.profileRequestHistory).includes('synthetic-profile-id'),'diagnostics contain no player ID');
  console.log('profile-refresh.test.cjs: manual-only requests, deduplication, durable cooldowns, Retry-After and failure preservation passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
