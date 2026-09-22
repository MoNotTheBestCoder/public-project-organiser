const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function app(original=false){
 let html=original?require('node:child_process').execFileSync('git',['-c','safe.directory=*','show','HEAD:project-planner-1.html'],{encoding:'utf8'}):fs.readFileSync('project-planner-1.html','utf8');
 let code=html.match(/<script>([\s\S]*)<\/script>/)[1];
 code=code.slice(0,code.indexOf('  /* ------------------------------ start'))+`
 globalThis.api={normalize,toDraftRows,deleteItem,editItem,addTask,confirmDraft,renderTasks,buildPrompt,initSample,quickAddDraft,loadChatDrafts,saveContext,initContext,
 state:()=>state,setState:x=>{state=normalize(x);${original?'':'historyBaseline=JSON.stringify(serialize());undoStack=[];redoStack=[];'}},setDraft:x=>draft=x,getDraft:()=>draft,setPending:x=>pendingRemote=normalize(x),pending:()=>pendingRemote,
 ${original?'':'addClient,addProject,unassignedProjects,setSessionMinutes,renderNav,navHTML:()=>$("clientNav").innerHTML,addStep,setStepDone,removeStep,renameStep,normalizeSteps,stepsDone,beginStep,stepsChip,stepsBlock,taskMenu,taskHomeChip,syncCaptureForSearch,importBackup,describeDoc,migrate,carryUnknown,withUnknown,SCHEMA:()=>SCHEMA_VERSION,matchingTasks,moveTasks,deleteSelectedTasks,recoverChange,commit,serialize,focusStart,focusPause,focusFinish,focusReset,focusTick,focusRemaining,weekBounds,dayBounds,sessionsInRange,renderFocusLog,editFocusSession,addFocusSession,focusLogExport,taskSummary,renderClient,renderUnassigned,renderProjects,setStatus,startInlineEdit,commitInlineEdit,cancelInlineEdit,inline:()=>inlineEdit,setSearch:x=>searchQuery=x,setScope:x=>scope=x,select:ids=>selectedTasks=new Set(ids),setOpenKey:k=>openState[k]=true,'}
 setMode:()=>mode='local',setExpanded:key=>expanded[key]=true,setFilters:x=>filters=x,
 lastToast:()=>globalThis.lastToast,
 stubUI:()=>{render=()=>{};toast=m=>{globalThis.lastToast=m};lookupBrand=()=>{};${original?'':'renderFocus=()=>{};renderFocusClock=()=>{};'}},
 capture:()=>{openConfirm=x=>globalThis.confirm=x;openForm=x=>globalThis.form=x;openActions=x=>globalThis.sheet=x;},
 applyPendingRemote, AIModel};})();`;
 if(original)code=code.replace(',loadChatDrafts,saveContext,initContext','');
 const els={};const data=new Map();
 const element=id=>els[id]??=( {value:'',textContent:'',innerHTML:'',disabled:false,dataset:{},classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(n,f){this.listeners[n]=f},focus(){},select(){},querySelector(){return element('confirmBtn')}});
 const bodyClasses=new Set();
 const body={offsetWidth:0,classList:{add:x=>bodyClasses.add(x),remove:x=>bodyClasses.delete(x),contains:x=>bodyClasses.has(x),toggle(){}}};
 const ctx={console,URLSearchParams,location:{search:''},Intl,Date,AbortController,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},navigator:{},document:{getElementById:element,addEventListener(){},querySelector(){return element('save')},body}};ctx.window=ctx;ctx.crypto=require('node:crypto').webcrypto;vm.createContext(ctx);vm.runInContext(code,ctx);ctx.api.stubUI();ctx.api.setMode();return {a:ctx.api,ctx,element,data,bodyClasses};
}
const fixture=()=>({clients:[{id:'c1',name:'Alpha'},{id:'c2',name:'Beta'}],projects:[{id:'p1',clientId:'c1',name:'Build'}],tasks:Array.from({length:15},(_,i)=>({id:'t'+i,title:i===3||i===8?'Duplicate':'Task '+i,projectId:'p1',clientId:'c1',status:i===10?'Done':'To Do',dueDate:i%2?'2026-10-01':''}))});
test('original deletion uses the selected ID, not final index',()=>{const {a,ctx}=app(true);a.setState(fixture());a.capture();a.deleteItem('task','t3');ctx.confirm.onConfirm();assert.equal(a.state().tasks.length,14);assert(!a.state().tasks.some(t=>t.id==='t3'));assert(a.state().tasks.some(t=>t.id==='t14'));});
for(const id of ['t0','t7','t14','t3','t8'])test('delete selected '+id+' only, and persist',()=>{const {a,ctx,data}=app();a.setState(fixture());a.capture();a.deleteItem('task',id);assert(ctx.confirm.title.includes(a.state().tasks.find(t=>t.id===id).title));ctx.confirm.onConfirm();assert.equal(a.state().tasks.length,14);assert(!JSON.parse(data.get('project-planner-v1')).tasks.some(t=>t.id===id));});
test('cancel has no mutation; sorting and expansion preserve IDs',()=>{const {a,ctx}=app();a.setState(fixture());a.capture();a.deleteItem('task','t7');assert.equal(a.state().tasks.length,15);let out=a.renderTasks(a.state().tasks,'p:p1','');assert.equal((out.match(/data-task-id/g)||[]).length,4);a.setExpanded('p:p1');out=a.renderTasks(a.state().tasks,'p:p1','');assert.equal((out.match(/data-task-id/g)||[]).length,14);a.setFilters({hideDone:false});assert.equal((a.renderTasks(a.state().tasks,'p:p1','').match(/data-task-id/g)||[]).length,15);});
test('moving project transfers task ownership; deleting old client preserves tasks',()=>{const {a,ctx}=app();a.setState(fixture());a.capture();a.editItem('project','p1');ctx.form.onSubmit({name:'Build',clientId:'c2'});assert(a.state().tasks.every(t=>t.clientId==='c2'));a.deleteItem('client','c1');ctx.confirm.onConfirm();assert.equal(a.state().tasks.length,15);});
test('edit resolves current task after remote snapshot',()=>{const {a,ctx}=app();a.setState(fixture());a.capture();a.editItem('task','t0');const remote=fixture();remote.tasks[1].title='Remote';a.setPending(remote);a.applyPendingRemote();ctx.form.onSubmit({title:'Edited',target:'p:p1',dueDate:'',note:''});assert.equal(a.state().tasks[0].title,'Edited');assert.equal(a.state().tasks[1].title,'Remote');});
test('manual add uses correct assignment',()=>{const {a,ctx}=app();a.setState(fixture());a.capture();a.addTask('p:p1');ctx.form.onSubmit({title:'New',target:'p:p1',dueDate:'',note:''});assert.equal(a.state().tasks.at(-1).clientId,'c1');});
test('chat import validates atomically and preserves original message',()=>{const {a,element}=app();a.setState(fixture());element('qaInput').value='brain dump';for(const invalid of ['not json','{}','[{"action":"delete","title":"x"}]','[{"action":"task","title":"x","dueDate":"2026-02-30"}]']){element('draftJson').value=invalid;a.loadChatDrafts();assert.equal(a.getDraft(),null);assert.equal(a.state().tasks.length,15);assert.equal(element('qaInput').value,'brain dump');}});
test('draft review, note edit, removal and repeated approval',()=>{const {a,element}=app();a.setState(fixture());element('draftJson').value='```json\n[{"action":"task","title":"One","projectId":"p1"},{"action":"task","title":"Two"}]\n```';a.loadChatDrafts();assert.equal(a.state().tasks.length,15);a.getDraft()[0].note='Legal';a.setDraft(a.getDraft().slice(0,1));a.confirmDraft();a.confirmDraft();assert.equal(a.state().tasks.length,16);assert.equal(a.state().tasks.at(-1).note,'Legal');});
test('unknown and ambiguous assignments remain unassigned',()=>{const {a}=app();const f=fixture();f.projects.push({id:'p2',clientId:'c2',name:'Build'});a.setState(f);const rows=a.toDraftRows([{action:'task',title:'x',projectName:'Build'},{action:'task',title:'y',projectId:'invented'}]);assert(rows.every(r=>r.target===''));});
test('context included, saved, reloaded with current tasks and date',()=>{const {a,element}=app();a.setState(fixture());a.initContext();element('contextInput').value='# Alias\nAC means Alpha';a.saveContext();element('contextInput').value='';a.initContext();const prompt=a.buildPrompt('Send scope for Alpha');assert(prompt.includes('AC means Alpha'));assert(prompt.includes('Task 14'));assert(prompt.includes('Send scope'));});
test('Claude adapter yields review rows without saving',async()=>{const {a,ctx,element}=app();a.setState(fixture());ctx.claude={use:async()=>({json:async()=>[{action:'task',title:'Claude draft'}]})};await a.initSample();element('qaInput').value='Draft';await a.quickAddDraft();assert.equal(a.getDraft()[0].title,'Claude draft');assert.equal(a.state().tasks.length,15);});
test('AI feature boundary routes tiers and cancellation without exposing a generic request',async()=>{
 const {a,ctx}=app(); const requests=[], capabilities=[];
 ctx.claude={use:async name=>{capabilities.push(name);return {json:async(prompt,options)=>{requests.push({prompt,options});return [];}};}};
 assert.equal(await a.AIModel.init(),true); assert.deepEqual(capabilities,['sample']);assert.equal(requests.length,0);
 const controller=new AbortController();await a.AIModel.draftTasks('tasks',{signal:controller.signal});await a.AIModel.suggestClientBrand('brand');
 assert.equal(requests[0].options.signal,controller.signal);assert.equal(requests[0].options.modelTier,'default');assert.equal(requests[1].options.modelTier,'quick');
 assert.equal(a.AIModel.json,undefined);a.AIModel.retire();assert.equal((await a.AIModel.draftTasks('after retire')).code,'unavailable');assert.equal(requests.length,2);
});
test('AI handles incompatible hosts and normalizes provider errors',async()=>{
 const {a,ctx}=app();assert.equal(await a.AIModel.init(),false);
 ctx.claude={use:async()=>({})};assert.equal(await a.AIModel.init(),false);assert.equal((await a.AIModel.suggestClientBrand('x')).code,'unavailable');
 ctx.claude={use:async()=>({json:async()=>{throw {code:'invalid_json'};}})};assert.equal(await a.AIModel.init(),true);assert.equal((await a.AIModel.draftTasks('x')).code,'invalid_response');
});
test('search matches notes, project, client and respects scope and filters',()=>{const {a}=app();let f=fixture();f.tasks[0].notes='Budget approval';a.setState(f);a.setSearch('BUDGET alpha');assert.equal(a.matchingTasks().length,1);a.setSearch('build');assert.equal(a.matchingTasks().length,14);a.setScope('c2');assert.equal(a.matchingTasks().length,0);a.setScope('all');a.setFilters({hideDone:false,showArchived:false});assert.equal(a.matchingTasks().length,15);});
test('notes survive normalize, edit, persistence and escaped rendering',()=>{const {a,ctx,data}=app();a.setState(fixture());a.capture();a.editItem('task','t0');ctx.form.onSubmit({title:'Task',target:'p:p1',notes:'<script>danger</script>\nDetails'});assert.equal(a.state().tasks[0].notes,'<script>danger</script>\nDetails');assert.equal(JSON.parse(data.get('project-planner-v1')).tasks[0].notes,a.state().tasks[0].notes);const html=a.renderTasks([a.state().tasks[0]],'test','');assert(html.includes('&lt;script&gt;'));assert(html.includes('notes-preview'));});
test('bulk move changes exactly selected tasks and can undo and redo',()=>{const {a,ctx}=app();const f=fixture();f.projects.push({id:'p2',clientId:'c2',name:'Delivery'});a.setState(f);a.capture();a.moveTasks(['t0','t7']);ctx.form.onSubmit({target:'p:p2'});assert.equal(a.state().tasks[0].projectId,'p2');assert.equal(a.state().tasks[7].clientId,'c2');assert.equal(a.state().tasks[1].projectId,'p1');a.recoverChange(false);assert.equal(a.state().tasks[0].projectId,'p1');a.recoverChange(true);assert.equal(a.state().tasks[0].projectId,'p2');});
test('bulk deletion and parent deletion are recoverable',()=>{const {a,ctx}=app();a.setState(fixture());a.capture();a.select(['t1','t3']);a.deleteSelectedTasks();ctx.confirm.onConfirm();assert.equal(a.state().tasks.length,13);a.recoverChange(false);assert.equal(a.state().tasks.length,15);a.deleteItem('client','c1');ctx.confirm.onConfirm();assert.equal(a.state().tasks.length,0);a.recoverChange(false);assert.equal(a.state().tasks.length,15);assert.equal(a.state().projects[0].id,'p1');});
test('new action after undo clears redo',()=>{const {a,ctx}=app();a.setState(fixture());a.capture();a.deleteItem('task','t0');ctx.confirm.onConfirm();a.recoverChange(false);a.deleteItem('task','t1');ctx.confirm.onConfirm();a.recoverChange(true);assert(a.state().tasks.some(t=>t.id==='t0'));assert(!a.state().tasks.some(t=>t.id==='t1'));});
test('undo is blocked during draft review and history cleared on remote replacement',()=>{const {a,ctx}=app();a.setState(fixture());a.capture();a.deleteItem('task','t0');ctx.confirm.onConfirm();a.setDraft([{kind:'task',title:'Pending'}]);a.recoverChange(false);assert.equal(a.state().tasks.length,14);a.setDraft(null);const remote=fixture();remote.tasks[0].title='Remote change';a.setPending(remote);a.applyPendingRemote();a.recoverChange(false);assert.equal(a.state().tasks[0].title,'Remote change');});
function timer(total=60,focus=25,rest=5){const instance=app();instance.a.setState(fixture());instance.element('focusTotal').value=String(total);instance.element('focusPeriod').value=String(focus);instance.element('focusBreak').value=String(rest);instance.element('focusTask').value='t0';instance.element('focusNote').value='Drafted client scope';return instance;}
const epoch=new Date(2026,8,19,9).getTime(), minute=60000;
test('75-minute session includes breaks and ends with 15 minutes of focus',()=>{
 const {a}=timer(75,25,5);let now=epoch;a.focusStart(now);
 for(const [phase,minutes] of [['focus',25],['break',5],['focus',25],['break',5],['focus',15]]){
  assert.equal(a.state().focusRun.phase,phase);assert.equal(a.state().focusRun.segmentMs,minutes*minute);
  if(a.state().focusRun.status==='ready')a.focusStart(now);
  now+=minutes*minute;a.focusTick(now);
 }
 const run=a.normalize(a.serialize()).focusRun;assert.equal(run.status,'completed');assert.equal(run.elapsedMs,75*minute);
 assert.equal(run.completedMs,65*minute);assert.deepEqual(Array.from(a.state().focusSessions,s=>s.durationMs),[25,25,15].map(n=>n*minute));
 a.focusTick(now);assert.equal(a.state().focusSessions.length,3);
});
for(const [total,focus,rest,expected] of [[10,25,5,[10]],[55,25,5,[25,5,25]],[27,25,5,[25,2]],[60,25,5,[25,5,25,5]],[60,25,0,[25,25,10]],[25,25,5,[25]]])test('session budget fits '+[total,focus,rest].join('/'),()=>{
 const {a}=timer(total,focus,rest);let now=epoch;const actual=[];a.focusStart(now);
 while(a.state().focusRun.status!=='completed'){
  assert(actual.length<10);const run=a.state().focusRun;actual.push(run.segmentMs/minute);
  if(run.status==='ready')a.focusStart(now);now+=run.segmentMs;a.focusTick(now);
 }
 assert.deepEqual(actual,expected);assert.equal(now-epoch,total*minute);assert.equal(a.state().focusRun.phase,'focus');
});
test('session budget survives reload, pauses and waiting between blocks without counting them',()=>{
 const {a}=timer(75,25,5);a.focusStart(epoch);a.focusPause(epoch+10*minute);a.setState(a.serialize());
 // a hundred minutes of doing nothing must not touch the budget
 a.focusStart(epoch+110*minute);a.focusTick(epoch+125*minute);
 assert.equal(a.state().focusRun.elapsedMs,25*minute);        // one full block, nothing else
 // the break then starts itself and spends its five minutes of a session budget
 a.focusTick(epoch+130*minute);
 assert.equal(a.state().focusRun.phase,'focus');
 assert.equal(a.state().focusRun.status,'ready');             // but focus still waits for a press
 assert.equal(a.state().focusRun.elapsedMs,30*minute);
 assert.equal(a.state().focusRun.completedMs,25*minute);      // only focus counts as completed work
 // seventy more minutes of waiting, then a paused block, across a reload
 a.focusStart(epoch+200*minute);a.focusPause(epoch+202*minute);a.setState(a.serialize());
 assert.equal(a.state().focusRun.remainingMs,23*minute);
 assert.equal(a.state().focusRun.elapsedMs,32*minute);
 // finish that block, let its break run, and the next block is cut to what is
 // left of the budget rather than overrunning it
 a.focusStart(epoch+300*minute);a.focusTick(epoch+323*minute);
 assert.equal(a.state().focusRun.elapsedMs,55*minute);
 a.focusTick(epoch+328*minute);
 assert.equal(a.state().focusRun.segmentMs,15*minute);        // 75 total, 60 spent
});
test('pause, resume and early finish record only active intervals',()=>{const {a}=timer(5,5,0);a.focusStart(epoch);a.focusPause(epoch+20000);a.focusStart(epoch+120000);a.focusFinish(epoch+130000);assert.equal(a.state().focusSessions.length,1);assert.equal(a.state().focusSessions[0].durationMs,30000);assert.equal(a.state().focusSessions[0].intervals.length,2);assert.equal(a.state().focusSessions[0].outcome,'ended-early');a.focusFinish(epoch+140000);assert.equal(a.state().focusSessions.length,1);});
test('a break starts itself when the block ends while you are watching',()=>{
 const {a,bodyClasses}=timer(60,25,5);
 a.focusStart(epoch);
 a.focusTick(epoch+25*minute);                       // the boundary, caught as it happens
 assert.equal(a.state().focusRun.phase,'break');
 assert.equal(a.state().focusRun.status,'running','the break still waited for a press');
 assert(bodyClasses.has('phase-change'),'nothing signalled the change');
 // the other direction does not start itself: focus would put minutes in the
 // timesheet for a desk nobody has come back to
 a.focusTick(epoch+30*minute);
 assert.equal(a.state().focusRun.phase,'focus');
 assert.equal(a.state().focusRun.status,'ready');
 assert.equal(a.state().focusSessions.length,1);     // and a break is never logged as work
});
test('a boundary noticed long after it happened does not start a break',()=>{
 const {a}=timer(60,25,5);
 a.focusStart(epoch);
 a.focusTick(epoch+4*60*minute);                     // the tab slept; this is the catch-up tick
 assert.equal(a.state().focusRun.phase,'break');
 assert.equal(a.state().focusRun.status,'ready','a break four hours late started itself');
 assert.equal(a.state().focusSessions[0].durationMs,25*minute);   // only the work that happened
});
test('reset mid-block keeps the work already done and starts again with the same settings',()=>{
 const {a,element}=timer(60,25,5);
 element('focusTask').value='c:c1';
 a.focusStart(epoch);
 const before=a.state().focusRun;
 const settings=JSON.stringify(before.settings), assignment=JSON.stringify(before.assignment), note=before.note;
 a.focusReset(epoch+10*minute);                      // ten minutes in
 // the ten minutes are not thrown away
 assert.equal(a.state().focusSessions.length,1);
 assert.equal(a.state().focusSessions[0].durationMs,10*minute);
 assert.equal(a.state().focusSessions[0].outcome,'ended-early');
 // and the clock is back at the top of an identical session
 const run=a.state().focusRun;
 assert.notEqual(run.id,before.id,'a reset must be a new run, or its blocks would collide');
 assert.equal(run.status,'ready','a reset must not start crediting time on its own');
 assert.equal(run.phase,'focus');
 assert.equal(run.segmentMs,25*minute);
 assert.equal(run.remainingMs,25*minute);
 assert.equal(run.elapsedMs,0);
 assert.equal(run.completedMs,0);
 assert.equal(run.block,1);
 assert.equal(JSON.stringify(run.settings),settings);
 assert.equal(JSON.stringify(run.assignment),assignment);
 assert.equal(run.note,note);
 // it survives a reload, which is where a malformed run would be dropped
 a.setState(a.serialize());
 assert.equal(a.state().focusRun.status,'ready');
 assert.equal(a.state().focusRun.segmentMs,25*minute);
});
test('reset works after a session ends, during a break, and before any work, logging only real focus',()=>{
 // after the session is over: nothing new to log, just a fresh start
 let {a}=timer(60,25,5);
 a.focusStart(epoch);a.focusFinish(epoch+5*minute);
 assert.equal(a.state().focusSessions.length,1);
 a.focusReset(epoch+6*minute);
 assert.equal(a.state().focusSessions.length,1,'a finished session was logged twice');
 assert.equal(a.state().focusRun.status,'ready');
 // during a break: break time is never logged as work
 ({a}=timer(60,25,5));
 a.focusStart(epoch);a.focusTick(epoch+25*minute);  // block ends, break starts itself
 assert.equal(a.state().focusRun.phase,'break');
 a.focusReset(epoch+27*minute);
 assert.equal(a.state().focusSessions.length,1);    // just the one finished block
 assert.equal(a.state().focusSessions[0].durationMs,25*minute);
 assert.equal(a.state().focusRun.phase,'focus');
 assert.equal(a.state().focusRun.status,'ready');
 // before any work at all: a zero-length block is not a block
 ({a}=timer(60,25,5));
 a.focusStart(epoch);a.focusReset(epoch);
 assert.equal(a.state().focusSessions.length,0);
 // and with nothing to reset, it does nothing
 ({a}=timer(60,25,5));
 a.focusReset(epoch);
 assert.equal(a.state().focusRun,null);
});
test('a short session resets to a first block cut to the session, as a first start would',()=>{
 const {a}=timer(15,25,5);                          // shorter than one block
 a.focusStart(epoch);
 const first=a.state().focusRun;
 a.focusReset(epoch+minute);
 // a do-nothing reset would leave the length alone too, so prove it ran
 assert.notEqual(a.state().focusRun.id,first.id);
 assert.equal(a.state().focusRun.status,'ready');
 assert.equal(a.state().focusRun.segmentMs,first.segmentMs);
 assert.equal(a.state().focusRun.segmentMs,15*minute);
});
test('background tab completes one block without inventing subsequent work',()=>{const {a}=timer();a.focusStart(epoch);a.focusTick(epoch+4*60*minute);assert.equal(a.state().focusSessions[0].durationMs,25*minute);assert.equal(a.state().focusRun.status,'ready');a.focusTick(epoch+5*60*minute);assert.equal(a.state().focusSessions.length,1);});
test('reload resumes timestamp and completion remains idempotent after normalization',()=>{const {a,data}=timer(1,1,0);a.focusStart(epoch);const snapshot=JSON.parse(data.get('project-planner-v1'));a.setState(snapshot);a.focusTick(epoch+2*minute);assert.equal(a.state().focusSessions.length,1);assert.equal(a.state().focusSessions[0].durationMs,minute);a.setState(JSON.parse(data.get('project-planner-v1')));a.focusTick(epoch+3*minute);assert.equal(a.state().focusSessions.length,1);});
test('JSON includes settings, active timer, task snapshots and notes',()=>{const {a,data}=timer(90,30,8);a.focusStart(epoch);assert.equal(a.serialize().version,5);a.focusFinish(epoch+45000);const json=JSON.parse(data.get('project-planner-v1'));assert.equal(json.focusSettings.repeat,false);assert.equal(json.focusSettings.totalMinutes,90);assert.equal(json.focusSettings.focusMinutes,30);assert.equal(json.focusSettings.breakMinutes,8);assert.equal(json.focusSessions[0].assignment.clientName,'Alpha');assert.equal(json.focusSessions[0].note,'Drafted client scope');assert.equal(json.focusRun.status,'completed');});
test('deleting linked task and undoing planner work preserve focus history',()=>{const {a,ctx}=timer(5,5,0);a.capture();a.focusStart(epoch);a.deleteItem('task','t0');ctx.confirm.onConfirm();a.focusFinish(epoch+minute);assert.equal(a.state().focusSessions[0].assignment.taskTitle,'Task 0');a.recoverChange(false);assert(a.state().tasks.some(t=>t.id==='t0'));assert.equal(a.state().focusSessions[0].durationMs,minute);assert.equal(a.state().focusRun.status,'completed');});
test('the log shows one day at a time while an export still covers its week',()=>{
 const {a,element}=app();
 const day=(d,h)=>new Date(2026,8,d,h).getTime();
 a.setState({clients:[{id:'c1',name:'Alpha'}],projects:[],tasks:[],focusSessions:[
  {id:'mon',assignment:{clientName:'Alpha'},note:'MONDAY_WORK',outcome:'completed',
   intervals:[{start:day(21,9),end:day(21,10)}]},
  {id:'tue',assignment:{clientName:'Alpha'},note:'TUESDAY_WORK',outcome:'completed',
   intervals:[{start:day(22,9),end:day(22,11)}]}]});
 // a day holds only its own sessions
 const monday=a.dayBounds(0,day(21,12));
 assert.equal(a.sessionsInRange(monday).length,1);
 assert.equal(a.sessionsInRange(monday)[0].ms,60*60000);
 const tuesday=a.dayBounds(0,day(22,12));
 assert.equal(a.sessionsInRange(tuesday).length,1);
 assert.equal(a.sessionsInRange(tuesday)[0].ms,120*60000);
 // a day boundary is local midnight to local midnight, whatever the month
 assert.equal(tuesday.start-monday.start,86400000);
 assert.equal(a.dayBounds(1,day(21,12)).start,tuesday.start);
 assert.equal(a.dayBounds(-1,day(22,12)).start,monday.start);
 // the export still covers the whole week, so both days land in one file
 const week=a.weekBounds(0,day(22,12));
 assert.equal(a.sessionsInRange(week).length,2);
 const csv=a.focusLogExport('csv',week).text;
 assert(csv.includes('MONDAY_WORK')&&csv.includes('TUESDAY_WORK'),'the weekly export lost a day');
 assert.match(a.focusLogExport('csv',week).filename,/^focus-log-2026-09-21\.csv$/);
});
test('weekly allocation splits active intervals across Monday midnight',()=>{const {a}=timer();const monday=new Date(2026,8,21).getTime();const f=fixture();f.focusSessions=[{id:'cross',intervals:[{start:monday-5*minute,end:monday+5*minute}],assignment:{taskTitle:'Cross-week work'},outcome:'completed'}];a.setState(f);assert.equal(a.sessionsInRange(a.weekBounds(0,monday))[0].ms,5*minute);assert.equal(a.sessionsInRange(a.weekBounds(-1,monday))[0].ms,5*minute);});
test('old backups migrate with defaults; malformed timer and intervals are rejected',()=>{const {a}=app();const old=a.normalize(fixture());assert.equal(old.focusSessions.length,0);assert.equal(old.focusSettings.focusMinutes,25);assert.equal(old.focusRun,null);const bad=a.normalize({focusRun:{id:'x',status:'running',phase:'focus'},focusSessions:[{id:'bad',intervals:[{start:1,end:Infinity},{start:1,end:1e100}]}]});assert.equal(bad.focusRun,null);assert.equal(bad.focusSessions.length,0);});
test('invalid settings do not start a timer; zero-break plans go directly to ready focus',()=>{const {a,element}=timer(0,0,5);a.focusStart(epoch);assert.equal(a.state().focusRun,null);element('focusTotal').value='2';element('focusPeriod').value='1';element('focusBreak').value='0';a.focusStart(epoch);a.focusTick(epoch+minute);assert.equal(a.state().focusRun.phase,'focus');assert.equal(a.state().focusRun.status,'ready');});
test('editing logged notes preserves measured duration',()=>{const {a,ctx}=timer();a.focusStart(epoch);a.focusFinish(epoch+minute);const id=a.state().focusSessions[0].id;a.capture();a.editFocusSession(id);ctx.form.onSubmit({taskId:'t1',note:'Updated timesheet detail'});assert.equal(a.state().focusSessions[0].durationMs,minute);assert.equal(a.state().focusSessions[0].assignment.taskId,'t1');assert.equal(a.state().focusSessions[0].note,'Updated timesheet detail');});

test('an imported legacy timer preserves its original total-goal end condition',()=>{const {a}=timer();a.focusStart(epoch);const old=a.serialize();old.focusRun.settings={totalMinutes:25,focusMinutes:25,breakMinutes:5};a.setState(old);a.focusTick(epoch+25*minute);assert.equal(a.state().focusRun.status,'completed');assert.equal(a.state().focusSessions[0].durationMs,25*minute);});

test('weekly CSV export clips boundary-crossing work and safely quotes note fields',()=>{
 const {a}=app();const start=new Date(2026,8,21).getTime(),f=fixture();
 f.focusSessions=[{id:'cross',assignment:{clientName:'Acme',projectName:'Scope',taskTitle:'=1+1'},note:'A, "quoted" note\nSecond line',intervals:[{start:start-300000,end:start+300000}]},{id:'outside',assignment:{taskTitle:'OUTSIDE'},intervals:[{start:start-600000,end:start-500000}]}];
 a.setState(f);const before=JSON.stringify(a.serialize()),out=a.focusLogExport('csv',a.weekBounds(0,start));
 assert.equal(out.filename,'focus-log-2026-09-21.csv');assert.equal(out.mime,'text/csv;charset=utf-8');assert(out.text.includes('"\'=1+1"'));assert(out.text.includes('"A, ""quoted"" note\nSecond line"'));assert(out.text.includes('"300","5.000000"'));assert(out.text.includes(new Date(start).toISOString()));assert(!out.text.includes('OUTSIDE'));assert(!out.text.includes('Task 14'));assert.equal(JSON.stringify(a.serialize()),before);
});
test('Markdown log exports only selected week, escapes notes, and reports an empty week',()=>{
 const {a}=app();const start=new Date(2026,8,21).getTime(),f=fixture();f.focusSessions=[{id:'md',assignment:{taskTitle:'A | B'},note:'<script>\nnext',intervals:[{start:start+1,end:start+60001}]}];a.setState(f);
 const out=a.focusLogExport('md',a.weekBounds(0,start));assert(out.text.includes('Total focused time: **1m**'));assert(out.text.includes('A \\| B'));assert(out.text.includes('&lt;script&gt;<br>next'));assert(!out.text.includes('Task 14'));assert(out.text.includes('UTC'));
 const empty=a.focusLogExport('md',a.weekBounds(1,start));assert(empty.text.includes('No focus blocks recorded'));assert(empty.text.includes('**0m**'));
});
test('total goal can be shorter than one block and rejects zero',()=>{const {a,element}=timer(10,25,5);a.focusStart(epoch);assert.equal(a.state().focusRun.remainingMs,10*minute);a.focusTick(epoch+10*minute);assert.equal(a.state().focusRun.status,'completed');element('focusTotal').value='0';a.focusStart(epoch+20*minute);assert.equal(a.state().focusRun.status,'completed');});

/* ---- manual ordering: migration, placement, and what it displaces ---- */
test('tasks saved before `order` existed are placed once, in the order they used to render',()=>{
 const {a}=app();
 a.setState({clients:[{id:'c1',name:'A'}],projects:[{id:'p1',clientId:'c1',name:'P'}],tasks:[
  {id:'waiting',title:'w',projectId:'p1',clientId:'c1',status:'Waiting'},
  {id:'due',title:'d',projectId:'p1',clientId:'c1',status:'To Do',dueDate:'2026-01-01'},
  {id:'plain',title:'p',projectId:'p1',clientId:'c1',status:'To Do'},
  {id:'done',title:'x',projectId:'p1',clientId:'c1',status:'Done'}]});
 const o=id=>a.state().tasks.find(t=>t.id===id).order;
 assert.deepEqual([o('due'),o('plain'),o('waiting'),o('done')],[1000,2000,3000,4000]);
 // migration is idempotent: a second normalize must not renumber anything
 const before=JSON.stringify(a.state().tasks);
 a.setState(JSON.parse(JSON.stringify(a.serialize())));
 assert.equal(JSON.stringify(a.state().tasks),before);
});
test('a task arriving without an order is appended after the placed ones, not interleaved',()=>{
 const {a}=app();
 a.setState({clients:[],projects:[],tasks:[
  {id:'a',title:'a',order:5000},{id:'b',title:'b',order:9000},{id:'c',title:'c'}]});
 assert.equal(a.state().tasks.find(t=>t.id==='c').order,10000);
});
test('manual order drives the list, with Done grouped below it newest-first',()=>{
 const {a}=app();
 a.setState({clients:[],projects:[],tasks:[
  {id:'a',title:'Alpha',order:3000},{id:'b',title:'Bravo',order:1000},
  {id:'c',title:'Charlie',order:2000,status:'Done'},{id:'d',title:'Delta',order:9000,status:'Done'}]});
 a.setFilters({hideDone:false});
 const ids=[...a.renderTasks(a.state().tasks,'k','').matchAll(/data-task-id="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(ids,['b','a','d','c']);   // open by order asc, then Done by order desc
});
test('new and moved tasks land at the end of their destination list',()=>{
 const {a,ctx}=app();
 a.setState({clients:[{id:'c1',name:'A'}],projects:[{id:'p1',clientId:'c1',name:'P'}],
  tasks:[{id:'t0',title:'First',projectId:'p1',clientId:'c1',order:1000}]});
 a.capture();a.addTask('p:p1');ctx.form.onSubmit({title:'Second',target:'p:p1',dueDate:'',note:'',notes:''});
 assert.equal(a.state().tasks.at(-1).order,2000);
 a.capture();a.moveTasks(['t0']);ctx.form.onSubmit({target:''});
 assert.equal(a.state().tasks.find(t=>t.id==='t0').order,1000);   // end of the empty unassigned list
 assert.equal(a.state().tasks.find(t=>t.id==='t0').projectId,'');
});

/* ---- inline editing on the row ---- */
test('inline edit renders one editor, commits, and drops the row from the drag surface',()=>{
 const {a}=app();
 a.setState({clients:[],projects:[],tasks:[{id:'t1',title:'Before',order:1000}]});
 assert.match(a.renderTasks(a.state().tasks,'k',''),/<button type="button" class="title" data-act="inline-edit" data-field="title" data-id="t1"/);
 a.startInlineEdit('t1','title');
 const open=a.renderTasks(a.state().tasks,'k','');
 assert.equal((open.match(/class="inline-input/g)||[]).length,1);
 assert.doesNotMatch(open,/draggable="true"/);                    // not a drag source while typing
 a.commitInlineEdit('t1','title','After');
 assert.equal(a.state().tasks[0].title,'After');
 assert.equal(a.inline(),null);
});
test('inline edit refuses a blank title, ignores a stale field, and Escape abandons',()=>{
 const {a}=app();
 a.setState({clients:[],projects:[],tasks:[{id:'t1',title:'Keep',order:1000}]});
 a.startInlineEdit('t1','title');a.commitInlineEdit('t1','title','   ');
 assert.equal(a.state().tasks[0].title,'Keep');
 a.startInlineEdit('t1','title');a.commitInlineEdit('t1','dueDate','2026-01-01');   // wrong field
 assert.equal(a.state().tasks[0].dueDate,'');
 a.cancelInlineEdit();assert.equal(a.inline(),null);
 a.startInlineEdit('t1','title');a.cancelInlineEdit();
 assert.equal(a.state().tasks[0].title,'Keep');
});
test('inline due date sets, clears and rejects a malformed value; an unset date offers a placeholder',()=>{
 const {a}=app();
 a.setState({clients:[],projects:[],tasks:[{id:'t1',title:'T',order:1000}]});
 assert.match(a.renderTasks(a.state().tasks,'k',''),/class="chip due-add"[^>]*data-field="dueDate"/);
 a.startInlineEdit('t1','dueDate');a.commitInlineEdit('t1','dueDate','2026-10-02');
 assert.equal(a.state().tasks[0].dueDate,'2026-10-02');
 a.startInlineEdit('t1','dueDate');a.commitInlineEdit('t1','dueDate','not-a-date');
 assert.equal(a.state().tasks[0].dueDate,'2026-10-02');
 a.startInlineEdit('t1','dueDate');a.commitInlineEdit('t1','dueDate','');
 assert.equal(a.state().tasks[0].dueDate,'');
});
test('inline edit is refused for a task that no longer exists',()=>{
 const {a}=app();a.setState({clients:[],projects:[],tasks:[]});
 a.startInlineEdit('gone','title');assert.equal(a.inline(),null);
});

/* ---- shared wording and one disclosure convention ---- */
test('one helper phrases every task count, and an empty client keeps its own label',()=>{
 const {a}=app();
 assert.equal(a.taskSummary([]),'0 open tasks');
 assert.equal(a.taskSummary([{status:'To Do'}]),'1 open task · 0 of 1 done');
 assert.equal(a.taskSummary([{status:'To Do'},{status:'Done'},{status:'Waiting'}]),'2 open tasks · 1 of 3 done');
 a.setState({clients:[{id:'c1',name:'Alpha'},{id:'c2',name:'Nothing yet'}],
  projects:[{id:'p1',clientId:'c1',name:'P'}],
  tasks:[{id:'t1',title:'a',projectId:'p1',clientId:'c1'},{id:'t2',title:'b',projectId:'p1',clientId:'c1',status:'Done'},
         {id:'t3',title:'loose',clientId:'c1'},{id:'u1',title:'nowhere'}]});
 a.setOpenKey('c:c1');a.setOpenKey('p:p1');
 const meta=h=>[...h.matchAll(/<span class="meta">([^<]*)<\/span>/g)].map(m=>m[1]);
 // client counts everything beneath it, including tasks inside its projects
 assert.deepEqual(meta(a.renderClient(a.state().clients[0])),
  ['2 open tasks · 1 of 3 done','1 open task · 0 of 1 done','1 open task · 1 of 2 done']);
 assert.deepEqual(meta(a.renderClient(a.state().clients[1])),['Empty']);
 assert.deepEqual(meta(a.renderUnassigned()),['1 open task · 0 of 1 done']);
});
test('clients, projects and Unassigned all disclose with the twist before the name',()=>{
 const {a}=app();
 a.setState({clients:[{id:'c1',name:'Alpha'}],projects:[{id:'p1',clientId:'c1',name:'Build'}],
  tasks:[{id:'t1',title:'a',projectId:'p1',clientId:'c1'},{id:'u1',title:'nowhere'}]});
 a.setOpenKey('c:c1');
 for (const html of [a.renderClient(a.state().clients[0]),a.renderUnassigned()]) {
  assert.match(html,/<span class="disclosure"><button class="twist/);
  assert.doesNotMatch(html,/disclosure-title|disclosure-chevron/);
 }
 assert.match(a.renderProjects(a.state().clients[0]),/<span class="disclosure"><button class="twist/);
});

/* ---- logging focused work that the timer never saw ---- */
test('a manual focus session is recorded like a timed one, on the right local day',()=>{
 const {a,ctx}=app();
 a.setState({clients:[{id:'c1',name:'Alpha'}],projects:[{id:'p1',clientId:'c1',name:'Build'}],
  tasks:[{id:'t1',title:'Write',projectId:'p1',clientId:'c1'}]});
 a.capture();a.addFocusSession();
 // fields come from the vm realm, so compare their shape as text
 assert.equal(Array.from(ctx.form.fields,f=>`${f.key}:${f.type||'text'}${f.required?'*':''}`).join(' '),
  'date:date* minutes:duration* target:select note:textarea');
 ctx.form.onSubmit({date:'2026-09-17',minutes:'45',target:'t:t1',note:'Drafting'});
 const s=a.state().focusSessions[0];
 assert.equal(s.durationMs,45*60000);
 assert.equal(s.outcome,'completed');
 assert.equal(s.assignment.taskTitle,'Write');
 assert.equal(s.assignment.clientName,'Alpha');
 // noon, not midnight: the entry must not slip a day west of Greenwich
 const d=new Date(s.intervals[0].start);
 assert.equal(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,'2026-09-17');
 assert.equal(d.getHours(),12);
 // and it exports through the ordinary path with no special casing
 assert.match(a.focusLogExport('csv',a.weekBounds(0,Date.parse('2026-09-17T12:00:00'))).text,/Drafting/);
});
test('a manual focus session rejects a bad date or a non-positive length before creating anything',()=>{
 const {a,ctx}=app();a.setState({clients:[],projects:[],tasks:[]});
 for (const bad of [{date:'nope',minutes:'30'},{date:'2026-13-45',minutes:'30'},
                    {date:'2026-09-17',minutes:'0'},{date:'2026-09-17',minutes:'-5'},
                    {date:'2026-09-17',minutes:'abc'},{date:'2026-09-17',minutes:''}]) {
  a.capture();a.addFocusSession();ctx.form.onSubmit({...bad,target:'',note:''});
  assert.equal(a.state().focusSessions.length,0,JSON.stringify(bad));
 }
 a.capture();a.addFocusSession();ctx.form.onSubmit({date:'2026-09-17',minutes:'20',target:'',note:''});
 assert.equal(a.state().focusSessions.length,1);              // unassigned is allowed
 assert.equal(a.state().focusSessions[0].assignment.clientId,'');
});

/* ---- the backup format has to survive features arriving and leaving ---- */
const backup=()=>({version:3,exportedAt:'2026-09-21T00:00:00.000Z',
 clients:[{id:'c1',name:'Alpha',status:'Active'}],
 projects:[{id:'p1',clientId:'c1',name:'Build',status:'Active'}],
 tasks:[{id:'t1',projectId:'p1',clientId:'c1',title:'Write',status:'To Do',order:1000}],
 focusSettings:{totalMinutes:60,focusMinutes:25,breakMinutes:5,repeat:false,budgetMode:'session'},
 focusRun:null,focusSessions:[]});

test('a backup round-trips through export and import unchanged',()=>{
 const {a,ctx}=app();a.setState(backup());a.capture();
 const exported=JSON.parse(JSON.stringify(a.serialize()));
 a.setState({clients:[],projects:[],tasks:[]});
 assert(a.importBackup(JSON.stringify(exported),'b.json'));
 ctx.confirm.onConfirm();
 assert.deepEqual(JSON.parse(JSON.stringify(a.serialize())),exported);
});
test('fields a future build adds survive a round trip through this one',()=>{
 const {a,ctx}=app();a.capture();
 const future=backup();
 future.version=9;                                  // written by a later build
 future.workspaces=[{id:'w1',name:'Personal'}];      // a top-level feature we do not have
 future.clients[0].archivedAt='2026-01-01';          // a client field we do not have
 future.projects[0].colour='#123456';
 future.tasks[0].assignee='someone';
 future.tasks[0].subtasks=[{id:'s1',done:false}];
 assert(a.importBackup(JSON.stringify(future),'future.json'));
 assert.match(ctx.confirm.title,/newer/i);           // and it says so before replacing
 ctx.confirm.onConfirm();
 const out=a.serialize();
 assert.equal(JSON.stringify(out.workspaces),JSON.stringify([{id:'w1',name:'Personal'}]));
 assert.equal(out.clients[0].archivedAt,'2026-01-01');
 assert.equal(out.projects[0].colour,'#123456');
 assert.equal(out.tasks[0].assignee,'someone');
 assert.equal(JSON.stringify(out.tasks[0].subtasks),JSON.stringify([{id:'s1',done:false}]));
 assert.equal(out.clients[0].name,'Alpha');          // and the fields we do own still work
 assert.equal(out.version,a.SCHEMA());               // rewritten at our version, not theirs
 assert.equal(out.tasks[0].x,undefined);             // the carrier itself never leaks out
});
test('a carried field cannot shadow one the app owns, and oversized carriers are dropped',()=>{
 const {a}=app();
 const doc=backup();
 doc.tasks[0].x={title:'HIJACKED'};                  // the carrier key itself is never trusted
 a.setState(doc);
 assert.equal(a.state().tasks[0].title,'Write');
 assert.equal(a.serialize().tasks[0].title,'Write');
 const fat=backup();
 fat.tasks[0].blob='z'.repeat(5000);                 // past EXTRA_BUDGET
 a.setState(fat);
 assert.equal(a.serialize().tasks[0].blob,undefined);
 const slim=backup();
 slim.tasks[0].blob='z'.repeat(100);
 a.setState(slim);
 assert.equal(a.serialize().tasks[0].blob.length,100);
});
test('normalize stays stable across repeated round trips so history comparison holds',()=>{
 const {a}=app();
 const doc=backup();doc.tasks[0].futureField={nested:[1,2]};doc.custom='kept';
 a.setState(doc);
 const once=JSON.stringify(a.serialize());
 a.setState(JSON.parse(once));
 assert.equal(JSON.stringify(a.serialize()),once);   // byte-identical, or undo/dirty checks break
 a.setState(JSON.parse(JSON.stringify(a.serialize())));
 assert.equal(JSON.stringify(a.serialize()),once);
});
test('a backup written before a field existed still loads',()=>{
 const {a,ctx}=app();a.capture();
 const v1={clients:[{id:'c1',name:'Alpha'}],projects:[{id:'p1',clientId:'c1',name:'Build'}],
  tasks:[{id:'t1',projectId:'p1',clientId:'c1',title:'Old task'}]};   // no version, no focus, no order
 assert(a.importBackup(JSON.stringify(v1),'v1.json'));
 assert.doesNotMatch(ctx.confirm.title,/newer/i);
 ctx.confirm.onConfirm();
 const out=a.serialize();
 assert.equal(out.version,a.SCHEMA());
 assert.equal(out.tasks[0].order,1000);              // placed by the migration
 assert.equal(out.focusSettings.focusMinutes,25);    // defaulted
 assert.equal(JSON.stringify(out.focusSessions),'[]');
});
test('a project whose client is missing is kept and filed under Unassigned',()=>{
 const {a,ctx}=app();a.capture();
 // Dropping it took a project, its name and its grouping out of the document
 // silently. Its tasks already survived; the project itself did not.
 a.setState({version:4,clients:[{id:'c1',name:'Alpha'}],
  projects:[{id:'p1',clientId:'c1',name:'Build'},{id:'p2',clientId:'GONE',name:'Q4 Restructure'}],
  tasks:[{id:'t1',projectId:'p2',clientId:'GONE',title:'Board paper',notes:'the important one'},
         {id:'t2',projectId:'p1',clientId:'c1',title:'Normal task'}]});
 assert.equal(a.state().projects.length,2);
 const orphan=a.state().projects.find(p=>p.id==='p2');
 assert.equal(orphan.name,'Q4 Restructure');
 assert.equal(orphan.clientId,'');                       // no client, not deleted
 assert.equal(JSON.stringify(a.unassignedProjects().map(p=>p.id)),JSON.stringify(['p2']));
 const task=a.state().tasks.find(t=>t.id==='t1');
 assert.equal(task.projectId,'p2');                      // still in its project
 assert.equal(task.clientId,'');
 assert.equal(task.notes,'the important one');
 let html=a.renderUnassigned();
 assert(html.includes('Q4 Restructure'),'the orphaned project renders nowhere');
 assert(html.includes('1 open task'),'its task is not counted in the card');
 a.setOpenKey('p:p2');                                   // a project card opens like any other
 html=a.renderUnassigned();
 assert(html.includes('Board paper'));
 assert(a.renderClient(a.state().clients[0]).includes('Build'));   // and Alpha is untouched
 assert(!a.renderClient(a.state().clients[0]).includes('Q4 Restructure'));
 // and it is a destination a task can be filed into
 a.editItem('task','t2');
 assert(ctx.form.fields.find(f=>f.key==='target').options.includes('Q4 Restructure'));
});
test('the drafting request carries relevant open tasks, not the whole planner',()=>{
 const {a}=app();
 a.setState({clients:[{id:'c1',name:'Alpha'},{id:'c2',name:'Beta'}],
  projects:[{id:'p1',clientId:'c2',name:'Market Analysis'}],
  tasks:[{id:'open',clientId:'c1',title:'ALPHA_OPEN',status:'To Do'},
         {id:'done',clientId:'c1',title:'ALPHA_DONE',status:'Done'},
         {id:'other',clientId:'c2',title:'BETA_WORK',status:'To Do'},
         {id:'loose',title:'NO_HOME_YET',status:'To Do'}]});
 const named=a.buildPrompt('spoke to Alpha this morning');
 assert(named.includes('ALPHA_OPEN'),'work under the named client is missing');
 assert(named.includes('NO_HOME_YET'),'unassigned work must always come along');
 assert(!named.includes('ALPHA_DONE'),'finished work is still being sent');
 assert(!named.includes('BETA_WORK'),'an unmentioned client\u2019s work is still being sent');
 // naming a project names its client
 assert(a.buildPrompt('finish the Market Analysis deck').includes('BETA_WORK'));
 // a note naming nobody still carries unassigned work, and nothing else
 const vague=a.buildPrompt('call went fine');
 assert(vague.includes('NO_HOME_YET'));
 assert(!vague.includes('ALPHA_OPEN')&&!vague.includes('BETA_WORK'));
 // short names must not match inside longer words
 assert(!a.buildPrompt('we need to alphabetise the index').includes('ALPHA_OPEN'));
 // and the model is told the view is partial, so it does not assume a gap
 assert(/filtered view/i.test(named));
 // the readable id lists stay: the rules tell the model to copy ids from them
 assert(named.includes('- id: c1 | name: Alpha'));
});
test('an absurd version in a backup does not spin the migration loop',()=>{
 const {a}=app();
 // A hand-edited or corrupt version used to run the migration loop from that
 // number up to the current one, freezing the tab before the import dialog
 // appeared. -5e6 is the mild case that still returns unfixed (about three
 // seconds) so this fails rather than hanging the suite; a real corrupt file
 // can carry -2e9 and never come back at all.
 const started=Date.now();
 const out=a.normalize({version:-5e6,clients:[{id:'c1',name:'Alpha'}],projects:[],tasks:[]});
 assert(Date.now()-started<1000,'normalize took '+(Date.now()-started)+'ms');
 assert.equal(out.clients.length,1);
 assert.equal(a.serialize().version,a.SCHEMA());
 assert.equal(a.normalize({version:1e9,clients:[],projects:[],tasks:[]}).clients.length,0);
});
test('a record made in the Add dialogs serialises the same before and after a reload',()=>{
 const {a,ctx}=app();a.setState({clients:[],projects:[],tasks:[]});a.capture();
 // Not cosmetic: commit() and the remote-sync check compare serialized JSON,
 // so a record whose shape differs from normalize's reads as a foreign edit.
 a.addClient(); ctx.form.onSubmit({name:'Alpha'});
 a.addProject(); ctx.form.onSubmit({name:'Build',clientId:a.state().clients[0].id});
 a.addTask(); ctx.form.onSubmit({title:'One',target:'p:'+a.state().projects[0].id,dueDate:'',note:'',notes:''});
 const once=JSON.stringify(a.serialize());
 a.setState(JSON.parse(once));
 assert.equal(JSON.stringify(a.serialize()),once);
});
test('deleting a project lands its tasks at the end of the client list, not on top of it',()=>{
 const {a,ctx}=app();a.capture();
 a.setState({clients:[{id:'c1',name:'Alpha'}],projects:[{id:'p1',clientId:'c1',name:'Build'}],tasks:[
  {id:'loose',clientId:'c1',title:'Already here',status:'To Do',order:1000},
  {id:'a',projectId:'p1',clientId:'c1',title:'A',status:'To Do',order:1000},
  {id:'b',projectId:'p1',clientId:'c1',title:'B',status:'To Do',order:2000}]});
 a.deleteItem('project','p1');
 ctx.confirm.onConfirm();
 const order=id=>a.state().tasks.find(t=>t.id===id).order;
 assert.equal(a.state().tasks.filter(t=>t.projectId).length,0);
 assert(order('loose')<order('a'),'a landed on or above the task already there');
 assert(order('a')<order('b'),'the pair lost its own sequence');
 const orders=a.state().tasks.map(t=>t.order);
 assert.equal(new Set(orders).size,orders.length,'two tasks share an order');
});
test('a backup carrying one id twice keeps both records and makes both editable',()=>{
 const {a}=app();
 // Every lookup is byId, which returns the first match, so a second record on
 // the same id would render but resist every edit and delete.
 const merged={clients:[{id:'c1',name:'Alpha'},{id:'c1',name:'Beta'}],
  projects:[{id:'p1',clientId:'c1',name:'Build'},{id:'p1',clientId:'c1',name:'Ship'}],
  tasks:[{id:'t1',projectId:'p1',clientId:'c1',title:'First'},
         {id:'t1',projectId:'p1',clientId:'c1',title:'Second'}]};
 const out=a.normalize(merged);
 for (const [label,list] of [['client',out.clients],['project',out.projects],['task',out.tasks]]) {
  assert.equal(list.length,2,label+' was dropped rather than re-identified');
  assert.notEqual(list[0].id,list[1].id,'two '+label+'s still share one id');
 }
 assert.equal(out.clients[0].id,'c1');                       // the first keeps its id
 assert.equal(out.clients[1].name,'Beta');                   // and nothing is lost
 a.setState(out);
 a.setStatus('task',a.state().tasks[1].id,'Done');
 assert.equal(a.state().tasks[1].status,'Done');
 assert.equal(a.state().tasks[0].status,'To Do');            // the edit hit the right one
});
test('import refuses bad input atomically and names the drafts-file mistake',()=>{
 const {a}=app();a.setState(backup());
 const before=JSON.stringify(a.serialize());
 for (const bad of ['not json','null','42','"text"','{}','{"clients":"nope"}']) {
  assert.equal(a.importBackup(bad,'x.json'),false,bad);
  assert.equal(JSON.stringify(a.serialize()),before);
 }
 assert.equal(a.importBackup('[{"action":"task","title":"One"}]','drafts.json'),false);
 assert.match(a.lastToast()||'',/drafts file/i);
 assert.equal(JSON.stringify(a.serialize()),before);
});
test('import is one undoable step and clears stale view state',()=>{
 const {a,ctx}=app();a.setState(backup());a.capture();
 a.setSearch('write');a.select(['t1']);a.setScope('c1');
 const before=JSON.stringify(a.serialize());
 const other=backup();other.clients[0].name='Beta';other.tasks[0].title='Different';
 assert(a.importBackup(JSON.stringify(other),'other.json'));
 ctx.confirm.onConfirm();
 assert.equal(a.state().clients[0].name,'Beta');
 a.recoverChange(false);                             // one Undo brings the old planner back
 assert.equal(JSON.stringify(a.serialize()),before);
});
test('the summary counts what the user is about to get',()=>{
 const {a}=app();
 assert.equal(a.describeDoc(a.normalize(backup())),'1 client, 1 project, 1 task, 0 focus sessions');
 assert.equal(a.describeDoc(a.normalize({clients:[],projects:[],tasks:[]})),
  '0 clients, 0 projects, 0 tasks, 0 focus sessions');
});
test('migrate leaves a current document alone and versions an unversioned one',()=>{
 const {a}=app();
 const doc=backup();
 assert.equal(JSON.stringify(a.migrate(doc)),JSON.stringify(doc));
 assert.equal(a.serialize.call(null,a.normalize({clients:[]})).version,a.SCHEMA());
});

/* ---- the row's actions moved into one menu; search shows where a task lives ---- */
test('the row menu still offers every action the row used to carry inline',()=>{
 const {a,ctx}=app();
 a.setState({clients:[{id:'c1',name:'Alpha'}],projects:[{id:'p1',clientId:'c1',name:'Build'}],
  tasks:[{id:'t1',projectId:'p1',clientId:'c1',title:'Write',status:'To Do',order:1000,notes:'Some notes'},
         {id:'t2',projectId:'p1',clientId:'c1',title:'No notes',status:'To Do',dueDate:'2026-01-01',order:2000}]});
 a.capture();
 a.taskMenu('t1',{classList:{add(){}}});
 const labels=Array.from(ctx.sheet.actions,x=>x.label);
 assert.equal(ctx.sheet.title,'Write');
 assert(labels.some(l=>/due date/i.test(l)));
 assert(labels.some(l=>/^Move/.test(l)));
 assert(labels.some(l=>/^Edit/.test(l)));
 assert(labels.some(l=>/notes/i.test(l)));              // only because this task has notes
 assert(labels.some(l=>/^Delete/.test(l)));
 assert.equal(ctx.sheet.actions[ctx.sheet.actions.length-1].danger,true);
 a.taskMenu('t2',{classList:{add(){}}});
 const plain=Array.from(ctx.sheet.actions,x=>x.label);
 assert(!plain.some(l=>/notes/i.test(l)));              // no notes, no entry
 assert(plain.some(l=>/change the due date/i.test(l))); // wording follows the task
 const html=a.renderTasks(a.state().tasks,'k','');
 assert.match(html,/data-act="task-menu"/);
 assert.doesNotMatch(html,/data-act="task-move"/);      // no longer sitting on the row
 assert.doesNotMatch(html,/data-act="task-notes"/);
 assert.doesNotMatch(html,/data-act="delete" data-kind="task"/);
});
test('a search result names the client and project it belongs to',()=>{
 const {a}=app();
 a.setState({clients:[{id:'c1',name:'Alpha',accent:'#4c6385'}],projects:[{id:'p1',clientId:'c1',name:'Build'}],
  tasks:[{id:'t1',projectId:'p1',clientId:'c1',title:'Write the scope',status:'To Do',order:1000},
         {id:'t2',title:'Loose scope note',status:'To Do',order:2000}]});
 const chip=a.taskHomeChip(a.state().tasks[0]);
 assert.match(chip,/class="task-home"/);
 assert.match(chip,/--hue:#4c6385/);                    // carries the client's own colour
 assert.match(chip,/<b>Alpha<\/b>/);
 assert.match(chip,/Build/);
 assert.match(a.taskHomeChip(a.state().tasks[1]),/<b>Unassigned<\/b>/);
 // it only appears while searching, since the board's nesting already says it
 assert.doesNotMatch(a.renderTasks(a.state().tasks,'k',''),/task-home/);
 a.setSearch('scope');
 assert.match(a.renderTasks(a.state().tasks,'k',''),/task-home/);
});
test('search folds Quick add away and gives it back, without changing the saved preference',()=>{
 const {a,element,data}=app();
 const card=element('qaCard'); card.open=true;
 a.setSearch('scope'); a.syncCaptureForSearch();
 assert.equal(card.open,false);                         // out of the way while searching
 a.setSearch(''); a.syncCaptureForSearch();
 assert.equal(card.open,true);                          // and back when cleared
 // while folded away, what gets saved is still the user's own choice
 a.setSearch('scope'); a.syncCaptureForSearch();
 a.setExpanded('p:p1');                                 // any change that persists layout
 const saved=JSON.parse(data.get('project-planner-v1-view')||'{}');
 if ('captureOpen' in saved) assert.equal(saved.captureOpen,true);
});

/* ---- steps: a checklist inside a task, never a fourth level ---- */
// vm-created values do not share this realm's prototypes, so compare structurally
const eq=(actual,expected)=>assert.equal(JSON.stringify(actual),JSON.stringify(expected));

const withSteps=(steps)=>({clients:[{id:'c1',name:'Alpha'}],projects:[{id:'p1',clientId:'c1',name:'Build'}],
 tasks:[{id:'t1',projectId:'p1',clientId:'c1',title:'Write',status:'To Do',order:1000,steps:steps}]});

test('a task with no steps is untouched by the feature existing',()=>{
 const {a}=app();
 a.setState(withSteps([]));
 assert.equal(a.stepsChip(a.state().tasks[0]),'');        // no chip
 assert.equal(a.stepsBlock(a.state().tasks[0]),'');       // no list
 const html=a.renderTasks(a.state().tasks,'k','');
 assert.doesNotMatch(html,/chip steps|step-list/);
});
test('steps are added, counted, ticked, renamed and removed',()=>{
 const {a}=app();
 a.setState(withSteps([]));
 assert.equal(a.addStep('t1','Draft the scope'),true);
 assert.equal(a.addStep('t1','  Get legal sign-off  '),true);   // trimmed
 assert.equal(a.addStep('t1','   '),false);                     // a blank step is not a step
 assert.equal(a.addStep('missing','x'),false);
 const steps=()=>a.state().tasks[0].steps;
 eq(steps().map(s=>s.text),['Draft the scope','Get legal sign-off']);
 assert.match(a.stepsChip(a.state().tasks[0]),/0 of 2 steps/);
 a.setStepDone('t1',steps()[0].id,true);
 assert.equal(a.stepsDone(a.state().tasks[0]),1);
 assert.match(a.stepsChip(a.state().tasks[0]),/1 of 2 steps/);
 a.setStepDone('t1',steps()[1].id,true);
 assert.match(a.stepsChip(a.state().tasks[0]),/all-done/);       // the chip goes green at 100%
 a.renameStep('t1',steps()[0].id,'Draft the scope properly');
 assert.equal(steps()[0].text,'Draft the scope properly');
 a.renameStep('t1',steps()[0].id,'   ');                         // clearing removes it
 assert.equal(steps().length,1);
 a.removeStep('t1',steps()[0].id);
 assert.equal(steps().length,0);
});
test('a step never becomes a task: only text and a tick survive normalize',()=>{
 const {a}=app();
 a.setState(withSteps([{id:'s1',text:'Real',done:true,status:'In Progress',dueDate:'2026-01-01',order:5}]));
 const step=a.state().tasks[0].steps[0];
 eq(Object.keys(step).sort(),['done','id','text']);
 assert.equal(step.done,true);
});
test('malformed steps are dropped rather than breaking the task',()=>{
 const {a}=app();
 a.setState(withSteps([null,'text',{},{text:''},{text:'   '},{id:'d',text:'Keep'},{id:'d',text:'Duplicate id'}]));
 eq(a.state().tasks[0].steps.map(s=>s.text),['Keep']);
 a.setState(withSteps('not an array'));
 eq(a.state().tasks[0].steps,[]);
 // a step missing an id is given one rather than discarded
 a.setState(withSteps([{text:'No id here'}]));
 assert.equal(a.state().tasks[0].steps.length,1);
 assert(a.state().tasks[0].steps[0].id);
});
test('steps survive a backup round trip and count as a known field',()=>{
 const {a,ctx}=app();
 a.setState(withSteps([{id:'s1',text:'One',done:false},{id:'s2',text:'Two',done:true}]));
 const exported=JSON.parse(JSON.stringify(a.serialize()));
 assert.equal(exported.version,a.SCHEMA());
 assert.equal(exported.tasks[0].steps.length,2);
 assert.equal(exported.tasks[0].x,undefined);            // known field, not carried as foreign
 a.capture();
 a.setState({clients:[],projects:[],tasks:[]});
 assert(a.importBackup(JSON.stringify(exported),'b.json'));
 ctx.confirm.onConfirm();
 assert.equal(JSON.stringify(a.serialize()),JSON.stringify(exported));
});
test('search reaches into step text',()=>{
 const {a}=app();
 a.setState(withSteps([{id:'s1',text:'Chase the procurement team',done:false}]));
 a.setSearch('procurement');
 eq(a.matchingTasks().map(t=>t.title),['Write']);
 a.setSearch('nothinghere');
 eq(a.matchingTasks().map(t=>t.title),[]);
});
test('the menu wording follows whether the task has steps yet',()=>{
 const {a,ctx}=app();
 a.setState(withSteps([]));
 a.capture();
 a.taskMenu('t1',{classList:{add(){}}});
 assert.equal(ctx.sheet.actions[0].label,'Break into steps');
 a.addStep('t1','One');
 a.taskMenu('t1',{classList:{add(){}}});
 assert.equal(ctx.sheet.actions[0].label,'Add a step');
});
test('a step list is capped, and so is a step',()=>{
 const {a}=app();
 a.setState(withSteps(Array.from({length:150},(_,i)=>({id:'s'+i,text:'Step '+i,done:false}))));
 assert.equal(a.state().tasks[0].steps.length,100);
 assert.equal(a.addStep('t1','one too many'),false);
 a.setState(withSteps([{id:'s1',text:'z'.repeat(900),done:false}]));
 assert.equal(a.state().tasks[0].steps[0].text.length,500);
});

/* ---- the sidebar client list stays a fixed height however many clients ---- */
const roster=(n,counts)=>({
 clients:Array.from({length:n},(_,i)=>({id:'c'+i,name:'Client '+String.fromCharCode(65+i),status:'Active'})),
 projects:[],
 tasks:[].concat(...Array.from({length:n},(_,i)=>
   Array.from({length:counts[i]||0},(_,j)=>({id:'t'+i+'_'+j,clientId:'c'+i,title:'T',status:'To Do',order:(j+1)*1000})))) });
const navNames=h=>[...h.matchAll(/<span class="nt">([^<]*)<\/span>/g)].map(m=>m[1]);

test('the client list shows every client while there are few enough',()=>{
 const {a}=app(); a.setState(roster(5,[1,2,3,4,5])); a.renderNav();
 const names=navNames(a.navHTML());
 assert.equal(names.length,6);                      // All work plus five clients
 assert.doesNotMatch(a.navHTML(),/navmore/);        // and no expander
});
test('past five it caps, busiest first, with an expander for the rest',()=>{
 const {a}=app(); a.setState(roster(8,[1,9,2,7,3,8,4,6])); a.renderNav();
 const names=navNames(a.navHTML());
 assert.equal(names[0],'All work');
 // B=9, F=8, D=7, H=6, G=4 are the five busiest
 eq(names.slice(1),['Client B','Client F','Client D','Client H','Client G']);
 assert.match(a.navHTML(),/data-act="more" data-key="nav"[^>]*aria-expanded="false"/);
 assert.match(a.navHTML(),/Show 3 more/);
 a.setExpanded('nav'); a.renderNav();
 assert.equal(navNames(a.navHTML()).length,9);      // All work plus all eight
 assert.match(a.navHTML(),/Show fewer/);
});
test('clients with equal counts hold a stable alphabetical order',()=>{
 const {a}=app(); a.setState(roster(6,[2,2,2,2,2,2])); a.renderNav();
 eq(navNames(a.navHTML()).slice(1),['Client A','Client B','Client C','Client D','Client E']);
});
test('the selected client is never hidden by the cap',()=>{
 const {a}=app(); a.setState(roster(8,[9,8,7,6,5,4,3,1]));
 a.setScope('c7');                                  // the quietest, well outside the top five
 a.renderNav();
 const names=navNames(a.navHTML());
 assert.equal(names.length,6);                      // still five clients, not six
 assert(names.includes('Client H'),'selected client missing from the list');
 assert.match(a.navHTML(),/class="navitem on" data-act="scope" data-id="c7"/);
});
test('archived clients only appear in the list when the filter allows them',()=>{
 const {a}=app();
 const f=roster(6,[1,1,1,1,1,1]); f.clients[0].status='Archived';
 a.setState(f); a.renderNav();
 assert(!navNames(a.navHTML()).includes('Client A'));
 assert.doesNotMatch(a.navHTML(),/navmore/);        // five visible, so no expander
 a.setFilters({hideDone:true,showArchived:true}); a.renderNav();
 assert.match(a.navHTML(),/Show 1 more/);
});

/* ---- a recorded session's time can be corrected after the fact ---- */
const oneSession=(mins,startedAt)=>{
 const start=Date.parse(startedAt);
 return {clients:[{id:'c1',name:'Alpha'}],projects:[],tasks:[],focusSettings:null,focusRun:null,
  focusSessions:[{id:'f1',runId:'r1',assignment:{clientId:'c1',clientName:'Alpha',taskId:'',taskTitle:'',projectId:'',projectName:''},
   note:'Original note',outcome:'completed',
   intervals:[{start:start,end:start+mins*60000/2},{start:start+mins*60000/2+600000,end:start+mins*60000+600000}]}]};
};

test('editing a session rewrites its recorded time and what it contributes to the week',()=>{
 const {a,ctx}=app();
 a.setState(oneSession(60,'2026-09-22T09:00:00'));
 const s=()=>a.state().focusSessions[0];
 assert.equal(s().durationMs,60*60000);
 a.capture(); a.editFocusSession('f1');
 // the dialog offers the current length, in minutes, for the duration field.
 // By key, not position: the field order is a layout decision, not a contract.
 const field=k=>ctx.form.fields.find(f=>f.key===k);
 assert.equal(field('minutes').type,'duration');
 assert.equal(field('minutes').value,60);
 assert.equal(field('date').type,'date');
 assert.equal(field('date').value,'2026-09-22');
 ctx.form.onSubmit({minutes:'95',target:'c:c1',note:'Corrected'});
 assert.equal(s().durationMs,95*60000);
 assert.equal(s().note,'Corrected');
 // the week total follows the correction
 const week=a.weekBounds(0,Date.parse('2026-09-22T12:00:00'));
 assert.equal(a.sessionsInRange(week)[0].ms,95*60000);
});
test('a retimed session keeps its start, so it stays in the same week',()=>{
 const {a}=app();
 a.setState(oneSession(30,'2026-09-22T09:00:00'));
 const before=a.state().focusSessions[0].intervals[0].start;
 assert.equal(a.setSessionMinutes(a.state().focusSessions[0],120),true);
 const s=a.state().focusSessions[0];
 assert.equal(s.intervals[0].start,before);
 assert.equal(s.intervals.length,1);                       // the pause structure is gone
 assert.equal(s.intervals[0].end-s.intervals[0].start,120*60000);
 assert.equal(Date.parse(s.endedAt),s.intervals[0].end);   // endedAt follows
 assert.equal(s.durationMs,120*60000);
});
test('a retimed session survives normalize unchanged',()=>{
 const {a}=app();
 a.setState(oneSession(30,'2026-09-22T09:00:00'));
 a.setSessionMinutes(a.state().focusSessions[0],45);
 const once=JSON.stringify(a.serialize());
 a.setState(JSON.parse(once));
 assert.equal(JSON.stringify(a.serialize()),once);
 assert.equal(a.state().focusSessions[0].durationMs,45*60000);
});
test('a length that is not a positive number leaves the session alone',()=>{
 const {a}=app();
 a.setState(oneSession(30,'2026-09-22T09:00:00'));
 const s=()=>a.state().focusSessions[0];
 for (const bad of [0,-5,'abc',null,undefined,NaN]) {
  assert.equal(a.setSessionMinutes(s(),bad),false,String(bad));
  assert.equal(s().durationMs,30*60000);
 }
 assert.equal(a.setSessionMinutes(s(),30),false);          // unchanged is not a rewrite
 assert.equal(a.setSessionMinutes(s(),5000),true);         // and it is capped at a day
 assert.equal(s().durationMs,1440*60000);
});
test('a logged session can be moved to another day, keeping its clock time and its parts',()=>{
 const {a,ctx}=app();
 a.setState(oneSession(60,'2026-09-22T09:00:00'));
 const s=()=>a.state().focusSessions[0];
 const parts=s().intervals.length;
 assert.equal(parts,2);                                    // a timer run, with a pause in it
 a.capture(); a.editFocusSession('f1');
 ctx.form.onSubmit({date:'2026-09-18',minutes:'60',target:'c:c1',note:'Original note'});
 const start=new Date(s().intervals[0].start);
 assert.equal(start.getFullYear()+'-'+String(start.getMonth()+1).padStart(2,'0')+'-'+String(start.getDate()).padStart(2,'0'),'2026-09-18');
 assert.equal(start.getHours(),9);                         // the clock time comes along
 assert.equal(start.getMinutes(),0);
 assert.equal(s().durationMs,60*60000);                    // and the measurement is untouched
 assert.equal(s().intervals.length,parts,'the pause was collapsed away');
 assert.equal(s().intervals[1].start-s().intervals[0].end,600000);   // the gap is preserved
 assert.equal(Date.parse(s().startedAt),s().intervals[0].start);
 assert.equal(Date.parse(s().endedAt),s().intervals[1].end);
 assert.match(a.lastToast(),/moved to/);
});
test('moving a session and retiming it in one edit does both, from the new day',()=>{
 const {a,ctx}=app();
 a.setState(oneSession(60,'2026-09-22T09:00:00'));
 const s=()=>a.state().focusSessions[0];
 a.capture(); a.editFocusSession('f1');
 ctx.form.onSubmit({date:'2026-09-15',minutes:'25',target:'c:c1',note:'Original note'});
 const start=new Date(s().intervals[0].start);
 assert.equal(start.getDate(),15);
 assert.equal(start.getHours(),9);                         // retimed from the moved start, not the old one
 assert.equal(s().durationMs,25*60000);
 assert.equal(s().intervals.length,1);                     // a retime does collapse to one span
 assert.equal(s().intervals[0].end-s().intervals[0].start,25*60000);
});
test('a malformed or absent date leaves the session where it is',()=>{
 const {a,ctx}=app();
 a.setState(oneSession(60,'2026-09-22T09:00:00'));
 const s=()=>a.state().focusSessions[0];
 const before=s().startedAt;
 a.capture(); a.editFocusSession('f1');
 ctx.form.onSubmit({date:'22/09/2026',minutes:'60',target:'c:c1',note:'Original note'});
 assert.equal(s().startedAt,before);                       // refused outright
 assert.match(a.lastToast(),/YYYY-MM-DD/);
 a.editFocusSession('f1');
 ctx.form.onSubmit({minutes:'45',target:'c:c1',note:'Original note'});   // no date supplied at all
 assert.equal(new Date(s().intervals[0].start).getDate(),22);            // day untouched
 assert.equal(s().durationMs,45*60000);                                  // the rest still applies
});
test('the duration field reads hours and minutes back as one total',()=>{
 const {a,ctx,element}=app();
 a.setState(oneSession(30,'2026-09-22T09:00:00'));
 a.capture(); a.editFocusSession('f1');
 const field=k=>ctx.form.fields.find(f=>f.key===k);
 // 0h30 today; the dialog seeds each box from the total
 assert.equal(field('minutes').value,30);
 a.setState(oneSession(135,'2026-09-22T09:00:00'));
 a.editFocusSession('f1');
 assert.equal(field('minutes').value,135);                 // 2h15, split by the renderer
});
