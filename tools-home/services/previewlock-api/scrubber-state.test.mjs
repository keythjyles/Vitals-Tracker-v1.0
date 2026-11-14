// Execute the shipped frontend functions with deterministic DOM/storage/provider
// doubles. These are state/transaction checks, not physical-browser UI tests.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
const html=readFileSync(new URL('../../tools/sound-scrubber/index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('const terms='),html.indexOf("$('preview').addEventListener"));
function setup(initial={}){
 let failDelete=false,failWrite=false;
 const storage=new Map([['sx-scrubber-review-v2',JSON.stringify(initial)],['gs_previewlock_key','test']]),blobs=new Map(),nodes=new Map(),events=[];
 const node=()=>({children:[],dataset:{},setAttribute(){},append(...v){this.children.push(...v)},prepend(...v){this.children.unshift(...v)},replaceChildren(){this.children=[]},querySelectorAll(){return []},contains(){return false},getBoundingClientRect(){return {top:0,bottom:44}},pause(){},removeAttribute(){},addEventListener(){},removeEventListener(){}});
 const context=vm.createContext({console,Blob,URL,URLSearchParams,setTimeout,clearTimeout,crypto:webcrypto,Promise,Map,Set,Date,Uint8Array,Number,Array,Error,JSON,encodeURIComponent,structuredClone,
  document:{getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node,querySelectorAll(){return []},querySelector:node},
  window:{scrollY:0,scrollBy(){},scrollTo(){},GSApprovedEffects:{publish(){events.push(JSON.parse(storage.get('sx-scrubber-review-v2')))},async audioFetch(path,options){const response=await context.fetch(path,options);if(!response.ok)throw Error((await response.json()).error);return response}}},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  indexedDB:{open(){const q={};queueMicrotask(()=>{q.result={transaction(){const tx={objectStore(){return {get(id){const r={};queueMicrotask(()=>{r.result=blobs.get(id);r.onsuccess?.();tx.oncomplete?.()});return r},put(b,id){const r={};queueMicrotask(()=>{if(failWrite){tx.error=Error('disk unavailable');tx.onabort?.();return}blobs.set(id,b);r.onsuccess?.();tx.oncomplete?.()});return r},delete(id){queueMicrotask(()=>{if(failDelete){tx.error=Error('disk unavailable');tx.onabort?.()}else{blobs.delete(id);tx.oncomplete?.()}})}}}};return tx}};q.onsuccess()});return q}},
  fetch:async()=>{throw Error('unexpected network')},prompt:()=>null,
 });
 vm.runInContext(code,context);
 const run=s=>vm.runInContext(s,context),request=fn=>{context.requestDouble=fn;run('audioRequest=requestDouble')};
 return {context,run,request,storage,blobs,nodes,events,failDeletion(value){failDelete=value},failWrite(value){failWrite=value},state:()=>JSON.parse(storage.get('sx-scrubber-review-v2'))};
}
const sound={name:'crickets.wav',status:'pending',start:0,end:null};
const saved={assetId:'commons-12',sha256:'a'.repeat(64),cloudReceipts:{dropbox:{verified:true,id:'id:12',path:'/Grill Sergeant/Sound Effects/commons-12/crickets.wav',rev:'1',bytes:60},drive:{verified:false}},cloudSaveStatus:'partial',recordPath:'asset.json'};
function wav(){
 const bytes=Buffer.alloc(60);bytes.write('RIFF',0);bytes.write('WAVE',8);
 return new Blob([bytes],{type:'audio/wav'});
}
function driveReceipt(v){
 return {assetId:v.cloudAssetId,name:v.name,sha256:v.sha256,persisted:true,recordPath:'test-file-id',
  cloudReceipts:{drive:{verified:true,provider:'drive',fileId:'test-file-id',sha256:v.sha256,bytes:v.storedBytes}}};
}
test('approve instantly hides its row; failed redo offers the recording fallback',async()=>{
 const s=setup({'commons:12':sound,'commons:13':{...sound,name:'next.wav'}});let reject;
 s.context.playable=()=>new Promise((_,bad)=>{reject=bad});
 s.run('candidateBlob=playable');
 const first=s.run("approveInline('commons:12',reviewDB['commons:12'])");assert.equal(s.state()['commons:12'].reviewState,'saving');assert.equal(s.nodes.get('queue').children.length,1);assert.equal(s.nodes.get('queue').children[0].dataset.soundRow,'commons:13');assert.equal(s.run('playingId'),null);
 while(!reject)await new Promise(r=>setImmediate(r));reject(Error('source unavailable'));await first;assert.equal(s.state()['commons:12'].reviewState,'failed');assert.equal(s.state()['commons:12'].status,'pending');
 const labels=s.run("soundRow('commons:12',reviewDB['commons:12']).children[1].children.map(b=>b.textContent)");assert.deepEqual(Array.from(labels),['REC','▶','✓','✕']);
 assert(!html.includes('FAILED SAVES'));assert(!html.includes('id="hold"'));assert(!html.includes('id="filterHeld"'));

});
test('approval publishes cached original immediately, then sends verified bytes only to Drive',async()=>{
 const s=setup({'commons:12':sound});const original=wav();s.blobs.set('commons:12',original);
 await s.run("approveInline('commons:12',reviewDB['commons:12'])");
 assert.equal(s.state()['commons:12'].status,'approved');assert.equal(s.state()['commons:12'].cloudSaveStatus,'queued');
 assert.equal(s.nodes.get('queue').children.length,0);
 s.storage.set('gs_sound_drive_session','fixture');
 let calls=0;
 s.request(async(path,options)=>{calls++;const v=s.state()['commons:12'];
  assert.equal(path,'/api/audio-drive-save');assert.equal(v.status,'approved');assert.equal(v.cloudAssetId,'commons-12');
  assert.equal(options.headers['x-audio-sha256'],v.sha256);assert.equal(await options.body.text(),await original.text());return driveReceipt(v)});
 await s.run('flushDriveQueue()');
 assert.equal(calls,1);assert.equal(s.state()['commons:12'].cloudSaveStatus,'verified');
 await s.run('flushDriveQueue()');assert.equal(calls,1);
});
test('a Drive permission failure leaves the sound approved and reconnecting resumes the original save',async()=>{
 const s=setup({'commons:12':sound});
 s.blobs.set('commons:12',wav());s.storage.set('gs_sound_drive_session','expired');
 s.request(async path=>{assert.equal(path,'/api/audio-drive-save');throw Object.assign(Error('reconnect'),{status:401})});
 await s.run("approveInline('commons:12',reviewDB['commons:12'])");await s.run('flushDriveQueue()');
 assert.equal(s.state()['commons:12'].status,'approved');
 assert.equal(s.nodes.get('queue').children.length,0);
 assert.equal(s.storage.has('gs_sound_drive_session'),false);
 const reopened=setup(s.state());reopened.blobs.set('commons:12',s.blobs.get('commons:12'));
 reopened.storage.set('gs_sound_drive_session','connected');
 reopened.request(async path=>{assert.equal(path,'/api/audio-drive-save');return driveReceipt(reopened.state()['commons:12'])});
 await reopened.run('flushDriveQueue()');
 assert.equal(reopened.state()['commons:12'].cloudSaveStatus,'verified');
});
test('the Record playback and approve button names the take, leaves the queue and publishes approval',async()=>{
 const s=setup({'commons:12':{...sound,reviewState:'failed',captureOffered:true}});
 const source=wav();s.blobs.set('commons:12',source);s.context.take=wav();
 s.context.stream={getAudioTracks:()=>[{stop(){}}],getTracks:()=>[{stop(){}}]};
 s.context.MediaStream=class {};
 s.context.MediaRecorder=class {
  state='inactive';
  start(){this.state='recording'}
  stop(){this.state='inactive';this.ondataavailable({data:wav()});this.onstop()}
 };
 s.run(`
 const preview=$('preview');
 preview.duration=.2;
 preview.captureStream=()=>stream;
 preview.play=async()=>queueMicrotaskForTest(()=>captureState?.stop());
 playInline=async()=>{};
 decodeRecording=async()=>take;
 `);
 s.context.queueMicrotaskForTest=queueMicrotask;
 const row=s.run("soundRow('commons:12',reviewDB['commons:12'])");
 assert.equal(row.children[1].children[0].title,'Record playback and approve');
 await row.children[1].children[0].onclick();
 const entry=s.state()['commons:12'];
 assert.equal(entry.status,'approved');assert.equal(entry.name,'crickets_recorded.wav');
 assert.equal(entry.captureSource.sourceName,'crickets.wav');
 assert.equal(s.blobs.get('commons:12:capture-original'),source);
 assert.equal(s.nodes.get('queue').children.length,0);
 assert(s.events.some(event=>event['commons:12']?.status==='approved'));
});
test('the queue filename can be renamed before selecting Approve',async()=>{
 const s=setup({'commons:12':sound});s.blobs.set('commons:12',wav());
 s.context.prompt=()=> 'Quiet cricket';
 const row=s.run("soundRow('commons:12',reviewDB['commons:12'])");
 await row.children[0].children[0].onclick();
 assert.equal(s.state()['commons:12'].name,'Quiet cricket.wav');
 assert.equal(s.state()['commons:12'].status,'pending');
 await s.run("approveInline('commons:12',reviewDB['commons:12'])");
 assert.equal(s.state()['commons:12'].name,'Quiet cricket.wav');
 assert.equal(s.state()['commons:12'].status,'approved');
});
test('a failed device write leaves the sound in review and publishes no approval',async()=>{
 const s=setup({'commons:12':sound});s.blobs.set('commons:12',wav());s.failWrite(true);
 await s.run("approveInline('commons:12',reviewDB['commons:12'])");
 assert.equal(s.state()['commons:12'].status,'pending');assert.equal(s.nodes.get('queue').children.length,1);
 assert(!s.events.some(event=>event['commons:12']?.status==='approved'));
});
test('pending deletion removes cached bytes and stays hidden while retaining recoverable status',async()=>{
 const s=setup({'commons:12':{...sound,status:'approved',cloudAssetId:'commons-12',sha256:saved.sha256,storedBytes:60}});s.blobs.set('commons:12',new Blob([Buffer.alloc(60)]));let calls=0;
 s.request(async()=>{calls++;return {persisted:true,assetId:'commons-12',requestId:'delete-1',complete:false,destinations:{dropbox:{verified:true,status:'deleted'},drive:{verified:false,status:'pending'}}}});
 await Promise.all([s.run("deleteInline('commons:12')"),s.run("deleteInline('commons:12')")]);assert.equal(calls,1);assert.equal(s.blobs.has('commons:12'),false);assert.equal(s.state()['commons:12'].status,'deleting');assert.equal(s.state()['commons:12'].reviewState,'delete_pending');assert.equal(s.run("visibleDecision('commons:12',reviewDB['commons:12'])"),false);assert.equal(s.nodes.get('queue').children.length,0);
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
 const s=setup({'commons:12':{...sound,reviewState:'saving'}});assert.equal(s.state()['commons:12'].reviewState,'save_unverified');assert.equal(s.run("visibleDecision('commons:12',reviewDB['commons:12'])"),false);s.run("reviewDB['commons:12'].reviewState='failed'");const labels=s.run("soundRow('commons:12',reviewDB['commons:12']).children[1].children.map(b=>b.textContent)");assert.deepEqual(Array.from(labels),['REC','▶','✓','✕']);
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


test('Scrubber hides completed sounds in queue and search without deleting their approved library records',()=>{
 const s=setup({'commons:12':{...sound,status:'approved',reviewState:'failed'},'commons:13':{...sound,status:'pending'}});
 s.run("searchRows.set('commons:12',reviewDB['commons:12']);refreshInlineLists()");
 assert.equal(s.nodes.get('results').children.length,0);assert.equal(s.nodes.get('queue').children.length,1);
 assert.equal(s.state()['commons:12'].status,'approved');assert.equal(s.run("needsReview(reviewDB['commons:12'])"),false);
 assert(!html.includes('id="filterApproved"'));assert(!html.includes('id="filterAll"'));assert(!html.includes('id="filterPending"'));
});

test('sound categories are tucked in a collapsed selector, without preset pills',()=>{
 assert(html.includes('<details id="soundTypes"><summary>Sound types</summary><select'));
 assert(!html.includes('id="presets"></div>'));assert(!html.includes('id="soundTypes" open'));
});
test('playback WAV encoder preserves samples and rejects silent or invalid capture',async()=>{
 const s=setup();s.context.sampleBuffer={numberOfChannels:1,length:4,sampleRate:8000,getChannelData:()=>Float32Array.from([0,.5,-.5,0])};
 const wav=await s.run('recordingWav(sampleBuffer)');const bytes=Buffer.from(await wav.arrayBuffer());assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.length,52);assert.equal(bytes.readInt16LE(46),16383);
 s.context.sampleBuffer.getChannelData=()=>new Float32Array(4);assert.throws(()=>s.run('recordingWav(sampleBuffer)'),/silent/);
 s.context.sampleBuffer.getChannelData=()=>Float32Array.from([NaN,0,0,0]);assert.throws(()=>s.run('recordingWav(sampleBuffer)'),/invalid samples/);
});
test('a captured take stays pending, keeps its original and source identity, and uses a new stable audio ID',async()=>{
 const s=setup({'commons:12':{...sound,reviewState:'failed',cloudAssetId:'commons-12',sha256:saved.sha256,storedBytes:60,saveError:'not saved',cloudReceipts:saved.cloudReceipts}});
 const original=new Blob(['original']),capture=new Blob(['new captured take']);s.blobs.set('commons:12',original);s.context.captureBlob=capture;
 await s.run("stagePlayback('commons:12',reviewDB['commons:12'],captureBlob)");
 const v=s.state()['commons:12'];assert.equal(v.status,'pending');assert.equal(v.reviewState,'pending');assert.match(v.cloudAssetId,/^local-[a-f0-9]{64}$/);assert.equal(v.name,'crickets_recorded.wav');assert.equal(v.captureSource.sourceAssetId,'commons-12');assert.equal(v.managedPredecessors[0].assetId,'commons-12');assert.equal(await s.blobs.get('commons:12:capture-original').text(),'original');assert.equal(await s.blobs.get('commons:12').text(),'new captured take');
});
test('unavailable playback recording gives a screen-recorder path and leaves the sound unfinished',async()=>{
 const s=setup({'commons:12':{...sound,reviewState:'failed'}});await s.run("recordPlayback('commons:12',reviewDB['commons:12'])");assert.equal(s.state()['commons:12'].reviewState,'failed');assert(s.nodes.get('status').textContent.includes('phone screen recorder'));assert.equal(s.run('captureState'),null);
});
test('Delete cleans up both captured and prior managed copies and the original browser cache',async()=>{
 const s=setup({'commons:12':{...sound,cloudAssetId:'local-'+'b'.repeat(64),sha256:'b'.repeat(64),managedPredecessors:[{assetId:'commons-12',sha256:'a'.repeat(64)}]}});s.blobs.set('commons:12',new Blob(['capture']));s.blobs.set('commons:12:capture-original',new Blob(['source']));const ids=[];
 s.request(async(_,options)=>{const body=JSON.parse(options.body);ids.push(body.assetId);return {persisted:true,assetId:body.assetId,requestId:'test-delete',complete:true,destinations:{dropbox:{verified:true},drive:{verified:true}}}});
 await s.run("deleteInline('commons:12')");assert.deepEqual(ids,['commons-12','local-'+'b'.repeat(64)]);assert.equal(s.blobs.size,0);assert.equal(s.state()['commons:12'],undefined);
});


test('decisions stay instant during slow source reads; failure returns before the next sound',async()=>{
 const s=setup({'commons:12':sound,'commons:13':{...sound,name:'second.wav'},'commons:14':{...sound,name:'third.wav'}});
 const waiting=new Map();
 s.context.playable=v=>new Promise((resolve,reject)=>waiting.set(v.name,{resolve,reject}));
 s.run('candidateBlob=playable');
 s.run("playingId='commons:12';$('preview').pause=()=>{$('preview').paused=true}");const first=s.run("approveInline('commons:12',reviewDB['commons:12'])");assert.equal(s.nodes.get('preview').paused,true);assert.equal(s.nodes.get('queue').children[0].dataset.soundRow,'commons:13');
 assert.equal(s.run("soundRow('commons:13',reviewDB['commons:13']).children[1].children[1].disabled"),false);
 const second=s.run("approveInline('commons:13',reviewDB['commons:13'])");assert.equal(s.nodes.get('queue').children[0].dataset.soundRow,'commons:14');
 while(waiting.size<2)await new Promise(r=>setImmediate(r));waiting.get('crickets.wav').reject(Error('source failed'));await first;
 assert.deepEqual(s.nodes.get('queue').children.map(r=>r.dataset.soundRow),['commons:12','commons:14']);
 waiting.get('second.wav').reject(Error('also failed'));await second;
 assert.deepEqual(s.nodes.get('queue').children.map(r=>r.dataset.soundRow),['commons:13','commons:12','commons:14']);
});
test('a background failure appears directly after the sound currently being auditioned without stopping it',async()=>{
 const s=setup({'commons:12':sound,'commons:13':{...sound,name:'current.wav'},'commons:14':{...sound,name:'later.wav'}});let fail;
 s.context.playable=()=>new Promise((_,reject)=>{fail=reject});s.run('candidateBlob=playable');const pending=s.run("approveInline('commons:12',reviewDB['commons:12'])");while(!fail)await new Promise(r=>setImmediate(r));s.run("playingId='commons:13'");fail(Error('retry'));await pending;
 assert.deepEqual(s.nodes.get('queue').children.map(r=>r.dataset.soundRow),['commons:13','commons:12','commons:14']);assert.equal(s.run('playingId'),'commons:13');
});
test('Delete hides and stops playback before its slow storage operation finishes',async()=>{
 const s=setup({'commons:12':{...sound,cloudAssetId:'commons-12',sha256:saved.sha256},'commons:13':{...sound,name:'next.wav'}});let finish;
 s.request(()=>new Promise(resolve=>{finish=resolve}));s.run("playingId='commons:12';$('preview').pause=()=>{$('preview').paused=true}");const pending=s.run("deleteInline('commons:12')");
 assert.equal(s.nodes.get('preview').paused,true);assert.equal(s.nodes.get('queue').children.length,1);assert.equal(s.nodes.get('queue').children[0].dataset.soundRow,'commons:13');
 finish({persisted:true,assetId:'commons-12',requestId:'delete',complete:true,destinations:{dropbox:{verified:true},drive:{verified:true}}});await pending;assert.equal(s.state()['commons:12'],undefined);
});
test('background cloud mutations serialize without blocking decisions or poisoning later requests',async()=>{
 const s=setup();let release;let calls=0;s.context.fetch=async()=>{calls++;if(calls===1)return new Promise(resolve=>{release=()=>resolve({ok:false,status:502,json:async()=>({error:'first failed'})})});return {ok:true,status:200,json:async()=>({ok:true})}};
 const first=s.run("audioRequest('/api/audio-save',{method:'POST'})").catch(e=>e.message),second=s.run("audioRequest('/api/audio-delete',{method:'POST'})");
 while(!release)await new Promise(r=>setImmediate(r));assert.equal(calls,1);release();assert.equal(await first,'first failed');assert.equal((await second).ok,true);assert.equal(calls,2);
});

test('search decisions disappear immediately and redo returns in that list without a queue duplicate',async()=>{
 const s=setup();s.run("searchRows.set('commons:12',{name:'first.wav',status:'pending'});searchRows.set('commons:13',{name:'next.wav',status:'pending'});refreshInlineLists()");let fail;s.context.playable=()=>new Promise((_,reject)=>{fail=reject});s.run('candidateBlob=playable');const pending=s.run("approveInline('commons:12',searchRows.get('commons:12'))");
 assert.deepEqual(s.nodes.get('results').children.map(r=>r.dataset.soundRow),['commons:13']);assert.equal(s.nodes.get('queue').children.length,0);
 while(!fail)await new Promise(r=>setImmediate(r));fail(Error('redo'));await pending;assert.deepEqual(s.nodes.get('results').children.map(r=>r.dataset.soundRow),['commons:12','commons:13']);assert.equal(s.nodes.get('queue').children.length,0);
});


test('queued and failed deletion stay out after reload because neither offers approval',async()=>{
 const pending={...sound,status:'deleting',reviewState:'delete_pending',cloudAssetId:'commons-12',sha256:saved.sha256};const s=setup({'commons:12':pending});s.run('renderQueue()');assert.equal(s.nodes.get('queue').children.length,0);assert.equal(s.run("visibleDecision('commons:12',reviewDB['commons:12'])"),false);
 s.request(async()=>({persisted:true,assetId:'commons-12',requestId:'failed-delete',complete:false,destinations:{dropbox:{verified:false,error:'Unrecognized managed file'},drive:{verified:false,status:'pending'}}}));
 await s.run("deleteInline('commons:12')");assert.equal(s.state()['commons:12'].reviewState,'delete_failed');assert.equal(s.nodes.get('queue').children.length,0);assert.equal(s.run("visibleDecision('commons:12',reviewDB['commons:12'])"),false);const buttons=s.run("soundRow('commons:12',reviewDB['commons:12']).children[1].children.map(b=>b.textContent)");assert.deepEqual(Array.from(buttons),['▶','✕']);
});

test('interrupted save stays hidden through an unknown lookup and disappears after verified receipt recovery',async()=>{
 const s=setup({'commons:12':{...sound,reviewState:'saving',cloudAssetId:'commons-12',sha256:saved.sha256,storedBytes:60}});s.request(async()=>{throw Error('network unavailable')});await s.run('resumeUnverifiedSaves()');assert.equal(s.state()['commons:12'].reviewState,'save_unverified');assert.equal(s.run("visibleDecision('commons:12',reviewDB['commons:12'])"),false);
 s.request(async()=>({...saved,name:sound.name,bytes:60}));await s.run('resumeUnverifiedSaves()');assert.equal(s.state()['commons:12'].status,'approved');assert.equal(s.state()['commons:12'].reviewState,'saved');
});
test('interrupted save returns as redo only after confirmed no saved record exists',async()=>{
 const s=setup({'commons:12':{...sound,reviewState:'saving',cloudAssetId:'commons-12',sha256:saved.sha256,storedBytes:60}});s.request(async()=>{throw Object.assign(Error('not found'),{status:404})});await s.run('resumeUnverifiedSaves()');assert.equal(s.state()['commons:12'].reviewState,'failed');assert.equal(s.run("visibleDecision('commons:12',reviewDB['commons:12'])"),true);
});


test('every rendered decision offers Approve; even a stale pending record with a completed receipt stays hidden',()=>{
 const s=setup({'commons:12':{...sound,status:'deleting',reviewState:'delete_failed'},'commons:13':{...sound,cloudReceipts:{dropbox:{verified:true}}},'commons:14':{...sound,name:'ready.wav'}});s.run('renderQueue()');assert.deepEqual(s.nodes.get('queue').children.map(r=>r.dataset.soundRow),['commons:14']);assert.equal(s.nodes.get('queueCount').textContent,1);assert.equal(s.run("soundRow('commons:14',reviewDB['commons:14']).children[1].children[1].disabled"),false);assert(s.state()['commons:12'].deleteError===undefined);assert.equal(s.state()['commons:12'].status,'deleting');
});

test('fresh search also suppresses records that cannot offer Approve',async()=>{
 const s=setup({'commons:12':{...sound,cloudReceipts:{dropbox:{verified:true}}}});s.run("let offset=0,busy=false,last='',seen=new Set()");s.run(html.slice(html.indexOf('const esc='),html.indexOf("$('go').onclick")));s.run("$('q').value='cricket'");s.context.fetch=async()=>({ok:true,json:async()=>({query:{pages:{one:{pageid:12,title:'File:saved.wav',imageinfo:[{url:'https://example.invalid/a.wav',mime:'audio/wav'}]},two:{pageid:13,title:'File:pending.wav',imageinfo:[{url:'https://example.invalid/b.wav',mime:'audio/wav'}]}}}})});await s.run('search(true)');assert.deepEqual(s.nodes.get('results').children.map(r=>r.dataset.soundRow),['commons:13']);
});
