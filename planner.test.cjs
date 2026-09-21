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
 ${original?'':'matchingTasks,moveTasks,deleteSelectedTasks,recoverChange,commit,serialize,focusStart,focusPause,focusFinish,focusTick,focusRemaining,weekBounds,focusWeekSessions,renderFocusLog,editFocusSession,addFocusSession,focusLogExport,taskSummary,renderClient,renderUnassigned,renderProjects,setStatus,startInlineEdit,commitInlineEdit,cancelInlineEdit,inline:()=>inlineEdit,setSearch:x=>searchQuery=x,setScope:x=>scope=x,select:ids=>selectedTasks=new Set(ids),setOpenKey:k=>openState[k]=true,'}
 setMode:()=>mode='local',setExpanded:key=>expanded[key]=true,setFilters:x=>filters=x,
 stubUI:()=>{render=()=>{};toast=()=>{};lookupBrand=()=>{};${original?'':'renderFocus=()=>{};renderFocusClock=()=>{};'}},
 capture:()=>{openConfirm=x=>globalThis.confirm=x;openForm=x=>globalThis.form=x;},
 applyPendingRemote, AIModel};})();`;
 if(original)code=code.replace(',loadChatDrafts,saveContext,initContext','');
 const els={};const data=new Map();
 const element=id=>els[id]??=( {value:'',textContent:'',innerHTML:'',disabled:false,dataset:{},classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(n,f){this.listeners[n]=f},focus(){},select(){},querySelector(){return element('confirmBtn')}});
 const ctx={console,URLSearchParams,location:{search:''},Intl,Date,AbortController,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},navigator:{},document:{getElementById:element,addEventListener(){},querySelector(){return element('save')}}};ctx.window=ctx;ctx.crypto=require('node:crypto').webcrypto;vm.createContext(ctx);vm.runInContext(code,ctx);ctx.api.stubUI();ctx.api.setMode();return {a:ctx.api,ctx,element,data};
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
test('context included, saved, reloaded with current tasks and date',()=>{const {a,element}=app();a.setState(fixture());a.initContext();element('contextInput').value='# Alias\nAC means Alpha';a.saveContext();element('contextInput').value='';a.initContext();const prompt=a.buildPrompt('Send scope');assert(prompt.includes('AC means Alpha'));assert(prompt.includes('Task 14'));assert(prompt.includes('Send scope'));});
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
 a.focusStart(epoch+110*minute);a.focusTick(epoch+125*minute);assert.equal(a.state().focusRun.elapsedMs,25*minute);
 a.focusStart(epoch+200*minute);a.focusPause(epoch+202*minute);a.setState(a.serialize());
 assert.equal(a.state().focusRun.remainingMs,3*minute);a.focusStart(epoch+300*minute);a.focusTick(epoch+303*minute);
 assert.equal(a.state().focusRun.elapsedMs,30*minute);assert.equal(a.state().focusRun.completedMs,25*minute);
 a.focusStart(epoch+303*minute);a.focusTick(epoch+328*minute);a.focusStart(epoch+328*minute);a.focusTick(epoch+333*minute);
 assert.equal(a.state().focusRun.segmentMs,15*minute);
});
test('pause, resume and early finish record only active intervals',()=>{const {a}=timer(5,5,0);a.focusStart(epoch);a.focusPause(epoch+20000);a.focusStart(epoch+120000);a.focusFinish(epoch+130000);assert.equal(a.state().focusSessions.length,1);assert.equal(a.state().focusSessions[0].durationMs,30000);assert.equal(a.state().focusSessions[0].intervals.length,2);assert.equal(a.state().focusSessions[0].outcome,'ended-early');a.focusFinish(epoch+140000);assert.equal(a.state().focusSessions.length,1);});
test('background tab completes one block without inventing subsequent work',()=>{const {a}=timer();a.focusStart(epoch);a.focusTick(epoch+4*60*minute);assert.equal(a.state().focusSessions[0].durationMs,25*minute);assert.equal(a.state().focusRun.status,'ready');a.focusTick(epoch+5*60*minute);assert.equal(a.state().focusSessions.length,1);});
test('reload resumes timestamp and completion remains idempotent after normalization',()=>{const {a,data}=timer(1,1,0);a.focusStart(epoch);const snapshot=JSON.parse(data.get('project-planner-v1'));a.setState(snapshot);a.focusTick(epoch+2*minute);assert.equal(a.state().focusSessions.length,1);assert.equal(a.state().focusSessions[0].durationMs,minute);a.setState(JSON.parse(data.get('project-planner-v1')));a.focusTick(epoch+3*minute);assert.equal(a.state().focusSessions.length,1);});
test('JSON includes settings, active timer, task snapshots and notes',()=>{const {a,data}=timer(90,30,8);a.focusStart(epoch);assert.equal(a.serialize().version,2);a.focusFinish(epoch+45000);const json=JSON.parse(data.get('project-planner-v1'));assert.equal(json.focusSettings.repeat,false);assert.equal(json.focusSettings.totalMinutes,90);assert.equal(json.focusSettings.focusMinutes,30);assert.equal(json.focusSettings.breakMinutes,8);assert.equal(json.focusSessions[0].assignment.clientName,'Alpha');assert.equal(json.focusSessions[0].note,'Drafted client scope');assert.equal(json.focusRun.status,'completed');});
test('deleting linked task and undoing planner work preserve focus history',()=>{const {a,ctx}=timer(5,5,0);a.capture();a.focusStart(epoch);a.deleteItem('task','t0');ctx.confirm.onConfirm();a.focusFinish(epoch+minute);assert.equal(a.state().focusSessions[0].assignment.taskTitle,'Task 0');a.recoverChange(false);assert(a.state().tasks.some(t=>t.id==='t0'));assert.equal(a.state().focusSessions[0].durationMs,minute);assert.equal(a.state().focusRun.status,'completed');});
test('weekly allocation splits active intervals across Monday midnight',()=>{const {a}=timer();const monday=new Date(2026,8,21).getTime();const f=fixture();f.focusSessions=[{id:'cross',intervals:[{start:monday-5*minute,end:monday+5*minute}],assignment:{taskTitle:'Cross-week work'},outcome:'completed'}];a.setState(f);assert.equal(a.focusWeekSessions(a.weekBounds(0,monday))[0].ms,5*minute);assert.equal(a.focusWeekSessions(a.weekBounds(-1,monday))[0].ms,5*minute);});
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
  'date:date* minutes:number* target:select note:textarea');
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
