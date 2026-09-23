// Capture local preview UI for README media. Requires Playwright and Pillow.
const {spawn, execFileSync} = require('node:child_process');
const {mkdtempSync, rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
const output = path.join(root,'docs','assets','screenshots');
const work = mkdtempSync(path.join(tmpdir(),'tenno-link-media-'));
const server = spawn(process.execPath,[path.join(root,'tests','preview.cjs')],{cwd:root,stdio:'ignore'});
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function ready() {
  for (let i=0;i<50;i++) {
    try { if ((await fetch('http://127.0.0.1:8765/popup.html')).ok) return; } catch {}
    await sleep(100);
  }
  throw new Error('Preview server did not start');
}
async function main() {
  await ready();
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:680,height:860},deviceScaleFactor:1,reducedMotion:'reduce'});
    await page.goto('http://127.0.0.1:8765/popup.html?overlay=1');
    await page.locator('#name').getByText('Preview Tenno').waitFor();
    const capture = async (scene,index) => {
      await page.screenshot({path:path.join(work,`${scene}-${String(index).padStart(2,'0')}.png`)});
    };
    await capture('overview',0);
    await page.locator('#home').evaluate(element => { element.scrollTop = 220; });
    await capture('overview',1);
    await page.locator('#home').evaluate(element => { element.scrollTop = 0; });
    await capture('overview',2);
    await page.locator('#nav button[data-page="chart"]').click();
    await page.locator('#chart').evaluate(element => { element.scrollTop = 225; });
    await capture('chart',0);
    await page.locator('#missionSearch').fill('cal');
    await capture('chart',1);
    await page.locator('#missionSearch').fill('caloris');
    await capture('chart',2);
    await page.locator('#onlyUnplayedMissions').check();
    await capture('chart',3);
    await page.locator('#missionSearch').fill('');
    await capture('chart',4);
    await page.locator('#onlyUnplayedMissions').uncheck();
    await capture('chart',5);
    await page.locator('#nav button[data-page="ai"]').click();
    await capture('export',0);
    await page.locator('.format button[data-format="compact"]').click();
    await capture('export',1);
    await page.locator('.format button[data-format="raw"]').click();
    await capture('export',2);
    execFileSync('python',[path.join(__dirname,'make-gifs.py'),work,output],{stdio:'inherit'});
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{server.kill();rmSync(work,{recursive:true,force:true});});
