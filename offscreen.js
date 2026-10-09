chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== 'offscreen') return false;
  if (message.type === 'PLAY_LIVE_TIMER_VOICE') {
    TennoLiveTimers.play(message.key,message.volume,message.chime !== false).then(()=>sendResponse({ok:true}),error=>sendResponse({ok:false,error:error.message}));
    return true;
  }
  if (message.type === 'PLAY_CYCLE_VOICE') {
    TennoCycles.playTransmission(message.key,message.phase,message.volume,message.chime !== false).then(()=>sendResponse({ok:true}),error=>sendResponse({ok:false,error:error.message}));
    return true;
  }
  if (message.type === 'PLAY_CYCLE_SOUND') {
    TennoCycles.play(message.key,message.volume).then(()=>sendResponse({ok:true}),error=>sendResponse({ok:false,error:error.message}));
    return true;
  }
  if (message.type !== 'COPY_TEXT_OFFSCREEN') return false;
  try {
    if (typeof message.text !== 'string') throw new Error('Nothing to copy');
    const field = document.getElementById('clipboardText');
    field.value = message.text;
    field.select();
    if (!document.execCommand('copy')) throw new Error('Clipboard write was blocked');
    field.value = '';
    sendResponse({ok:true});
  } catch (error) {
    sendResponse({ok:false,error:error.message});
  }
  return false;
});
