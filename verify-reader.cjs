const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{for(const scenario of [
  {mobile:false,observed:true},
  {mobile:true,seen:true},
  {mobile:false,blocked:true}
]){const mobile=scenario.mobile,n='02';
const hintStorage=new Map(scenario.seen?[['portrait-edit-keys-hint','shown']]:[]);
let observer;
const storage={
  getItem(key){if(scenario.blocked)throw Error('Storage blocked');return hintStorage.get(key)||null;},
  setItem(key,value){if(scenario.blocked)throw Error('Storage blocked');hintStorage.set(key,value);}
};
const root=__dirname,issue=JSON.parse(fs.readFileSync(`${root}/docs/issue.json`));
const elements=new Map(),events={};function el(id){if(!elements.has(id))elements.set(id,{id,value:'1',open:false,disabled:false,textContent:'',style:{setProperty(k,v){this[k]=v}},children:[],append(o){this.children.push(o)},replaceChildren(){this.children=[]}});return elements.get(id)};
const windowEvents={},location={hash:''};const context={localStorage:storage,matchMedia:()=>({matches:mobile}),document:{getElementById:el,querySelector:()=>el('holder'),createElement:()=>({style:{},children:[],append(o){this.children.push(o)}}),addEventListener:(n,f)=>events[n]=f},window:{addEventListener:(n,f)=>windowEvents[n]=f},location,history:{replaceState:(a,b,c)=>location.hash=c},fetch:async path=>({ok:fs.existsSync(`${root}/docs/${path}`),json:async()=>JSON.parse(fs.readFileSync(`${root}/docs/${path}`))})};
if(scenario.observed)context.IntersectionObserver=class {
  constructor(callback){this.callback=callback;observer=this;}
  observe(target){this.target=target;}
  disconnect(){this.disconnected=true;}
};
await vm.runInNewContext(fs.readFileSync(`${root}/docs/reader.js`,'utf8'),context);
assert.equal(el('selected-studies').children.length,3);for(let i=0;i<3;i++)assert.equal(el('selected-studies').children[i].href,`#page=${issue.featured[i].page}`);assert.equal(el('reading-mode').value,mobile?'text':'page');assert.equal(el('page-image').src,'pages/001.webp');assert(el('previous').disabled);assert.equal(el('chapter').children.length,issue.chapters.length);assert.equal(el('download').href,issue.download);
assert.equal(el('other-issue-card').href,issue.other_url);
assert.equal(el('other-issue').href,issue.other_url);
assert.equal(el('chapter-progress').textContent,'Front matter · pages 1–13 · 1 of 13');
if(scenario.observed){
  assert.equal(el('keys-hint').hidden,true);
  observer.callback([{isIntersecting:false}]);assert.equal(el('keys-hint').hidden,true);
  observer.callback([{isIntersecting:true}]);assert.equal(el('keys-hint').hidden,false);
  assert.equal(hintStorage.get('portrait-edit-keys-hint'),'shown');assert(observer.disconnected);
}else assert.equal(el('keys-hint').hidden,Boolean(scenario.seen));
if(!scenario.seen){
  el('dismiss-keys-hint').onclick();assert.equal(el('keys-hint').hidden,true);
  if(!scenario.blocked)assert.equal(hintStorage.get('portrait-edit-keys-hint'),'dismissed');
}
assert.equal(el('page-loading').hidden,false);assert.equal(el('page-viewport').ariaBusy,'true');
el('page-image').onload();assert.equal(el('page-loading').hidden,true);assert.equal(el('page-viewport').ariaBusy,'false');
el('next').onclick();assert.equal(el('page-number').value,2);const staleLoad=el('page-image').onload,staleError=el('page-image').onerror;
el('next-bottom').onclick();assert.equal(el('page-number').value,3);
assert.equal(el('page-loading').hidden,false);
staleLoad();staleError();assert.equal(el('page-loading').hidden,false);
el('page-image').onerror();assert.equal(el('page-loading').hidden,true);assert.equal(el('page-viewport').ariaBusy,'false');
assert(el('status').textContent.includes('could not load'));

el('chapter').value=issue.chapters[1].page;el('chapter').onchange();assert.equal(el('page-number').value,issue.chapters[1].page);
el('page-number').value=999;el('page-number').onchange();assert.equal(el('page-number').value,issue.pages);assert(el('next').disabled);
el('page-number').value=0;el('page-number').onchange();assert.equal(el('page-number').value,1);
events.keydown({target:{tagName:'DIV'},key:'ArrowRight',preventDefault(){}});assert.equal(el('page-number').value,2);
events.keydown({target:{tagName:'INPUT'},key:'ArrowRight',preventDefault(){}});assert.equal(el('page-number').value,2);
el('zoom').value='200';el('zoom').onchange();assert.equal(el('holder').style.width,'200%');
location.hash='#page=17';windowEvents.hashchange();assert.equal(el('page-number').value,17);
el('text-details').open=true;await el('text-details').ontoggle();await new Promise(r=>setImmediate(r));assert.equal(el('page-text').textContent,JSON.parse(fs.readFileSync(`${root}/docs/pages/017.json`)).text);
el('reading-mode').value='text';el('reading-mode').onchange();await new Promise(r=>setImmediate(r));
assert(el('holder').hidden);assert(!el('reading-text').hidden);
el('page-number').value=60;el('page-number').onchange();await new Promise(r=>setImmediate(r));
const study=JSON.parse(fs.readFileSync(`${root}/docs/pages/060.json`)).study;
assert(study);assert(el('reading-text').children.some(node=>node.textContent===study.prompt));assert(el('reading-text').children.some(node=>node.src===study.image));
el('text-size').value='20';el('text-size').onchange();assert.equal(el('reading-text').style['--reading-size'],'20px');
el('reading-mode').value='page';el('reading-mode').onchange();assert(!el('holder').hidden);assert(el('reading-text').hidden);
for(const [page,expected] of [
  [13,'Front matter · pages 1–13 · 13 of 13'],
  [14,'Portraits & Light · pages 14–36 · 1 of 23'],
  [127,'Studio · pages 127–149 · 1 of 23'],
  [138,'Studio · pages 127–149 · 12 of 23'],
  [149,'Studio · pages 127–149 · 23 of 23'],
  [150,'Night & Lifestyle · pages 150–169 · 1 of 20'],
  [196,'Street & City · pages 170–196 · 27 of 27']
]){
  el('page-number').value=page;el('page-number').onchange();
  assert.equal(el('chapter-progress').textContent,expected);
  el('page-image').onload();assert.equal(el('page-loading').hidden,true);
}
assert(fs.readFileSync(`${root}/docs/style.css`,'utf8').includes('--reading-size:16px'));assert(fs.readFileSync(`${root}/docs/index.html`,'utf8').includes('<option value="16" selected>16 px</option>'));
console.log(`Issue ${n} (${mobile?'mobile':'desktop'}): navigation, modes, captions, loading success/error/stale events, chapter progress, keyboard hint and Issue 01 links PASS`);
}})().catch(e=>{console.error(e);process.exit(1)});
