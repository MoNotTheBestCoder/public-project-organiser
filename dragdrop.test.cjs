const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function app() {
  let code=fs.readFileSync('project-planner-1.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1];
  code=code.slice(0,code.indexOf('  /* ------------------------------ start'))+`
    globalThis.api={makePlannerDrag,validPlannerDrop,applyPlannerDrop,renderTasks,renderProjects,renderClient,renderNav,recoverChange,serialize,
      visibleClients,dropEdgeFor:(t,y,p)=>dropEdgeFor(t,y,p),scope:()=>scope,setScope:x=>scope=x,page:()=>workspacePage,setPage:x=>workspacePage=x,
      setStatus,nextOrderFor,findDropTarget,dropEdgeFor,setSearch:x=>searchQuery=x,
      state:()=>state,select:ids=>selectedTasks=new Set(ids),undoCount:()=>undoStack.length,
      setState:x=>{state=normalize(x);historyBaseline=JSON.stringify(serialize());undoStack=[];redoStack=[];},
      block:()=>pendingRemote=normalize(serialize()),unblock:()=>pendingRemote=null,
      setup:()=>{mode='local';render=()=>{};toast=x=>globalThis.lastToast=x;renderFocus=()=>{};renderFocusClock=()=>{};}};
    })();`;
  const elements={},data=new Map(),listeners={};
  const element=id=>elements[id]??={value:'',textContent:'',innerHTML:'',classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelector(){return element('child')}};
  const ctx={console,URLSearchParams,location:{search:''},Intl,Date,AbortController,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},navigator:{},document:{getElementById:element,addEventListener:(type,fn)=>listeners[type]=fn,querySelector:()=>element('save'),querySelectorAll:()=>[],body:element('body')}};
  ctx.window=ctx;ctx.scrollTo=()=>{};ctx.crypto=require('node:crypto').webcrypto;
  vm.createContext(ctx);vm.runInContext(code,ctx);ctx.api.setup();
  ctx.api.setState({clients:[{id:'c1',name:'Alpha'},{id:'c2',name:'Beta'}],projects:[{id:'p1',clientId:'c1',name:'Report'},{id:'p2',clientId:'c2',name:'Delivery'}],tasks:[{id:'t1',title:'Write report',projectId:'p1',clientId:'c1'},{id:'t2',title:'Write report',projectId:'p1',clientId:'c1'},{id:'t3',title:'Follow up',clientId:'c1'}]});
  return {a:ctx.api,ctx,data,listeners,element};
}

test('task drag moves only the stable ID across clients and persists; undo/redo restore ownership',()=>{
  const {a,data}=app();
  assert(a.applyPlannerDrop(a.makePlannerDrag('task','t1'),'p:p2'));
  assert.equal(a.state().tasks[0].projectId,'p2');assert.equal(a.state().tasks[0].clientId,'c2');
  assert.equal(a.state().tasks[1].projectId,'p1');
  assert.equal(JSON.parse(data.get('project-planner-v1')).tasks[0].projectId,'p2');
  assert.equal(a.undoCount(),1);a.recoverChange(false);assert.equal(a.state().tasks[0].clientId,'c1');
  a.recoverChange(true);assert.equal(a.state().tasks[0].clientId,'c2');
});
test('dragging a selected task moves the selected batch in one undo step',()=>{
  const {a}=app();a.select(['t1','t3']);
  assert(a.applyPlannerDrop(a.makePlannerDrag('task','t1'),'p:p2'));
  assert.deepEqual(Array.from(a.state().tasks,t=>t.projectId),['p2','p1','p2']);
  assert.equal(a.undoCount(),1);a.recoverChange(false);assert.equal(a.state().tasks[2].projectId,'');
});
test('dragging an unselected task leaves other selected tasks in their existing location',()=>{
  const {a}=app();a.select(['t2']);
  assert(a.applyPlannerDrop(a.makePlannerDrag('task','t1'),'c:c2'));
  assert.equal(a.state().tasks[0].projectId,'');assert.equal(a.state().tasks[0].clientId,'c2');
  assert.equal(a.state().tasks[1].projectId,'p1');
});
test('task drop into Unassigned clears both ownership fields',()=>{
  const {a}=app();assert(a.applyPlannerDrop(a.makePlannerDrag('task','t1'),'u:none'));
  assert.equal(a.state().tasks[0].projectId,'');assert.equal(a.state().tasks[0].clientId,'');
});
test('project drag transfers all child task ownership and is undoable',()=>{
  const {a}=app();assert(a.applyPlannerDrop(a.makePlannerDrag('project','p1'),'c:c2'));
  assert.equal(a.state().projects[0].clientId,'c2');
  assert.deepEqual(Array.from(a.state().tasks,t=>t.clientId),['c2','c2','c1']);
  a.recoverChange(false);assert.equal(a.state().projects[0].clientId,'c1');
  assert.deepEqual(Array.from(a.state().tasks,t=>t.clientId),['c1','c1','c1']);
});
test('no-op, missing and unsupported destinations do not mutate or create history',()=>{
  const {a}=app(),before=JSON.stringify(a.serialize());
  assert.equal(a.applyPlannerDrop(a.makePlannerDrag('task','t1'),'p:p1'),false);
  assert.equal(a.applyPlannerDrop(a.makePlannerDrag('task','t1'),'p:missing'),false);
  assert.equal(a.applyPlannerDrop(a.makePlannerDrag('project','p1'),'p:p2'),false);
  assert.equal(a.applyPlannerDrop(a.makePlannerDrag('project','p1'),'u:none'),false);
  assert.equal(a.applyPlannerDrop(a.makePlannerDrag('client','c1'),'c:c1'),false);   // onto itself
  assert.equal(a.applyPlannerDrop(a.makePlannerDrag('client','c1'),'p:p1'),false);   // clients only sit beside clients
  assert.equal(a.applyPlannerDrop(a.makePlannerDrag('client','c1'),'u:none'),false);
  assert.equal(a.makePlannerDrag('client','missing'),null);
  assert.equal(a.makePlannerDrag('task','missing'),null);
  assert.equal(JSON.stringify(a.serialize()),before);assert.equal(a.undoCount(),0);
});
test('planner changes during a drag reject stale operation instead of overwriting edits',()=>{
  const {a,ctx}=app(),payload=a.makePlannerDrag('task','t1');
  a.state().tasks[0].title='Updated elsewhere';
  assert.equal(a.applyPlannerDrop(payload,'p:p2'),false);
  assert.equal(a.state().tasks[0].projectId,'p1');assert.equal(a.state().tasks[0].title,'Updated elsewhere');
  assert.match(ctx.lastToast,/changed while dragging/);assert.equal(a.undoCount(),0);
});
test('queued remote updates block drag start and drop',()=>{
  const {a}=app(),payload=a.makePlannerDrag('task','t1');a.block();
  assert.equal(a.makePlannerDrag('task','t1'),null);assert.equal(a.applyPlannerDrop(payload,'p:p2'),false);
  assert.equal(a.state().tasks[0].projectId,'p1');
});
test('rows drag whole with no handle, keep a pointer-free action route, and cards drag like rows',()=>{
  const {a,element}=app();
  const tasks=a.renderTasks(a.state().tasks,'test','');
  assert.match(tasks,/<div data-task-id="t1" data-drop-target="t:t1" draggable="true" data-drag-kind="task" data-id="t1"/);
  // Move, Edit and Delete moved off the row into one menu, so the row keeps a
  // keyboard- and touch-reachable route to them without reserving space.
  assert.match(tasks,/data-act="task-menu" data-id="t1"/);
  assert.doesNotMatch(tasks,/data-act="task-move"/);
  assert.doesNotMatch(tasks,/drag-handle/);                      // no per-list handle convention
  const projects=a.renderProjects(a.state().clients[0]);
  assert.match(projects,/<article class="project" data-project-id="p1" data-drop-target="p:p1" draggable="true" data-drag-kind="project" data-id="p1"/);
  assert.doesNotMatch(projects,/drag-handle/);
  const client=a.renderClient(a.state().clients[0]);
  assert.match(client,/data-client-id="c1" data-drop-target="c:c1" draggable="true" data-drag-kind="client" data-id="c1"/);
  assert.doesNotMatch(client,/drag-handle/);                     // the whole card, same as a row
  // the sidebar entry stays a destination only: it is a scope picker, not the board
  a.renderNav();assert.doesNotMatch(element('clientNav').innerHTML,/data-drag-kind="client"/);
  a.renderNav();assert.match(element('clientNav').innerHTML,/data-drop-target="c:c2"/);
});
test('task rows are insertion targets only outside search, where a position has no single meaning',()=>{
  const {a}=app();
  assert.match(a.renderTasks(a.state().tasks,'test',''),/data-drop-target="t:t1"/);
  a.setSearch('report');
  assert.doesNotMatch(a.renderTasks(a.state().tasks,'test',''),/data-drop-target="t:/);
});
test('a row target inserts before or after, taking the midpoint of its neighbours',()=>{
  const {a}=app();
  const order=id=>a.state().tasks.find(t=>t.id===id).order;
  assert.deepEqual([order('t1'),order('t2')],[1000,2000]);       // migrated from the legacy sort
  assert(a.applyPlannerDrop(a.makePlannerDrag('task','t3'),'t:t1','after'));
  assert.equal(order('t3'),1500);                                // between t1 and t2
  assert.equal(a.state().tasks.find(t=>t.id==='t3').projectId,'p1');   // and re-owned
  assert(a.applyPlannerDrop(a.makePlannerDrag('task','t3'),'t:t1','before'));
  assert.equal(order('t3'),0);                                   // a fresh gap past the first
});
test('Project planner is the way home: it always lands on every client',()=>{
  const {a,listeners}=app();
  const click=attrs=>listeners.click({target:{closest:()=>({getAttribute:k=>attrs[k]==null?null:attrs[k]})}});
  // looking at one client, then pressing Project planner
  a.setScope('c2');
  click({'data-act':'workspace','data-page':'planner'});
  assert.equal(a.scope(),'all','Project planner kept the client that was picked');
  assert.equal(a.page(),'planner');
  // the same from the Focus page, with a client still picked underneath
  a.setScope('c1');a.setPage('focus');
  click({'data-act':'workspace','data-page':'planner'});
  assert.equal(a.scope(),'all');
  assert.equal(a.page(),'planner');
  // going to Focus leaves the client choice alone: only the planner is home
  a.setScope('c1');
  click({'data-act':'workspace','data-page':'focus'});
  assert.equal(a.scope(),'c1');
  assert.equal(a.page(),'focus');
});
test('client cards reorder by dragging, and the sidebar keeps its own busiest-first order',()=>{
  const {a}=app();
  a.setState({clients:[{id:'c1',name:'Alpha',order:1000},{id:'c2',name:'Beta',order:2000},{id:'c3',name:'Gamma',order:3000}],
    projects:[],tasks:[{id:'t1',clientId:'c2',title:'One',status:'To Do'},{id:'t2',clientId:'c2',title:'Two',status:'To Do'}]});
  // join, not deepEqual: arrays built inside the sandbox do not share a
  // prototype with this realm, so deepEqual reports "not reference-equal".
  const board=()=>a.visibleClients().map(c=>c.name).join(',');
  assert.equal(board(),'Alpha,Beta,Gamma');
  assert(a.applyPlannerDrop(a.makePlannerDrag('client','c3'),'c:c1','before'));
  assert.equal(board(),'Gamma,Alpha,Beta');
  assert(a.applyPlannerDrop(a.makePlannerDrag('client','c3'),'c:c2','after'));
  assert.equal(board(),'Alpha,Beta,Gamma');
  // the board order is manual; the sidebar stays sorted by open work
  a.renderNav();
  assert.equal(a.undoCount()>0,true);                            // and it is undoable
});
test('a client dropped between two sharing an order still separates them',()=>{
  const {a}=app();
  a.setState({clients:[{id:'c1',name:'Alpha',order:1000},{id:'c2',name:'Beta',order:1000},{id:'c3',name:'Gamma',order:1000}],
    projects:[],tasks:[]});
  assert(a.applyPlannerDrop(a.makePlannerDrag('client','c3'),'c:c1','after'));
  const order=id=>a.state().clients.find(c=>c.id===id).order;
  assert(order('c1')<order('c3')&&order('c3')<order('c2'));
  const all=a.state().clients.map(c=>c.order);
  assert.equal(new Set(all).size,all.length,'two clients share an order');
});
test('a client card has a leading and trailing edge, but only while a client is dragging',()=>{
  const {a}=app();
  const card={getAttribute:()=>'c:c1',getBoundingClientRect:()=>({top:0,height:100,bottom:100})};
  assert.equal(a.dropEdgeFor(card,10,{kind:'client',ids:['c2']}),'before');
  assert.equal(a.dropEdgeFor(card,90,{kind:'client',ids:['c2']}),'after');
  // a task or project lands inside the card, so it has no edge
  assert.equal(a.dropEdgeFor(card,10,{kind:'task',ids:['t1']}),'');
  assert.equal(a.dropEdgeFor(card,10,{kind:'project',ids:['p1']}),'');
});
test('a drop between two tasks that share an order still separates them',()=>{
  const {a}=app();
  // Imports and merges can land two tasks on the same order, leaving no gap to
  // take the midpoint of. The drop has to renumber rather than stack.
  a.setState({clients:[{id:'c1',name:'Alpha'}],projects:[{id:'p1',clientId:'c1',name:'Report'}],
    tasks:[{id:'t1',title:'One',projectId:'p1',clientId:'c1',order:1000},
           {id:'t2',title:'Two',projectId:'p1',clientId:'c1',order:1000},
           {id:'t3',title:'Three',clientId:'c1',order:5000}]});
  const order=id=>a.state().tasks.find(t=>t.id===id).order;
  assert.deepEqual([order('t1'),order('t2')],[1000,1000]);
  assert(a.applyPlannerDrop(a.makePlannerDrag('task','t3'),'t:t1','after'));
  assert(order('t1')<order('t3')&&order('t3')<order('t2'));
  assert.equal(a.state().tasks.find(t=>t.id==='t3').projectId,'p1');
});
test('a drag batch keeps its own relative order when inserted',()=>{
  const {a}=app();a.select(['t1','t3']);
  assert(a.applyPlannerDrop(a.makePlannerDrag('task','t1'),'t:t2','after'));
  const by=id=>a.state().tasks.find(t=>t.id===id).order;
  assert(by('t2')<by('t1')&&by('t1')<by('t3'));
});
test('dropping a task on itself or on its own batch is rejected, not a no-op move',()=>{
  const {a}=app();a.select(['t1','t2']);
  const payload=a.makePlannerDrag('task','t1');
  assert.equal(a.validPlannerDrop(payload,'t:t1'),false);
  assert.equal(a.validPlannerDrop(payload,'t:t2'),false);
  assert.equal(a.validPlannerDrop(payload,'t:missing'),false);
  assert.equal(a.validPlannerDrop(a.makePlannerDrag('project','p1'),'t:t1'),false);
});
test('a container drop appends to the end of the destination rather than carrying a stale order',()=>{
  const {a}=app();
  assert(a.applyPlannerDrop(a.makePlannerDrag('task','t1'),'p:p2'));
  assert.equal(a.state().tasks.find(t=>t.id==='t1').order,a.nextOrderFor('p2','')-1000);
  assert.equal(a.state().tasks.find(t=>t.id==='t1').clientId,'c2');
});
test('completing a task bumps it past every other, sorting Done newest-first',()=>{
  const {a}=app();
  a.setStatus('task','t1','Done');
  const top=a.state().tasks.reduce((m,t)=>Math.max(m,t.order),0);
  assert.equal(a.state().tasks.find(t=>t.id==='t1').order,top);
  a.setStatus('task','t2','Done');
  assert(a.state().tasks.find(t=>t.id==='t2').order>a.state().tasks.find(t=>t.id==='t1').order);
  a.setStatus('task','t2','To Do');a.setStatus('task','t2','Done');   // re-completing re-bumps
  assert(a.state().tasks.find(t=>t.id==='t2').order>a.state().tasks.find(t=>t.id==='t1').order);
  assert(!('completedAt' in a.state().tasks[0]));                     // no new date field
  a.setState({clients:[],projects:[],tasks:[]});                      // and no crash when empty
  const rendered=a.renderTasks([],'k','none');assert.match(rendered,/none/);
});
test('a project dragged over a task row still finds the client beneath it',()=>{
  const {a}=app();
  const row={getAttribute:()=> 't:t1',parentElement:{closest:()=>({getAttribute:()=> 'c:c2',parentElement:null})}};
  const found=a.findDropTarget({closest:()=>row},a.makePlannerDrag('project','p1'));
  assert.equal(found.getAttribute(),'c:c2');
  assert.equal(a.dropEdgeFor(null,0),'');
});
test('external drops never mutate the planner',()=>{
  const {a,listeners}=app(),before=JSON.stringify(a.serialize());let prevented=false;
  listeners.drop({preventDefault(){prevented=true},target:{closest:()=>({getAttribute:()=> 'p:p2'})}});
  assert.equal(JSON.stringify(a.serialize()),before);assert.equal(prevented,false);
});
test('drag event lifecycle applies a valid move and clears the active drag',()=>{
  const {a,listeners}=app();let accepted=false,transferType='';
  const classes={add(){},remove(){}};
  const source={classList:classes};
  const handle={getAttribute:key=>key==='data-drag-kind'?'task':'t1',closest:()=>source};
  const destination={classList:classes,getAttribute:()=> 'p:p2'};
  const transfer={setData(type){transferType=type},setDragImage(){}};
  listeners.dragstart({target:{closest:()=>handle},dataTransfer:transfer,preventDefault(){throw new Error('Unexpected rejected drag')}});
  assert.equal(transferType,'application/x-project-planner');assert.equal(transfer.effectAllowed,'move');
  listeners.dragover({target:{closest:()=>destination},dataTransfer:transfer,preventDefault(){accepted=true}});
  assert(accepted);assert.equal(transfer.dropEffect,'move');
  listeners.drop({target:{closest:()=>destination},preventDefault(){}});
  assert.equal(a.state().tasks[0].projectId,'p2');assert.equal(a.undoCount(),1);
  listeners.drop({target:{closest:()=>({getAttribute:()=> 'u:none'})},preventDefault(){}});
  assert.equal(a.state().tasks[0].projectId,'p2');assert.equal(a.undoCount(),1);
});
