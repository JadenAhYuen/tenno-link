// Serialized by chrome.scripting: keep this function self-contained.
async function fillAIInput(provider, text, expectedOrigin) {
  if (location.origin !== expectedOrigin) return {ok:false,error:'AI website redirected. Paste the copied request after signing in.'};
  const selectors = {
    chatgpt:['#prompt-textarea','#mobile-composer-prompt','textarea[data-mobile-composer-prompt]','textarea[aria-label*="ChatGPT" i]'],
    claude:['.ProseMirror[contenteditable="true"]','[contenteditable="true"][role="textbox"]'],
    gemini:['rich-textarea .ql-editor[contenteditable="true"]','[contenteditable="true"][role="textbox"][aria-label*="Gemini" i]','textarea[aria-label*="Gemini" i]'],
    grok:['textarea[placeholder*="ask" i]','textarea[placeholder*="grok" i]','textarea[placeholder*="want to know" i]','[contenteditable="true"][role="textbox"]']
  };
  if (!Object.hasOwn(selectors,provider)) return {ok:false,error:'Unknown AI provider.'};
  const pause = ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const comparable = value=>String(value || '').replace(/\r\n/g,'\n').replace(/\n+/g,'\n').trim();
  const findInput = () => selectors[provider].flatMap(selector=>Array.from(document.querySelectorAll(selector)))
    .find(element=>{
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width>0 && rect.height>0 && style.visibility !== 'hidden' && style.display !== 'none'
        && !element.closest('[inert],[aria-hidden="true"]') && !element.disabled && !element.readOnly
        && element.getAttribute('aria-disabled') !== 'true'
        && (element.tagName === 'TEXTAREA' || element.isContentEditable);
    });
  const readInput = input=>input.tagName === 'TEXTAREA' ? input.value : input.innerText;
  const deadline = Date.now()+20000;
  while (Date.now()<deadline) {
    const input = findInput();
    if (input) {
      if (comparable(readInput(input))) return {ok:false,error:'The AI input already contains text. Your existing draft was kept; paste the copied request when ready.'};
      input.focus();
      // Focusing can hydrate or replace the composer. Never write into a detached node.
      await pause(200);
      if (!input.isConnected || findInput() !== input) continue;
      if (comparable(readInput(input))) return {ok:false,error:'The AI input already contains text. Your existing draft was kept; paste the copied request when ready.'};
      if (input.tagName === 'TEXTAREA') {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
        setter.call(input,text);
        input.dispatchEvent(new InputEvent('input',{bubbles:true,composed:true,inputType:'insertText',data:text}));
        input.dispatchEvent(new Event('change',{bubbles:true,composed:true}));
      } else {
        const quill = provider === 'gemini' ? input.closest('rich-textarea')?.__quill : null;
        if (quill && typeof quill.setText === 'function' && typeof quill.getText === 'function') {
          if (comparable(quill.getText())) return {ok:false,error:'The AI input already contains text. Your existing draft was kept; paste the copied request when ready.'};
          // Gemini owns a Quill document; update that document so Angular sees the change.
          quill.setText(text,'user');
          if (typeof quill.setSelection === 'function') quill.setSelection(text.length,0,'silent');
        } else {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(input);
          selection.removeAllRanges();
          selection.addRange(range);
          // Browser editing preserves rich-text editor state better than replacing innerHTML.
          if (!document.execCommand('insertText',false,text)) return {ok:false,error:'This editor does not accept automatic fill. Paste the copied request.'};
        }
      }
      await pause(700);
      const currentInput = findInput();
      if (!currentInput || !currentInput.isConnected) { await pause(250); continue; }
      const inserted = readInput(currentInput);
      // Rich-text editors expose extra newlines around empty paragraph blocks.
      // Compare all text while allowing equivalent runs of paragraph spacing.
      if (!comparable(inserted) && (!input.isConnected || currentInput !== input)) continue;
      if (comparable(inserted) !== comparable(text)) return {ok:false,error:'Could not verify the complete request. Review the input and use the clipboard copy if needed.'};
      return {ok:true};
    }
    await pause(250);
  }
  return {ok:false,error:'AI input not found. Sign in if needed, then paste the copied request.'};
}
