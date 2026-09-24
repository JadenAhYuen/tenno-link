chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== 'offscreen' || message.type !== 'COPY_TEXT_OFFSCREEN') return false;
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
