// Browser check for on-demand loading of the floating interface.
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
const server = spawn(process.execPath,[path.join(root,'tests','preview.cjs')],{cwd:root,stdio:'ignore'});
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));

async function main() {
  for (let i=0;i<50;i++) {
    try { if ((await fetch('http://127.0.0.1:8765/site')).ok) break; } catch {}
    if (i===49) throw new Error('Preview server did not start');
    await sleep(100);
  }
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:800,height:700},reducedMotion:'reduce'});
    const popupLoads=[];
    page.on('request',request=>{if (request.url().includes('/popup.html')) popupLoads.push(request.url());});
    await page.goto('http://127.0.0.1:8765/site');
    await page.locator('#tenno-link-overlay-host').waitFor();
    assert.equal(popupLoads.length,0,'launcher alone must not load the interface');
    assert.ok(page.frames().every(frame=>!frame.url().includes('/popup.html')),'launcher alone must not load the interface frame');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForURL('http://127.0.0.1:8765/site');
    await page.waitForFunction(()=>document.querySelector('#tenno-link-overlay-host') != null);
    await page.waitForTimeout(300);
    assert.equal(popupLoads.length,1,'opening should load the interface once');
    const frame=page.frames().find(frame=>frame.url().includes('/popup.html?overlay=1'));
    assert.ok(frame);
    await page.setViewportSize({width:360,height:700});
    await frame.locator('#nav button[data-page="live"]').click();
    assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Live timers must fit a narrow viewport');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    assert.ok(page.frames().every(frame=>!frame.url().includes('/popup.html')),'closing should unload the interface');
    assert.equal(popupLoads.length,1,'closing should not trigger another load');
    await page.locator('#tenno-link-overlay-host').evaluate(host=>host.shadowRoot.getElementById('launcher').click());
    await page.waitForTimeout(100);
    assert.ok(page.frames().some(frame=>frame.url().includes('/popup.html?overlay=1&returning=1')),'reopening should use the quick loading treatment');
    await page.keyboard.press('Escape');
    console.log('overlay-lifecycle.cjs: launcher is idle; open loads and close unloads the interface');
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.kill());
