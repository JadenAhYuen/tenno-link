// Local fixtures only: provider authentication and production selectors need live checks.
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const vm = require('node:vm');
const {chromium} = require('playwright');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('ai-handoff.js','utf8'),context);
const fillSource = vm.runInContext('fillAIInput.toString()',context);
const server = spawn(process.execPath,['tests/preview.cjs'],{stdio:'ignore'});
(async()=>{
  let browser;
  try {
    for (let i=0;i<50;i++) { try { if ((await fetch('http://127.0.0.1:8765/')).ok) break; } catch {} await new Promise(resolve=>setTimeout(resolve,100)); }
    browser = await chromium.launch({channel:'chrome',headless:true});
    const page = await browser.newPage();
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:8765/');
    await page.waitForSelector('#loadingVeil[hidden]',{state:'attached'});
    for (const width of [760,320]) {
      await page.setViewportSize({width,height:900});
      await page.click('[data-page="ai"]');
      assert.equal(await page.locator('[data-ai-provider]').count(),4);
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('.provider-logo img')).every(image=>image.complete && image.naturalWidth>0));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
      await page.locator('.option-panel').filter({has:page.locator('.provider-buttons')}).screenshot({path:require('node:path').join(require('node:os').tmpdir(),`tenno-link-ai-providers-${width}.png`)});
    }
    await page.selectOption('#promptSelect','farm');
    await page.fill('[data-prompt-field="materials"]','Vitality');
    await page.fill('#promptNotes','Solo, no spoilers');
    await page.evaluate(()=>draftWrite);
    const draft = await page.evaluate(()=>state.bridgeDraft);
    await page.evaluate(draft=>restoreBridgeDraft(draft),draft);
    assert.equal(await page.inputValue('#promptNotes'),'Solo, no spoilers');
    await page.uncheck('#includeProfile');
    assert.ok(!(await page.locator('#promptPreview').textContent()).includes('"playerProfile"'));
    await page.evaluate(()=>{
      const original = chrome.runtime.sendMessage;
      window.providerCalls=[];
      chrome.permissions={request:async()=>true};
      chrome.runtime.sendMessage=async message=>{
        window.providerCalls.push(message);
        return ['COPY_TEXT','OPEN_AI_PROVIDER','SAVE_BRIDGE_DRAFT'].includes(message.type) ? {ok:true} : original(message);
      };
    });
    await page.click('[data-ai-provider="claude"]');
    await page.waitForFunction(()=>window.providerCalls.some(message=>message.type==='OPEN_AI_PROVIDER'));
    const handoff = await page.evaluate(()=>window.providerCalls.find(message=>message.type==='OPEN_AI_PROVIDER'));
    assert.equal(handoff.provider,'claude'); assert.equal(handoff.autofill,true);
    assert.ok(handoff.text.includes('Solo, no spoilers'));
    assert.ok(!handoff.text.includes('"playerProfile"'));
    await page.click('#clearDraft');
    assert.equal(await page.inputValue('#promptNotes'),'');
    assert.deepEqual(errors,[]);

    const fixtures = {chatgpt:'<div id="prompt-textarea" contenteditable="true"><p><br></p></div>',claude:'<div class="ProseMirror" contenteditable="true"><p><br></p></div>',gemini:'<rich-textarea><div class="ql-editor" contenteditable="true"><p><br></p></div></rich-textarea>',grok:'<textarea placeholder="Ask anything"></textarea>'};
    const payload = 'Farm Vitality\n\nSelected data: {"test":true}\n<script>unsafe</script>';
    for (const [provider,html] of Object.entries(fixtures)) {
      await page.setContent(`${html}<button id="send">Send</button><script>window.sent=0;document.getElementById('send').onclick=()=>window.sent++;</script>`);
      const result = await page.evaluate(async ({source,provider,text})=>await (0,eval)(`(${source})`)(provider,text,location.origin),{source:fillSource,provider,text:payload});
      assert.equal(result.ok,true,`${provider} insertion: ${JSON.stringify(result)}; ${await page.locator('textarea,[contenteditable]').first().evaluate(input=>JSON.stringify({text:input.innerText,value:input.value,html:input.innerHTML}))}`);
      assert.equal(await page.evaluate(()=>window.sent),0,'never submits');
      assert.equal(await page.locator('script').count(),1,'payload stays plain text');
      const existing = await page.evaluate(async ({source,provider})=>await (0,eval)(`(${source})`)(provider,'Replacement',location.origin),{source:fillSource,provider});
      assert.equal(existing.ok,false,'existing drafts preserved');
    }
    // Current ChatGPT composer differs from its historical ProseMirror input.
    await page.setContent('<textarea id="prompt-textarea" hidden></textarea><textarea id="mobile-composer-prompt" aria-label="Chat with ChatGPT"></textarea>');
    await page.evaluate(()=>{
      window.composerState='';
      document.querySelector('#mobile-composer-prompt').addEventListener('input',event=>{window.composerState=event.target.value;});
    });
    const mobile = await page.evaluate(async ({source,text})=>await (0,eval)(`(${source})`)('chatgpt',text,location.origin),{source:fillSource,text:payload});
    assert.equal(mobile.ok,true);
    assert.equal(await page.evaluate(()=>window.composerState),payload,'notify the controlled textarea');
    assert.equal(await page.inputValue('#prompt-textarea'),'','skip hidden legacy composers');

    // A focus-triggered hydration replaces the initial composer before insertion.
    await page.setContent('<textarea id="mobile-composer-prompt"></textarea>');
    await page.evaluate(()=>document.querySelector('textarea').addEventListener('focus',event=>{
      setTimeout(()=>{const replacement=document.createElement('textarea');replacement.id='mobile-composer-prompt';event.target.replaceWith(replacement);},50);
    },{once:true}));
    const hydrated = await page.evaluate(async ({source,text})=>await (0,eval)(`(${source})`)('chatgpt',text,location.origin),{source:fillSource,text:payload});
    assert.equal(hydrated.ok,true);
    assert.equal(await page.inputValue('#mobile-composer-prompt'),payload,'fill the replacement, not the detached composer');

    await page.setContent('<rich-textarea><div class="ql-clipboard" contenteditable="true"><p><br></p></div><div class="ql-editor" contenteditable="true" role="textbox" aria-label="Enter a prompt for Gemini"><p><br></p></div></rich-textarea>');
    await page.evaluate(()=>{
      const host=document.querySelector('rich-textarea');
      const editor=host.querySelector('.ql-editor');
      window.quillCalls=[];
      host.__quill={getText:()=>editor.innerText,setText:(value,source)=>{window.quillCalls.push(source);editor.innerText=value;},setSelection(){}};
    });
    const quill = await page.evaluate(async ({source,text})=>await (0,eval)(`(${source})`)('gemini',text,location.origin),{source:fillSource,text:payload});
    assert.equal(quill.ok,true);
    assert.deepEqual(await page.evaluate(()=>window.quillCalls),['user'],'update Gemini’s editor document');
    assert.equal((await page.locator('.ql-clipboard').innerText()).trim(),'','leave Quill’s clipboard helper untouched');

    const redirected = await page.evaluate(async source=>await (0,eval)(`(${source})`)('chatgpt','test','https://other.test'),fillSource);
    assert.equal(redirected.ok,false);
    await page.goto('http://127.0.0.1:8765/?empty');
    await page.waitForSelector('#loadingVeil[hidden]',{state:'attached'});
    await page.click('[data-try-sample]');
    assert.equal(await page.locator('#sampleNotice').isVisible(),true);
    await page.click('#exitSample');
    assert.equal(await page.locator('[data-try-sample]').isVisible(),true);
    console.log('bridge-browser.cjs: responsive UI, drafts, selected payload, sample mode and four provider input fixtures passed');
  } finally { if (browser) await browser.close(); server.kill(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
