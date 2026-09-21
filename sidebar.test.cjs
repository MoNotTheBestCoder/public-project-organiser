const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('project-planner-1.html', 'utf8');
const code = html.slice(html.indexOf('  /* Sidebar preferences'), html.indexOf('  var currentTheme'));

function fixture({ mobile = false, saved, blocked = false } = {}) {
  const values = new Map(saved ? [['planner-sidebar', saved]] : []);
  const listeners = {}, elements = {}, media = {matches:mobile, addEventListener(name, fn){this.change=fn;}};
  const document = {activeElement:null, addEventListener(name, fn){listeners[name]=fn;}};
  function element(id) {
    const classes = new Set();
    return elements[id] = { attrs:{}, inert:false, classList:{toggle(k,on){on ? classes.add(k):classes.delete(k);},contains(k){return classes.has(k);}},
      setAttribute(k,v){this.attrs[k]=v;}, focus(){document.activeElement=this;}, getClientRects(){return [1];},
      contains(el){return el===elements.sidebarToggle || el===elements.lastControl;},
      querySelectorAll(){return [elements.sidebarToggle,elements.lastControl];}};
  }
  ['plannerShell','plannerNavigation','plannerMain','sidebarMobileBar','sidebarToggle','mobileNavBtn','lastControl','body'].forEach(element);
  document.body=elements.body;
  const context = {document, window:{matchMedia:()=>media}, LOCAL_KEY:'planner', $:id=>elements[id],
    localStorage:{getItem(k){if(blocked)throw Error('blocked');return values.get(k);},setItem(k,v){if(blocked)throw Error('blocked');values.set(k,v);}}};
  vm.createContext(context); vm.runInContext(code+';initSidebar();',context);
  return {context,elements,media,values,document,listeners};
}

test('desktop collapse persists separately and restores without changing planner records', () => {
  const x=fixture(); x.context.toggleSidebar();
  assert(x.elements.plannerShell.classList.contains('sidebar-collapsed'));
  assert.equal(x.elements.sidebarToggle.attrs['aria-expanded'],'false');
  assert.equal(x.elements.sidebarToggle.attrs['aria-label'],'Expand sidebar');
  assert.deepEqual([...x.values],[['planner-sidebar','collapsed']]);
  const restored=fixture({saved:x.values.get('planner-sidebar')});
  assert(restored.elements.plannerShell.classList.contains('sidebar-collapsed'));
  restored.context.toggleSidebar(); assert.equal(restored.values.get('planner-sidebar'),'expanded');
});

test('phone drawer blocks background, traps focus, and Escape restores trigger without saving a desktop change', () => {
  const x=fixture({mobile:true,saved:'collapsed'});
  assert(x.elements.plannerNavigation.inert);
  x.context.toggleSidebar();
  assert(!x.elements.plannerNavigation.inert); assert(x.elements.plannerMain.inert); assert(x.elements.sidebarMobileBar.inert);
  assert.equal(x.document.activeElement,x.elements.sidebarToggle);
  let prevented=false;
  x.listeners.keydown({key:'Tab',shiftKey:true,preventDefault(){prevented=true;}});
  assert(prevented); assert.equal(x.document.activeElement,x.elements.lastControl);
  x.listeners.keydown({key:'Tab',shiftKey:false,preventDefault(){}});
  assert.equal(x.document.activeElement,x.elements.sidebarToggle);
  x.listeners.keydown({key:'Escape',preventDefault(){}});
  assert(x.elements.plannerNavigation.inert); assert(!x.elements.plannerMain.inert);
  assert.equal(x.document.activeElement,x.elements.mobileNavBtn);
  assert.deepEqual([...x.values],[['planner-sidebar','collapsed']]);
});

test('responsive changes close the drawer, restore desktop choice and retain accessible focus', () => {
  const x=fixture({saved:'collapsed'}); x.elements.sidebarToggle.focus();
  x.media.matches=true; x.media.change();
  assert.equal(x.document.activeElement,x.elements.mobileNavBtn);
  x.context.toggleSidebar(); x.media.matches=false; x.media.change();
  assert(!x.elements.plannerMain.inert); assert(!x.elements.plannerNavigation.inert);
  assert(!x.elements.plannerShell.classList.contains('sidebar-open'));
  assert(x.elements.plannerShell.classList.contains('sidebar-collapsed'));
});

test('blocked storage leaves both navigation modes usable; compact controls retain accessible names', () => {
  const x=fixture({blocked:true}); x.context.toggleSidebar();
  assert(x.elements.plannerShell.classList.contains('sidebar-collapsed'));
  x.media.matches=true; x.media.change(); x.context.toggleSidebar(); x.context.closeSidebarDrawer(true);
  assert(!x.elements.plannerMain.inert);
  assert.match(html,/id="plannerTab"[^>]*aria-label="Project planner"/);
  assert.match(html,/id="focusTab"[^>]*aria-label="Focus"/);
  assert.match(html,/data-act="sidebar-expand" aria-label="Clients and filters"/);
});
