// The website only receives a launcher and frame. Account data stays in the
// cross-origin extension frame and is never copied into the host page DOM.
(() => {
  if (document.getElementById('tenno-link-overlay-host')) return;

  const host = document.createElement('div');
  host.id = 'tenno-link-overlay-host';
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;';
  const shadow = host.attachShadow({mode:'closed'});
  const style = document.createElement('style');
  style.textContent = `
    *{box-sizing:border-box}
    #launcher,#panel{pointer-events:auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #launcher{position:fixed;right:22px;bottom:22px;display:flex;align-items:center;gap:10px;min-height:54px;padding:8px 17px 8px 10px;border:1px solid rgba(206,238,232,.52);border-radius:999px;color:#efffff;background:linear-gradient(135deg,rgba(47,82,92,.91),rgba(13,28,40,.9));box-shadow:inset 0 1px 0 rgba(255,255,255,.26),0 12px 32px rgba(2,12,22,.35),0 0 25px rgba(101,215,209,.18);backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%);font-size:13px;font-weight:750;letter-spacing:.02em;cursor:pointer;transition:transform .24s ease,box-shadow .24s ease,background .24s ease}
    #launcher{overflow:hidden;isolation:isolate}#launcher::before{content:"";position:absolute;inset:-60% -30%;z-index:-1;pointer-events:none;background:linear-gradient(110deg,transparent 35%,rgba(245,215,155,.08) 43%,rgba(255,229,170,.35) 49%,rgba(232,195,127,.12) 55%,transparent 63%);animation:tenno-metal 8s ease-in-out infinite}#launcher:hover{transform:translateY(-3px);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 17px 36px rgba(2,12,22,.44),0 0 30px rgba(101,215,209,.28)}
    #launcher:active{transform:translateY(1px)}
    #launcher[hidden],#panel[hidden]{display:none!important}
    .sigil{display:grid;place-items:center;width:36px;height:36px;flex:0 0 36px;border:1px solid rgba(232,207,157,.57);border-radius:50%;color:#e8d4ae;font-size:22px;line-height:1;box-shadow:inset 0 0 12px rgba(153,226,220,.19),0 0 14px rgba(153,226,220,.18);animation:tenno-glow 5s ease-in-out infinite}
    .sigil img{display:block;width:27px;height:27px;object-fit:contain}
    #panel{position:fixed;right:16px;bottom:16px;display:flex;flex-direction:column;width:min(680px,calc(100vw - 24px));height:min(760px,calc(100vh - 24px));min-height:260px;overflow:hidden;border:1px solid rgba(190,226,226,.43);border-radius:22px;background:rgba(13,27,38,.86);box-shadow:0 22px 60px rgba(0,8,17,.48),inset 0 1px 0 rgba(255,255,255,.22);backdrop-filter:blur(28px) saturate(150%);-webkit-backdrop-filter:blur(28px) saturate(150%);transform-origin:bottom right;animation:tenno-open .6s cubic-bezier(.16,1,.3,1) both}
    #handle{display:flex;align-items:center;gap:8px;min-height:43px;padding:5px 9px;border-bottom:1px solid rgba(177,225,223,.22);background:linear-gradient(100deg,rgba(64,116,121,.37),rgba(28,44,55,.48));color:#f0f7f4;touch-action:none;cursor:grab;user-select:none}
    #handle.dragging{cursor:grabbing}
    #handle .sigil{width:28px;height:28px;flex-basis:28px}#handle .sigil img{width:22px;height:22px}
    .headcopy{flex:1;min-width:0;line-height:1.16}.headcopy small{display:block;color:#bcd1d2;font-size:10px;letter-spacing:.14em;text-transform:uppercase}
    #close{display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;border:1px solid rgba(197,231,229,.22);border-radius:9px;color:#e4f5f2;background:rgba(7,22,31,.39);font:22px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;transition:background .2s ease,transform .2s ease}
    #close:hover{background:rgba(111,187,185,.22);transform:rotate(90deg)}
    #launcher:focus-visible,#close:focus-visible{outline:2px solid #9be5df;outline-offset:3px}
    iframe{display:block;width:100%;min-height:0;flex:1;border:0;background:#0d1c27}
    @keyframes tenno-metal{0%,55%{transform:translateX(-100%)}85%,100%{transform:translateX(100%)}}
    @keyframes tenno-open{0%{opacity:0;transform:translateY(24px) scale(.18);border-radius:80px}55%{opacity:1}100%{opacity:1;transform:none;border-radius:22px}}
    @keyframes tenno-glow{0%,100%{box-shadow:inset 0 0 12px rgba(153,226,220,.19),0 0 14px rgba(153,226,220,.18)}50%{box-shadow:inset 0 0 15px rgba(153,226,220,.27),0 0 22px rgba(153,226,220,.3)}}
    @media(max-width:480px){#launcher{right:12px;bottom:12px}#panel{right:8px;bottom:8px;width:calc(100vw - 16px);height:calc(100vh - 16px);border-radius:18px}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
    @media(prefers-contrast:more){#launcher,#panel{background:#0b1822;border-color:#e4f5f2;backdrop-filter:none;-webkit-backdrop-filter:none}}
    @media(forced-colors:active){#launcher,#panel,#close{border:1px solid CanvasText;background:Canvas;color:CanvasText;backdrop-filter:none;-webkit-backdrop-filter:none}}
  `;
  const launcher = document.createElement('button');
  launcher.id = 'launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label','Open Tenno Link companion');
  launcher.setAttribute('aria-expanded','false');
  const logo = document.createElement('img');
  logo.src = chrome.runtime.getURL('assets/tenno-link-logo-animated.svg');
  logo.alt = '';
  const launcherSigil = document.createElement('span');
  launcherSigil.className = 'sigil';
  launcherSigil.setAttribute('aria-hidden','true');
  launcherSigil.append(logo);
  launcher.append(launcherSigil,document.createTextNode('Tenno Link'));
  const panel = document.createElement('section');
  panel.id = 'panel';
  panel.hidden = true;
  panel.setAttribute('aria-label','Tenno Link companion');
  const handle = document.createElement('div');
  handle.id = 'handle';
  const handleSigil = launcherSigil.cloneNode(true);
  const headcopy = document.createElement('span');
  headcopy.className = 'headcopy';
  const headHint = document.createElement('small');
  headHint.textContent = 'Drag to move';
  headcopy.append(headHint);
  handle.append(handleSigil,headcopy);
  const close = document.createElement('button');
  close.id = 'close';
  close.type = 'button';
  close.setAttribute('aria-label','Close Tenno Link companion');
  close.textContent = '\u00d7';
  const frame = document.createElement('iframe');
  frame.title = 'Tenno Link full interface';
  handle.append(close);
  panel.append(handle,frame);
  shadow.append(style,launcher,panel);
  (document.body || document.documentElement).append(host);

  const open = () => {
    frame.src = chrome.runtime.getURL('popup.html?overlay=1');
    panel.hidden = false;
    launcher.hidden = true;
    launcher.setAttribute('aria-expanded','true');
    requestAnimationFrame(clampPosition);
    close.focus();
  };
  const dismiss = () => {
    panel.hidden = true;
    launcher.hidden = false;
    launcher.setAttribute('aria-expanded','false');
    launcher.focus();
  };
  launcher.addEventListener('click',open);
  close.addEventListener('click',dismiss);
  document.addEventListener('keydown',event => { if (event.key === 'Escape' && !panel.hidden) dismiss(); });
  window.addEventListener('message',event => {
    if (event.source === frame.contentWindow && event.data?.type === 'tenno-link-close') dismiss();
  });

  let dragging = null;
  handle.addEventListener('pointerdown',event => {
    if (event.button !== 0 || event.target === close || close.contains(event.target)) return;
    const rect = panel.getBoundingClientRect();
    dragging = {id:event.pointerId,dx:event.clientX-rect.left,dy:event.clientY-rect.top};
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    handle.classList.add('dragging');
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove',event => {
    if (!dragging || event.pointerId !== dragging.id) return;
    const maxX = Math.max(8,window.innerWidth-panel.offsetWidth-8);
    const maxY = Math.max(8,window.innerHeight-panel.offsetHeight-8);
    panel.style.left = `${Math.min(maxX,Math.max(8,event.clientX-dragging.dx))}px`;
    panel.style.top = `${Math.min(maxY,Math.max(8,event.clientY-dragging.dy))}px`;
  });
  const stopDrag = event => { if (dragging?.id === event.pointerId) { dragging = null; handle.classList.remove('dragging'); } };
  handle.addEventListener('pointerup',stopDrag);
  handle.addEventListener('pointercancel',stopDrag);
  function clampPosition() {
    if (!panel.style.left || panel.hidden) return;
    const maxX = Math.max(8,window.innerWidth-panel.offsetWidth-8);
    const maxY = Math.max(8,window.innerHeight-panel.offsetHeight-8);
    panel.style.left = `${Math.min(maxX,Math.max(8,parseFloat(panel.style.left)))}px`;
    panel.style.top = `${Math.min(maxY,Math.max(8,parseFloat(panel.style.top)))}px`;
  }
  window.addEventListener('resize',() => requestAnimationFrame(clampPosition));
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(clampPosition).observe(panel);
})();
