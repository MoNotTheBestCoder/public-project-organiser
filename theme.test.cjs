const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('project-planner-1.html', 'utf8');
const code = html.slice(html.indexOf('  var currentTheme'), html.indexOf('  function focusDefaults()'));
function fixture(saved, dark = false, denied = false) {
  const values = new Map(saved ? [['planner-theme', saved]] : []), root = {}, child = {};
  const buttons = ['light','dark'].map(choice => ({ attrs: {'data-theme-choice':choice}, handlers:{}, getAttribute(k){return this.attrs[k];},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this.handlers[k]=v;} }));
  const context = { LOCAL_KEY:'planner', focusWindow:{closed:false,document:{documentElement:{setAttribute:(k,v)=>child[k]=v}}},
    document:{documentElement:{setAttribute:(k,v)=>root[k]=v},querySelectorAll:()=>buttons},
    localStorage:{getItem:k=>{if(denied)throw Error('blocked');return values.get(k);},setItem:(k,v)=>{if(denied)throw Error('blocked');values.set(k,v);}},
    window:{matchMedia:()=>({matches:dark})} };
  vm.createContext(context);vm.runInContext(code+';initTheme();',context);
  return {context,root,child,values,buttons};
}
test('saved theme wins over device preference; switching updates both windows and survives reload',()=>{
  const x=fixture('light',true);assert.equal(x.root['data-theme'],'light');
  x.buttons[1].handlers.click();assert.equal(x.root['data-theme'],'dark');assert.equal(x.child['data-theme'],'dark');
  assert.equal(x.buttons[0].attrs['aria-pressed'],'false');assert.equal(x.buttons[1].attrs['aria-pressed'],'true');
  assert.equal(fixture(x.values.get('planner-theme')).root['data-theme'],'dark');assert.equal(x.values.size,1);
});
test('first visit uses device theme; unknown saved values and unavailable storage remain usable',()=>{
  assert.equal(fixture(undefined,true).root['data-theme'],'dark');assert.equal(fixture('pink').root['data-theme'],'light');
  const x=fixture(null,false,true);x.buttons[1].handlers.click();assert.equal(x.root['data-theme'],'dark');
});
test('embedded theme swatches match the official assets; no third palette or external stylesheet',()=>{
  const css=html.match(/<style id="plannerThemeTokens">([\s\S]*?)<\/style>/)[1];
  const palettes=JSON.parse(fs.readFileSync('graphics/assets/palettes.json','utf8'));
  const names={ground:'canvas',surface:'panel',ink:'ink',accent:'brand',inProgress:'prog',waiting:'wait',done:'done',overdue:'danger'};
  const [light,dark]=css.split(':root[data-theme="dark"]');
  for(const [mode,block] of [['light',light],['dark',dark]])for(const [key,token] of Object.entries(names))assert(block.includes(`--${token}: ${palettes[mode][key].toLowerCase()}`),`${mode}/${key}`);
  assert.deepEqual(Object.keys(palettes),['light','dark']);assert(!html.includes('fetch("graphics/'));
});
