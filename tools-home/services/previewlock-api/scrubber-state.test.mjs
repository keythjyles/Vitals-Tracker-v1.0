// Execute the shipped frontend functions with deterministic DOM/storage/provider
// doubles. These are state/transaction checks, not physical-browser UI tests.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
const html=readFileSync(new URL('../../tools/sound-scrubber/index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('const terms='),html.indexOf("$('preview').addEventListener"));
function setup(initial={}){
 let failDelete=false;
 const storage=new Map([['sx-scrubber-review-v2',JSON.stringify(initial)],['gs_previewlock_key','test']]),blobs=new Map(),nodes=new Map(),events=[];
 const node=()=>({children:[],dataset:{},setAttribute(){},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},querySelectorAll(){return []},contains(){return false},getBoundingClientRect(){return {top:0,bottom:44}},pause(){},removeAttribute(){}});
 const context=vm.createContext({console,Blob,URL,crypto:webcrypto,Promise,Map,Set,Date,Uint8Array,Number,Array,Error,JSON,encodeURIComponent,structuredClone,
  document:{getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node,querySelectorAll(){return []},querySelector:node},
  window:{scrollY:0,scrollBy(){},scrollTo(){},GSApprovedEffects:{publish(){events.push(JSON.parse(storage.get('sx-scrubber-review-v2')))}}},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  indexedDB:{open(){const q={};queueMicrotask(()=>{q.result={transaction(){const tx={objectStore(){return {get(id){const r={};queueMicrotask(()=>{r.result=blobs.get(id);r.onsuccess?.();tx.oncomplete?.()});return r},put(b,id){const r={};queueMicrotask(()=>{blobs.set(id,b);r.onsuccess?.();tx.oncomplete?.()});return r},delete(id){queueMicrotask(()=>{if(failDelete){tx.error=Error('disk unavailable');tx.onabort?.()}else{blobs.delete(id);tx.oncomplete?.()}})}}}};return tx}};q.onsuccess()});return q}},
  fetch:async()=>{throw Error('unexpected network')},prompt:()=>null,
 });
 vm.runInContext(code,context);
 const run=s=>vm.runInContext(s,context),request=fn=>{context.requestDouble=fn;run('audioRequest=requestDouble')};
 return {context,run,request,storage,blobs,nodes,events,failDeletion(value){failDelete=value},state:()=>JSON.parse(storage.get('sx-scrubber-review-v2'))};
}
const sound={name:'crickets.wav',status:'pending',start:0,end:null};
const saved={assetId:'commons-12',sha256:'a'.repeat(64),cloudReceipts:{dropbox:{verified:true,id:'id:12',path:'/Grill Sergeant/Sound Effects/commons-12/crickets.wav',rev:'1',bytes:60},drive:{verified:false}},cloudSaveStatus:'partial',recordPath:'asset.json'};
test('approve keeps its row in place; repeated failures retain only Approve and Delete',async()=>{
 const s=setup({'commons:12':sound,'commons:13':{...sound,name:'next.wav'}});s.blobs.set('commons:12',new Blob([Buffer.alloc(60)]));let reject;
 s.request(()=>new Promise((_,bad)=>{reject=bad}));const first=s.run("approveInline('commons:12',reviewDB['commons:12'])");assert.equal(s.state()['commons:12'].reviewState,'saving');
 while(!reject)await new Promise(r=>setImmediate(r));reject(Error('network failed'));await first;assert.equal(s.state()['commons:12'].reviewState,'failed');assert.equal(s.state()['commons:12'].status,'pending');
 s.request(async()=>{throw Error('again')});await s.run("approveInline('commons:12',reviewDB['commons:12'])");assert.equal(s.state()['commons:12'].reviewState,'failed');
 const labels=s.run("soundRow('commons:12',reviewDB['commons:12']).children[1].children.map(b=>b.textContent)");assert.deepEqual(Array.from(labels),['▶','✓','✕']);
 assert(!html.includes('FAILED SAVES'));assert(!html.includes('id="hold"'));assert(!html.includes('id="filterHeld"'));

});
test('successful approval publishes only after a verified Dropbox response and pins identity before the request',async()=>{
 const s=setup({'commons:12':sound});s.blobs.set('commons:12',new Blob([Buffer.alloc(60)]));
 s.request(async()=>{const v=s.state()['commons:12'];assert.equal(v.status,'pending');assert.equal(v.cloudAssetId,'commons-12');assert.match(v.sha256,/^[a-f0-9]{64}$/);return {...saved,sha256:v.sha256}});
 await s.run("approveInline('commons:12',reviewDB['commons:12'])");assert.equal(s.state()['commons:12'].status,'approved');assert.equal(s.state()['commons:12'].reviewState,'saved');
});
test('pending deletion removes cached bytes and approval availability, retains recoverable status and one retry button',async()=>{
 const s=setup({'commons:12':{...sound,status:'approved',cloudAssetId:'commons-12',sha256:saved.sha256,storedBytes:60}});s.blobs.set('commons:12',new Blob([Buffer.alloc(60)]));let calls=0;
 s.request(async()=>{calls++;return {persisted:true,assetId:'commons-12',requestId:'delete-1',complete:false,destinations:{dropbox:{verified:true,status:'deleted'},drive:{verified:false,status:'pending'}}}});
 await Promise.all([s.run("deleteInline('commons:12')"),s.run("deleteInline('commons:12')")]);assert.equal(calls,1);assert.equal(s.blobs.has('commons:12'),false);assert.equal(s.state()['commons:12'].status,'deleting');assert.equal(s.state()['commons:12'].reviewState,'delete_pending');assert.equal(s.run("soundRow('commons:12',reviewDB['commons:12']).children[1].children.length"),1);
 await s.run("approveInline('commons:12',reviewDB['commons:12'])");assert.equal(calls,1);
 s.request(async()=>({persisted:true,assetId:'commons-12',requestId:'delete-1',complete:true,destinations:{dropbox:{verified:true},drive:{verified:true}}}));await s.run("deleteInline('commons:12')");assert.equal(s.state()['commons:12'],undefined);
});
test('unverified or failed deletion retains bytes and retry metadata, including after reload',async()=>{
 const s=setup({'commons:12':{...sound,status:'approved',cloudAssetId:'commons-12',sha256:saved.sha256}});s.blobs.set('commons:12',new Blob(['original']));s.request(async()=>{throw Error('connection rejected')});await s.run("deleteInline('commons:12')");assert(s.blobs.has('commons:12'));assert.equal(s.state()['commons:12'].reviewState,'delete_failed');const reload=setup(s.state());assert.equal(reload.state()['commons:12'].status,'deleting');assert.equal(reload.state()['commons:12'].deleteError,'connection rejected');
});
test('local/search-only Delete removes bytes and ledger without cloud calls and does not blacklist rediscovery',async()=>{
 const s=setup();s.run("searchRows.set('commons:12',{name:'crickets.wav',status:'pending'})");s.blobs.set('commons:12',new Blob(['audio']));await s.run("deleteInline('commons:12')");assert.equal(s.state()['commons:12'],undefined);assert.equal(s.blobs.has('commons:12'),false);s.run("enqueue('commons:12',{name:'crickets.wav',status:'pending'})");assert(s.state()['commons:12']);
});
test('reload recovers interrupted approval and normal rows retain inline Play / Approve / Delete',()=>{
 const s=setup({'commons:12':{...sound,reviewState:'saving'}});assert.equal(s.state()['commons:12'].reviewState,'failed');const labels=s.run("soundRow('commons:12',reviewDB['commons:12']).children[1].children.map(b=>b.textContent)");assert.deepEqual(Array.from(labels),['▶','✓','✕']);
});
test('historically interrupted save recovers cloud identity from cached original before deletion',async()=>{
 const s=setup({'commons:12':{...sound,approvedAt:'2026-10-27T00:00:00Z',cloudSaveStatus:'queued',reviewState:'failed'}});s.blobs.set('commons:12',new Blob([Buffer.alloc(60)]));let identity;
 s.request(async(_,options)=>{identity=JSON.parse(options.body);return {persisted:true,assetId:identity.assetId,requestId:'delete-old',complete:false,destinations:{dropbox:{verified:true},drive:{verified:false}}}});
 await s.run("deleteInline('commons:12')");assert.equal(identity.assetId,'commons-12');assert.match(identity.sha256,/^[a-f0-9]{64}$/);assert.match(identity.contentHash,/^[a-f0-9]{64}$/);assert.equal(identity.bytes,60);assert.equal(s.state()['commons:12'].reviewState,'delete_pending');
});
test('IndexedDB transaction failure retains the original and review entry for a successful retry',async()=>{
 const s=setup({'commons:12':sound});s.blobs.set('commons:12',new Blob(['original']));s.failDeletion(true);await s.run("deleteInline('commons:12')");assert(s.blobs.has('commons:12'));assert.equal(s.state()['commons:12'].reviewState,'delete_failed');s.failDeletion(false);await s.run("deleteInline('commons:12')");assert.equal(s.blobs.has('commons:12'),false);assert.equal(s.state()['commons:12'],undefined);
});


test('same-row redo and successor retain the decision position instead of jumping to a separate list',()=>{
 const s=setup();s.run(`
 const makeRow=(id,top)=>({dataset:{soundRow:id},getBoundingClientRect:()=>({top,bottom:top+44})});
 let testRows=[makeRow('before',20),makeRow('decision',120),makeRow('next',164)];
 let afterRows=[makeRow('before',20),makeRow('decision',120),makeRow('next',164)];
 let moves=[];document.querySelectorAll=selector=>selector==='[data-sound-row]'?testRows:[];renderQueue=()=>{testRows=afterRows};window.scrollBy=(x,y)=>moves.push(y);
 refreshInlineLists('decision');
 `);assert.equal(s.run('moves.at(-1)'),0);
 s.run("testRows=[makeRow('before',20),makeRow('decision',120),makeRow('next',164)];afterRows=[makeRow('before',20),makeRow('next',90)];refreshInlineLists('decision')");assert.equal(s.run('moves.at(-1)'),-30);
});
test('legacy Hold entries return to ordinary pending without losing sounds',()=>{
 const s=setup({'commons:12':{...sound,status:'held',reviewState:'held'}});assert.equal(s.state()['commons:12'].status,'pending');assert.equal(s.state()['commons:12'].reviewState,'pending');
});
