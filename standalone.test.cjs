const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('project-planner-1.html','utf8');
function runtime(source=html){
  let code=source.match(/<script>([\s\S]*)<\/script>/)[1];
  code=code.slice(0,code.indexOf('  /* ------------------------------ start'))+`
    globalThis.api={exportHTML,initDownloads,exportBackup,setHost:x=>{standalone=false;downloadsNs=x;},
      seed:doc=>{state=normalize(doc);},
      addPrivateRecords:()=>{state.tasks=[{title:'PRIVATE_TASK_642'}];state.focusSessions=[{note:'PRIVATE_NOTE_642'}];},
      capture:()=>{blobDownload=(name,text,mime)=>globalThis.download={name,text,mime};toast=()=>{};}};
  })();`;
  const els=new Map();const element=id=>{
    if(!els.has(id))els.set(id,{value:'',addEventListener(){},classList:{remove(){},add(){}}});return els.get(id);
  };
  const ctx={console,URLSearchParams,location:{search:'',protocol:'file:'},navigator:{},
    document:{documentElement:{outerHTML:source.replace(/^<!DOCTYPE html>\s*/i,'')},getElementById:element,addEventListener(){}},
    localStorage:{getItem:()=>null},setTimeout,clearTimeout};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);ctx.api.capture();return ctx;
}
test('HTML export contains pristine code and excludes loaded records and edited DOM',async()=>{
  const ctx=runtime();ctx.api.addPrivateRecords();ctx.document.documentElement.outerHTML='<html>PRIVATE_DOM_642</html>';
  await ctx.api.exportHTML();assert.equal(ctx.download.name,'project-planner.html');assert.equal(ctx.download.mime,'text/html;charset=utf-8');
  assert(!/PRIVATE_(TASK|NOTE|DOM)_642/.test(ctx.download.text));assert(ctx.download.text.includes('id="focusPage"'));
  new vm.Script(ctx.download.text.match(/<script>([\s\S]*)<\/script>/)[1]);
  const exported=runtime(ctx.download.text);await exported.api.exportHTML();assert.equal(exported.download.text,ctx.download.text);
});
test('a backup export writes carried fields under their own names, not as a carrier',async()=>{
 const ctx=runtime();
 // A field a later build added: this build does not know it, so normalize
 // parks it in the record's carrier. The export has to put it back.
 ctx.api.seed({version:4,clients:[{id:'c1',name:'Alpha',archivedAt:'2026-01-01'}],projects:[],
  tasks:[{id:'t1',clientId:'c1',title:'One',assignee:'someone'}],workspaces:[{id:'w1'}]});
 await ctx.api.exportBackup();
 const out=JSON.parse(ctx.download.text);
 assert.equal(out.tasks[0].assignee,'someone');
 assert.equal(out.clients[0].archivedAt,'2026-01-01');
 assert.equal(JSON.stringify(out.workspaces),JSON.stringify([{id:'w1'}]));
 // and the carrier itself never reaches the file, on any record
 [].concat(out.clients,out.projects,out.tasks).forEach(r=>assert.equal('x' in r,false,JSON.stringify(r)));
 assert.equal(out.version,4);
 assert(out.exportedAt);
});
test('portable source embeds app logic, style and context without local companion assets',()=>{
  assert(!/<script[^>]+src=/i.test(html));assert(!/<(?:link|img)[^>]+(?:href|src)=["'](?!https:|data:|#)/i.test(html));
  assert(html.includes('var DEFAULT_CONTEXT ='));assert(html.includes('/^https?:$/.test(location.protocol)'));
});
test('host download capability receives only pristine HTML',async()=>{
  const ctx=runtime();let saved;ctx.api.addPrivateRecords();ctx.api.setHost({save:async data=>saved=data});await ctx.api.exportHTML();
  assert.equal(saved.filename,'project-planner.html');assert(saved.data.startsWith('<!DOCTYPE html>'));assert(!saved.data.includes('PRIVATE_TASK_642'));
});
