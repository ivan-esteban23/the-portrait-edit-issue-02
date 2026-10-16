const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{for(const n of ['02']){
const root=__dirname,issue=JSON.parse(fs.readFileSync(`${root}/docs/issue.json`));
const elements=new Map(),events={};function el(id){if(!elements.has(id))elements.set(id,{id,value:'1',open:false,disabled:false,textContent:'',style:{},children:[],append(o){this.children.push(o)}});return elements.get(id)};
const windowEvents={},location={hash:''};const context={document:{getElementById:el,querySelector:()=>el('holder'),createElement:()=>({}),addEventListener:(n,f)=>events[n]=f},window:{addEventListener:(n,f)=>windowEvents[n]=f},location,history:{replaceState:(a,b,c)=>location.hash=c},fetch:async path=>({ok:fs.existsSync(`${root}/docs/${path}`),json:async()=>JSON.parse(fs.readFileSync(`${root}/docs/${path}`))})};
await vm.runInNewContext(fs.readFileSync(`${root}/docs/reader.js`,'utf8'),context);
assert.equal(el('page-image').src,'pages/001.webp');assert(el('previous').disabled);assert.equal(el('chapter').children.length,issue.chapters.length);assert.equal(el('download').href,issue.download);
el('next').onclick();assert.equal(el('page-number').value,2);el('next-bottom').onclick();assert.equal(el('page-number').value,3);
el('chapter').value=issue.chapters[1].page;el('chapter').onchange();assert.equal(el('page-number').value,issue.chapters[1].page);
el('page-number').value=999;el('page-number').onchange();assert.equal(el('page-number').value,issue.pages);assert(el('next').disabled);
el('page-number').value=0;el('page-number').onchange();assert.equal(el('page-number').value,1);
events.keydown({target:{tagName:'DIV'},key:'ArrowRight',preventDefault(){}});assert.equal(el('page-number').value,2);
events.keydown({target:{tagName:'INPUT'},key:'ArrowRight',preventDefault(){}});assert.equal(el('page-number').value,2);
el('zoom').value='200';el('zoom').onchange();assert.equal(el('holder').style.width,'200%');
location.hash='#page=17';windowEvents.hashchange();assert.equal(el('page-number').value,17);
el('text-details').open=true;await el('text-details').ontoggle();await new Promise(r=>setImmediate(r));assert.equal(el('page-text').textContent,JSON.parse(fs.readFileSync(`${root}/docs/pages/017.json`)).text);
console.log(`Issue ${n}: page controls, bounds, chapters, keyboard, zoom, deep links, text and download URL PASS`);
}})().catch(e=>{console.error(e);process.exit(1)});
