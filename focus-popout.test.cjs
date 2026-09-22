const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the delivered inline runtime, with deterministic clocks and browser surfaces.
function surface() {
  const elements = new Map(), events = {}, intervals = new Map(); let sequence = 0;
  const element = id => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, { value:'', textContent:'', innerHTML:'', disabled:false, open:true,
        selectedOptions:[{textContent:'No task'}], style:{values:{},setProperty(k,v){this.values[k]=v;}},
        classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(){}},
        listeners:{}, addEventListener(name, callback){this.listeners[name]=callback;},
        checkValidity:()=>true, focus(){}, select(){} });
    }
    return elements.get(id);
  };
  const document = {getElementById:element,addEventListener(){},documentElement:{setAttribute(){}},head:{appendChild(){}},body:{innerHTML:'',classList:{add(){},remove(){},contains:()=>false,toggle(){}}},createElement:()=>({}),activeElement:null};
  const win = {document,closed:false,focusCount:0,focus(){this.focusCount++;},
    setInterval(callback){const id=++sequence;intervals.set(id,callback);return id;},clearInterval:id=>intervals.delete(id),
    addEventListener:(name,callback)=>events[name]=callback,
    close(){this.closed=true;if(events.pagehide)events.pagehide();}};
  return {win,element,events,intervals};
}
function app() {
  let code=fs.readFileSync('project-planner-1.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1];
  code=code.slice(0,code.indexOf('  /* ------------------------------ start'))+`
    render=()=>{};toast=()=>{};
    globalThis.api={openFocusPopout,focusStart,focusPause,focusFinish,focusTick,renderFocus,initFocus,serialize,focusPickerResults,updateFocusDetail,focusTargetAssignment,focusTargetValue,focusTaskOptions,focusLogExport,editFocusSession,
      captureForm:()=>{openForm=x=>globalThis.form=x;},pending:x=>pendingRemote=x,
      state:()=>state,restore:x=>state=normalize(x),window:()=>focusWindow};
    mode='local';})();`;
  const main=surface(), data=new Map(); let now=new Date(2026,8,19,9).getTime();
  class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  const ctx={...main.win,Date:Clock,console,Intl,URLSearchParams,location:{search:''},AbortController,navigator:{},
    crypto:require('node:crypto').webcrypto,setTimeout:()=>1,clearTimeout(){},
    localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},open:()=>null};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);
  main.element('focusTotal').value='2';main.element('focusPeriod').value='1';main.element('focusBreak').value='0';
  ctx.api.renderFocus();
  // renderFocus fills settings with defaults; explicitly select our test plan afterward.
  main.element('focusTotal').value='2';main.element('focusPeriod').value='1';main.element('focusBreak').value='0';
  return {...main,ctx,a:ctx.api,data,advance:ms=>now+=ms};
}
test('PiP opens once, repeated clicks focus existing window, and clock controls share state',async()=>{
  const x=app(), child=surface();let requests=0;
  x.ctx.documentPictureInPicture={requestWindow:async()=>{requests++;return child.win;}};
  await x.a.openFocusPopout(false);await x.a.openFocusPopout(false);
  assert.equal(requests,1);assert.equal(child.win.focusCount,1);assert.equal(child.intervals.size,1);
  child.element('floatStart').listeners.click();assert.equal(x.a.state().focusRun.status,'running');
  x.advance(12000);for(const tick of child.intervals.values())tick();
  assert.equal(child.element('floatClock').textContent,'00:48');
  child.element('floatStart').listeners.click();assert.equal(x.a.state().focusRun.status,'paused');
  assert.equal(child.element('floatStart').textContent,'Resume');
  x.advance(100000);child.element('floatStart').listeners.click();x.advance(8000);
  child.element('floatFinish').listeners.click();assert.equal(x.a.state().focusSessions[0].durationMs,20000);
  assert.equal(child.element('floatFinish').disabled,true);
});
test('concurrent clicks share pending PiP request',async()=>{
  const x=app(),child=surface();let resolve,requests=0;
  x.ctx.documentPictureInPicture={requestWindow:()=>{requests++;return new Promise(r=>resolve=r);}};
  const pending=x.a.openFocusPopout(false);await x.a.openFocusPopout(false);assert.equal(requests,1);
  resolve(child.win);await pending;assert.equal(x.a.window(),child.win);
});
test('unsupported PiP uses synchronous popup and identifies non-floating fallback',async()=>{
  const x=app(),child=surface();let calls=0;x.ctx.open=()=>{calls++;return child.win;};
  await x.a.openFocusPopout(false);assert.equal(calls,1);
  assert.match(x.element('focusPopoutHelp').textContent,/does not provide an always-on-top/);
  assert.match(child.win.document.body.innerHTML,/does not stay on top automatically/);
});
test('PiP rejection offers user-triggered popup fallback without opening automatically',async()=>{
  const x=app(),child=surface();let calls=0;
  x.ctx.documentPictureInPicture={requestWindow:async()=>{throw new Error('NotAllowedError');}};
  x.ctx.open=()=>{calls++;return child.win;};await x.a.openFocusPopout(false);
  assert.equal(calls,0);assert.equal(x.a.window(),null);assert.equal(x.element('focusWindowFallback').classList.contains('hidden'),false);
  await x.a.openFocusPopout(true);assert.equal(calls,1);assert.equal(x.a.window(),child.win);
});
test('blocked popup can be retried and close/reopen clears old ticker',async()=>{
  const x=app();await x.a.openFocusPopout(true);assert.match(x.element('focusPopoutHelp').textContent,/blocked/);
  const one=surface(),two=surface();x.ctx.open=()=>one.win;await x.a.openFocusPopout(true);
  one.win.close();assert.equal(one.intervals.size,0);assert.equal(x.a.window(),null);
  x.ctx.open=()=>two.win;await x.a.openFocusPopout(true);assert.equal(two.intervals.size,1);
});
test('closing planner closes child; closing child leaves running timer intact',async()=>{
  const x=app(),child=surface();x.a.initFocus();x.ctx.open=()=>child.win;await x.a.openFocusPopout(true);
  x.a.focusStart();child.win.close();assert.equal(x.a.state().focusRun.status,'running');
  const next=surface();x.ctx.open=()=>next.win;await x.a.openFocusPopout(true);
  x.events.pagehide();assert.equal(next.win.closed,true);assert.equal(next.intervals.size,0);
});
test('paused JSON reload excludes downtime and both ticker callbacks record completion only once',()=>{
  const x=app();x.a.focusStart();x.advance(10000);x.a.focusPause();
  const snapshot=JSON.parse(x.data.get('project-planner-v1'));x.advance(3600000);x.a.restore(snapshot);
  assert.equal(x.a.state().focusRun.status,'paused');x.a.focusStart();x.advance(50000);
  x.a.focusTick();x.a.focusTick();assert.equal(x.a.state().focusSessions.length,1);
  assert.equal(x.a.state().focusSessions[0].durationMs,60000);
  assert.equal(x.a.state().focusRun.status,'ready');assert.equal(x.a.serialize().version,5);
});
test('running JSON reload caps unattended time at one block and preserves exact end timestamp',()=>{
  const x=app();x.a.focusStart();const snapshot=JSON.parse(x.data.get('project-planner-v1'));
  const started=snapshot.focusRun.anchorAt;x.advance(7200000);x.a.restore(snapshot);x.a.focusTick();
  const session=x.a.state().focusSessions[0];assert.equal(session.durationMs,60000);
  assert.equal(new Date(session.endedAt).getTime(),started+60000);
  assert.equal(x.a.state().focusRun.status,'ready');assert.equal(x.a.state().focusSessions.length,1);
});
test('partially opened window is closed if setup fails, and next attempt succeeds',async()=>{
  const x=app(),broken=surface();broken.win.document.head.appendChild=()=>{throw new Error('Setup failed');};
  x.ctx.open=()=>broken.win;await x.a.openFocusPopout(true);
  assert.equal(broken.win.closed,true);assert.equal(x.a.window(),null);
  const retry=surface();x.ctx.open=()=>retry.win;await x.a.openFocusPopout(true);
  assert.equal(x.a.window(),retry.win);
});

test('floating clock preserves expanded planner and renders remaining circle',async()=>{
  const x=app(),child=surface();x.ctx.documentPictureInPicture={requestWindow:async()=>child.win};
  await x.a.openFocusPopout(false);assert.equal(x.element('focusPanel').open,true);
  child.element('floatStart').listeners.click();x.advance(15000);x.a.focusTick();
  assert.equal(child.element('floatRing').style.values['--remaining'],'75%');
  assert.equal(x.element('focusRing').style.values['--progress'],'75%');
  x.advance(45000);x.a.focusTick();
  assert.equal(child.element('floatRing').style.values['--remaining'],x.element('focusRing').style.values['--progress']);
  assert(!child.win.document.body.innerHTML.includes('floatProgress'));
});
test('quick notes synchronize between windows and persist with the measured block',async()=>{
  const x=app(),child=surface();x.ctx.documentPictureInPicture={requestWindow:async()=>child.win};await x.a.openFocusPopout(false);
  child.element('floatStart').listeners.click();child.element('floatNote').value='Drafted the scope';
  child.element('floatNote').listeners.input.call(child.element('floatNote'));
  assert.equal(x.element('focusNote').value,'Drafted the scope');
  x.advance(10000);child.element('floatFinish').listeners.click();
  assert.equal(x.a.serialize().focusSessions[0].note,'Drafted the scope');
  assert.equal(x.a.serialize().focusSessions[0].durationMs,10000);
  child.element('floatNote').value='Drafted scope and checked figures';child.element('floatNote').listeners.input.call(child.element('floatNote'));
  assert.equal(JSON.parse(x.data.get('project-planner-v1')).focusSessions[0].note,'Drafted scope and checked figures');
});
test('hierarchical picker escapes labels, searches client/project/title, and assigns stable IDs from PiP',async()=>{
  const x=app(),child=surface();x.a.restore({clients:[{id:'c',name:'Acme'}],projects:[{id:'p',clientId:'c',name:'Launch'}],tasks:[{id:'t',projectId:'p',clientId:'c',title:'Report <draft>'},{id:'u',title:'Unrelated'}]});
  for(const query of ['Acme','Launch','Report']) { const out=x.a.focusPickerResults(query);assert(out.includes('data-focus-pick="t:t"'));assert(!out.includes('data-focus-pick="t:u"'));assert(out.includes('Report &lt;draft&gt;')); }
  x.ctx.documentPictureInPicture={requestWindow:async()=>child.win};await x.a.openFocusPopout(false);
  child.element('floatPickerResults').listeners.click({target:{closest:selector=>selector==='[data-focus-pick]' ? {getAttribute:()=> 't:t'} : null}});
  assert.equal(x.element('focusTask').value,'t:t');assert.equal(child.element('floatPicker').open,false);
  child.element('floatStart').listeners.click();assert.equal(x.a.state().focusRun.assignment.projectName,'Launch');
  assert.equal(x.a.updateFocusDetail('task','deleted-id'),false);assert.equal(x.a.state().focusRun.assignment.taskId,'t');
});
test('selecting the next block task during a break preserves previous block ownership',()=>{
  const x=app();x.a.restore({tasks:[{id:'one',title:'First'},{id:'two',title:'Second'}]});
  x.element('focusPeriod').value='1';x.element('focusBreak').value='1';x.a.updateFocusDetail('task','one');
  x.element('focusPeriod').value='1';x.element('focusBreak').value='1';x.a.focusStart();x.advance(60000);x.a.focusTick();
  x.a.updateFocusDetail('task','two');assert.equal(x.a.state().focusSessions[0].assignment.taskId,'one');assert.equal(x.a.state().focusRun.assignment.taskId,'two');
});

test('floating window requests compact dimensions and uses a single-line note field',async()=>{const x=app(),child=surface();let options;x.ctx.documentPictureInPicture={requestWindow:async o=>{options=o;return child.win;}};await x.a.openFocusPopout(false);assert.equal(options.width,320);assert.equal(options.height,310);assert.match(child.win.document.body.innerHTML,/id="floatNote" rows="1"/);assert(!child.win.document.body.innerHTML.includes('⌄'));});

function workFixture(){return {clients:[{id:'same',name:'Client A'},{id:'empty',name:'Empty client'}],projects:[{id:'same',clientId:'same',name:'Project A'},{id:'empty',clientId:'empty',name:'Empty project'}],tasks:[{id:'same',projectId:'same',clientId:'same',title:'Task A'},{id:'other',title:'Task A'}]};}
function chooseFromPopup(child,value){child.element('floatPickerResults').listeners.click({target:{closest:selector=>selector==='[data-focus-pick]' ? {getAttribute:()=>value} : null}});}
for(const [target,client,project,task] of [['c:same','same','',''],['p:same','same','same',''],['t:same','same','same','same'],['','','','']])test('focus logs and exports exact assignment '+(target||'none'),async()=>{
 const x=app(),child=surface();x.a.restore(workFixture());x.ctx.documentPictureInPicture={requestWindow:async()=>child.win};await x.a.openFocusPopout(false);
 chooseFromPopup(child,target);assert.equal(child.element('floatPicker').open,false);assert.equal(x.element('focusTask').value,target);
 x.a.focusStart();x.advance(12000);x.a.focusFinish();const snapshot=x.a.serialize(),entry=snapshot.focusSessions[0];
 assert.equal(entry.assignment.clientId,client);assert.equal(entry.assignment.projectId,project);assert.equal(entry.assignment.taskId,task);assert.equal(entry.durationMs,12000);
 const range={start:Date.parse(entry.startedAt),end:Date.parse(entry.endedAt)+1};
 const csv=x.a.focusLogExport('csv',range).text,md=x.a.focusLogExport('md',range).text;
 if(client){assert(csv.includes('Client A'));assert(md.includes('Client A'));}if(project)assert(md.includes('Project A'));
 if(!task){assert.equal(entry.assignment.taskTitle,'');assert(!csv.includes('Task A'));}
 x.a.restore(snapshot);assert.equal(x.a.state().focusSessions[0].assignment.projectId,project);
});
test('empty clients/projects are selectable, hierarchy browses by ID and search spans all levels',()=>{
 const x=app();x.a.restore(workFixture());
 assert(x.a.focusPickerResults('').includes('data-focus-pick="c:empty"'));
 const branch=x.a.focusPickerResults('','c:empty');assert(branch.includes('data-focus-pick="p:empty"'));assert(!branch.includes('data-focus-pick="p:same"'));
 const emptyProject=x.a.focusPickerResults('','p:empty');assert(emptyProject.includes('data-focus-pick="p:empty"'));
 const matches=x.a.focusPickerResults('Client A');for(const target of ['c:same','p:same','t:same'])assert(matches.includes('data-focus-pick="'+target+'"'));
 const duplicates=x.a.focusPickerResults('Task A');assert(duplicates.includes('t:same'));assert(duplicates.includes('t:other'));assert(duplicates.includes('Client A / Project A'));
 assert(x.a.focusPickerResults('<missing>').includes('No matches'));
});
test('a finished task is not offered as something to start focusing on',()=>{
 const x=app();
 const doc=workFixture();
 doc.tasks.push({id:'finished',projectId:'same',clientId:'same',title:'Already handled',status:'Done'});
 x.a.restore(doc);
 // browsing, and searching by its exact name
 assert(!x.a.focusPickerResults('').includes('data-focus-pick="t:finished"'));
 assert(!x.a.focusPickerResults('Already handled').includes('data-focus-pick="t:finished"'));
 assert(!x.a.focusPickerResults('','p:same').includes('data-focus-pick="t:finished"'));
 assert(x.a.focusPickerResults('','p:same').includes('data-focus-pick="t:same"'));   // open work still listed
 // unless it is what the run is attached to: the clock would lose its label.
 // The top level lists only unassigned work, so look where this one lives.
 x.element('focusTask').value='t:finished';
 assert(x.a.focusPickerResults('','p:same').includes('data-focus-pick="t:finished"'));
 assert(x.a.focusPickerResults('Already handled').includes('data-focus-pick="t:finished"'));
 // the session log dialogs are separate, and still offer finished work
 assert(x.a.focusTaskOptions(x.a.focusTargetAssignment('t:finished')).includes('Already handled'));
});
test('a picker row is not given a tooltip repeating what it already says',()=>{
 const x=app();x.a.restore(workFixture());
 // The tooltip sat on top of the row below it, which in the mini window is a
 // large share of what is visible.
 const clients=x.a.focusPickerResults('');
 assert(clients.includes('data-focus-pick="c:same"'));
 assert(!/class="picker-task"[^>]*title=/.test(clients),'a client row still carries a tooltip');
 // a nested row keeps one, because the path says more than the row does
 const nested=x.a.focusPickerResults('Task A');
 assert(/title="Client A \/ Project A \/ Task A"/.test(nested),'a nested row lost the path tooltip');
});
test('invalid, deleted and remote-pending selections preserve current assignment and notes',()=>{
 const x=app();x.a.restore(workFixture());x.a.updateFocusDetail('target','c:same');x.a.updateFocusDetail('note','General planning');
 assert.equal(x.a.updateFocusDetail('target','p:deleted'),false);assert.equal(x.element('focusTask').value,'c:same');assert.equal(x.element('focusNote').value,'General planning');
 x.a.pending({});assert.equal(x.a.updateFocusDetail('target','p:same'),false);x.a.pending(null);
 x.a.state().clients=[];x.a.focusStart();assert.equal(x.a.state().focusRun,null);
});
test('the setup fields accept any whole number of minutes, not only multiples of the step',()=>{
 const x=app(); x.a.initFocus();
 // The arrows step by five so scrolling is pleasant, but native validation
 // would then call a typed 37 a stepMismatch and refuse it silently.
 // min is anchored at 0 so the five-minute step sequence lands on multiples
 // of five; data-min carries the bound that is actually enforced.
 const bounds={focusTotal:[1,1440],focusPeriod:[1,180],focusBreak:[0,60]};
 for(const id of Object.keys(bounds)){const el=x.element(id);el.min='0';el.max=String(bounds[id][1]);el.dataset={min:String(bounds[id][0])};}
 const total=x.element('focusTotal'), block=x.element('focusPeriod'), rest=x.element('focusBreak');
 total.value='90'; block.value='37'; rest.value='5';
 block.listeners.change.call(block);
 assert.equal(x.a.state().focusSettings.focusMinutes,37,'a typed 37 was refused');
 assert.equal(x.a.state().focusSettings.totalMinutes,90);
 // out of range is still refused, and leaves the last good settings alone
 block.value='400';
 block.listeners.change.call(block);
 assert.equal(x.a.state().focusSettings.focusMinutes,37);
 // so is a fraction, and so is an empty box
 block.value='12.5'; block.listeners.change.call(block);
 assert.equal(x.a.state().focusSettings.focusMinutes,37);
 block.value=''; block.listeners.change.call(block);
 assert.equal(x.a.state().focusSettings.focusMinutes,37);
 // a break of zero is legitimate and must not be read as empty
 block.value='25'; rest.value='0';
 rest.listeners.change.call(rest);
 assert.equal(x.a.state().focusSettings.breakMinutes,0);
});
test('changing level during a break prepares the next block without rewriting previous work',()=>{
 const x=app();x.a.restore(workFixture());x.a.updateFocusDetail('target','c:same');
 x.element('focusTotal').value='3';x.element('focusPeriod').value='1';x.element('focusBreak').value='1';
 x.a.focusStart();x.advance(60000);x.a.focusTick();assert.equal(x.a.state().focusRun.phase,'break');
 x.a.updateFocusDetail('target','p:same');assert.equal(x.a.state().focusSessions[0].assignment.projectId,'');
 // the break is already running: it started itself when the block ended
 x.advance(60000);x.a.focusTick();x.a.focusStart();x.advance(60000);x.a.focusTick();
 assert.equal(x.a.state().focusSessions[1].assignment.projectId,'same');assert.equal(x.a.state().focusSessions[1].assignment.taskId,'');
});
test('editing a log preserves removed assignment snapshots and can reassign to another level',()=>{
 const x=app();x.a.restore(workFixture());x.a.updateFocusDetail('target','p:same');x.a.focusStart();x.advance(20000);x.a.focusFinish();
 const entry=x.a.state().focusSessions[0],id=entry.id;x.a.state().projects=[];
 assert(x.a.focusTaskOptions(entry.assignment).includes('(removed)'));x.a.captureForm();x.a.editFocusSession(id);
 x.ctx.form.onSubmit({target:'p:same',note:'Snapshot kept'});assert.equal(entry.assignment.projectName,'Project A');
 x.a.editFocusSession(id);x.ctx.form.onSubmit({target:'c:empty',note:'Client work'});assert.equal(entry.assignment.clientId,'empty');assert.equal(entry.assignment.projectId,'');assert.equal(entry.durationMs,20000);
 x.a.editFocusSession(id);x.ctx.form.onSubmit({target:'p:missing',note:'Invalid'});assert.equal(entry.note,'Client work');
});
test('picker browse and close actions are explicit and never change assignment',async()=>{
 const x=app(),child=surface();x.a.restore(workFixture());x.ctx.documentPictureInPicture={requestWindow:async()=>child.win};await x.a.openFocusPopout(false);
 child.element('floatPickerResults').listeners.click({target:{closest:s=>s==='[data-focus-browse]'?{getAttribute:()=> 'c:empty'}:null}});
 assert(child.element('floatPickerResults').innerHTML.includes('data-focus-pick="p:empty"'));assert.equal(x.element('focusTask').value,'');
 child.element('floatPicker').listeners.keydown({key:'Escape',preventDefault(){}});assert.equal(child.element('floatPicker').open,false);
});

test('starting after a project move resolves current ownership while completed snapshots remain unchanged',()=>{
 const x=app();x.a.restore(workFixture());x.a.updateFocusDetail('target','p:same');
 x.a.state().projects[0].clientId='empty';x.a.focusStart();assert.equal(x.a.state().focusRun.assignment.clientId,'empty');
 x.advance(10000);x.a.focusFinish();x.a.state().projects[0].clientId='same';
 assert.equal(x.a.state().focusSessions[0].assignment.clientId,'empty');
});
