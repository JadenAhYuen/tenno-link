const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let listener;
let selected = false;
let shouldCopy = true;
const field = {value:'',select(){selected = true;}};
const context = vm.createContext({
  chrome:{runtime:{onMessage:{addListener(handler){listener=handler;}}}},
  document:{getElementById:()=>field,execCommand:command=>command==='copy' && shouldCopy}
});
vm.runInContext(fs.readFileSync('offscreen.js','utf8'),context);

let response;
listener({target:'offscreen',type:'COPY_TEXT_OFFSCREEN',text:'Warframe prompt'},null,value=>{response=value;});
assert.equal(response.ok,true);
assert.equal(selected,true);
assert.equal(field.value,'');

shouldCopy=false;
listener({target:'offscreen',type:'COPY_TEXT_OFFSCREEN',text:'Another prompt'},null,value=>{response=value;});
assert.equal(response.ok,false);
assert.match(response.error,/blocked/);
console.log('clipboard.test.cjs: offscreen copy success and failure passed');
