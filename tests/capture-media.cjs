// Capture local preview UI for README media. Requires Playwright and Pillow.
const {spawn, execFileSync} = require('node:child_process');
const {mkdtempSync, rmSync, readFileSync, writeFileSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
const output = path.join(root,'docs','assets','screenshots');
const work = mkdtempSync(path.join(tmpdir(),'tenno-link-media-'));
const server = spawn(process.execPath,[path.join(root,'tests','preview.cjs')],{cwd:root,stdio:'ignore'});
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
const missionBannerOnly = process.argv.includes('--mission-banner');
const missionWebmOnly = process.argv.includes('--mission-webm');
const gifsOnly = process.argv.includes('--gifs');
const missionOnly = missionBannerOnly || missionWebmOnly;
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
    if (!missionOnly && !gifsOnly) {
      const website = await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
      await website.goto('http://127.0.0.1:8765/site');
      await website.locator('#tenno-link-overlay-host').waitFor();
      await website.screenshot({path:path.join(output,'website-floating-button.png')});
      await website.close();
    }
    await page.goto('http://127.0.0.1:8765/popup.html?overlay=1');
    await page.locator('#name').getByText('Preview Tenno').waitFor();
    const capture = async (scene,index) => {
      await page.screenshot({path:path.join(work,`${scene}-${String(index).padStart(2,'0')}.png`)});
    };
    if (!missionOnly) {
    await capture('overview',0);
    await page.locator('#home').evaluate(element => { element.scrollTop = 220; });
    await capture('overview',1);
    await page.locator('#home').evaluate(element => { element.scrollTop = 0; });
    await capture('overview',2);
    }
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
    if (!missionOnly) {
    await page.locator('#nav button[data-page="live"]').click();
    await page.locator('#live').evaluate(element => { element.scrollTop = 320; });
    await capture('live',0);
    await page.waitForTimeout(1100);
    await capture('live',1);
    await page.waitForTimeout(1100);
    await capture('live',2);
    await page.locator('#nav button[data-page="ai"]').click();
    await capture('export',0);
    await page.locator('#promptSelect').selectOption('farm');
    await capture('export',1);
    await page.locator('[data-prompt-field="materials"]').fill('Orokin Cells and Neurodes');
    await capture('export',2);
    await page.locator('[data-prompt-field="amount"]').fill('10 Orokin Cells, 5 Neurodes');
    await capture('export',3);
    await page.locator('.prompt-preview summary').click();
    await page.locator('#ai').evaluate(element => { element.scrollTop = 300; });
    await capture('export',4);
    }
    execFileSync(process.env.TENNO_PYTHON || 'python',[path.join(__dirname,'make-gifs.py'),work,output,...(missionWebmOnly ? ['--webm-frames'] : missionBannerOnly ? ['--mission-banner'] : [])],{stdio:'inherit'});
    if (missionWebmOnly) {
      const frames = [0,1].map(i => readFileSync(path.join(work,`mission-banner-${i}.png`)).toString('base64'));
      const encoder = await browser.newPage();
      const video = await encoder.evaluate(async frames => {
        const canvas = document.createElement('canvas');
        canvas.width = 1100;
        canvas.height = 360;
        const context = canvas.getContext('2d');
        const pictures = await Promise.all(frames.map(base64 => new Promise((resolve,reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = `data:image/png;base64,${base64}`;
        })));
        const mimeType = ['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(type => MediaRecorder.isTypeSupported(type));
        if (!mimeType) throw new Error('This Chrome build cannot encode WebM');
        const recorder = new MediaRecorder(canvas.captureStream(30),{mimeType,videoBitsPerSecond:1500000});
        const chunks = [];
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        const finished = new Promise((resolve,reject) => {
          recorder.onstop = resolve;
          recorder.onerror = reject;
        });
        recorder.start();
        for (const picture of pictures) {
          const redraw = setInterval(() => context.drawImage(picture,0,0),33);
          context.drawImage(picture,0,0);
          await new Promise(resolve => setTimeout(resolve,1700));
          clearInterval(redraw);
        }
        recorder.stop();
        await finished;
        const blob = new Blob(chunks,{type:mimeType});
        return await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      },frames);
      writeFileSync(path.join(output,'mission-filter-banner.webm'),Buffer.from(video,'base64'));
      await encoder.close();
    }
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{server.kill();rmSync(work,{recursive:true,force:true});});
