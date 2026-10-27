import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {saveAudio,getAudioRecord,classifyAudio,deleteAudio,contentHash,AUDIO_ROOT} from './audio-store.mjs';
const shared=readFileSync(new URL('../../shared/effect-classification.js',import.meta.url),'utf8');
const bridge=readFileSync(new URL('../../shared/approved-effects.js',import.meta.url),'utf8');
const sx=readFileSync(new URL('../../tools/sxlock/sxlock.js',import.meta.url),'utf8');
function context(initial={},fetcher=async()=>{throw Error('offline')}){
 const storage=new Map([['sx-scrubber-review-v2',JSON.stringify(initial)]]),window={addEventListener(){}},document={addEventListener(){}};
 const c=vm.createContext({window,document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console,fetch:fetcher,Date,Blob,Map,Set});vm.runInContext(shared,c);vm.runInContext(bridge,c);return {c,storage,api:window.GSApprovedEffects,classifier:window.GSEffectClassification};
}
test('50 legacy cricket approvals become searchable by category, common name and scientific name without reapproval',()=>{
 const initial=Object.fromEntries(Array.from({length:50},(_,i)=>['commons:'+i,{status:'approved',name:'Acheta-domesticus-Stridulation-'+i+'.ogg'}]));
 initial.pending={status:'pending',name:'cricket.wav'};initial.deleted={status:'deleting',name:'cricket.wav'};
 const {api,c}=context(initial),entries=api.list();assert.equal(entries.length,50);assert(entries.every(v=>v.category==='Animals & nature'&&v.subcategory==='Insects'&&v.tags.includes('crickets')));
 vm.runInContext('var libraryView="all";var favoriteSounds=new Set();'+sx.slice(sx.indexOf('function matchesSound('),sx.indexOf('function soundButtons(')),c);
 c.entries=entries;assert.equal(vm.runInContext('entries.filter(s=>matchesSound(s,"all","crickets")).length',c),50);assert.equal(vm.runInContext('entries.filter(s=>matchesSound(s,"Animals & nature","acheta chirping")).length',c),50);
});
test('AI metadata classifications override filename guesses, and owner corrections override AI',()=>{
 const {classifier}=context();const ai={schema:1,method:'ai-metadata-v1',category:'Music',subcategory:'Songs',tags:['Welsh','harp'],aliases:['singing']};
 assert.equal(classifier.enrich({name:'Hen Benillion.ogg',category:'Poultry',classification:ai}).category,'Music');
 const owner={...ai,method:'owner',category:'My episode sounds'};assert.equal(classifier.enrich({name:'crickets.wav',classification:owner}).category,'My episode sounds');
 assert.equal(classifier.enrich({name:'car engine.wav',description:'a bird in the background'}).category,'Cars & engines');
 assert(!classifier.enrich({name:'Cicada.wav'}).tags.includes('cricket'));
});
test('owner edit survives offline, keeps audio identity and approval, and is not reported cloud saved',async()=>{
 const {api,storage}=context({'commons:1':{status:'approved',name:'sound.wav',cloudAssetId:'commons-1',sha256:'a'.repeat(64)}});
 await assert.rejects(api.updateClassification('commons:1',{category:'Nature',subcategory:'Crickets',tags:['night'],aliases:[]}),/cloud sync/);
 const v=JSON.parse(storage.get('sx-scrubber-review-v2'))['commons:1'];assert.equal(v.classification.method,'owner');assert(v.classificationPending);assert.equal(v.status,'approved');assert.equal(v.sha256,'a'.repeat(64));assert.equal(api.list()[0].category,'Nature');
});
test('cloud AI receipt refresh applies only to matching approved audio and does not revive deletions',async()=>{
 const entry={status:'approved',name:'sound.wav',cloudAssetId:'commons-1',sha256:'a'.repeat(64),storedBytes:60};let finish;
 const {api,storage}=context({'commons:1':entry},()=>new Promise(ok=>{finish=ok}));storage.set('gs_previewlock_key','test');const task=api.refresh();
 const ledger=JSON.parse(storage.get('sx-scrubber-review-v2'));ledger['commons:1'].status='deleting';storage.set('sx-scrubber-review-v2',JSON.stringify(ledger));
 finish({ok:true,json:async()=>({sha256:entry.sha256,bytes:60,classification:{schema:1,method:'ai-metadata-v1',category:'Nature',subcategory:'',tags:[],aliases:[]},cloudReceipts:{dropbox:{verified:true}}})});await task;assert.equal(api.list().length,0);assert.equal(JSON.parse(storage.get('sx-scrubber-review-v2'))['commons:1'].classification,undefined);
});
function dbMock(){let rev=0;const files=new Map();return {files,folder:async()=>{},read:async p=>{const f=files.get(p);return f?{data:JSON.parse(f.data),rev:f.meta.rev}:null},meta:async p=>(files.get(p)||[...files.values()].find(f=>f.meta.id===p))?.meta||null,list:async p=>({entries:[...files].filter(([k])=>k.startsWith(p+'/')).map(([k,f])=>({...f.meta,name:k.split('/').at(-1),'.tag':'file'}))}),write:async(p,data,r)=>{const prior=files.get(p);if(prior&&r!==prior.meta.rev)throw Error('revision conflict');data=Buffer.from(data);const meta={id:prior?.meta.id||'id:'+files.size,rev:String(++rev),size:data.length,content_hash:contentHash(data),path_display:p};files.set(p,{data,meta});return meta},remove:async p=>{const path=files.has(p)?p:[...files].find(([,f])=>f.meta.id===p)?.[0];files.delete(path)}}}
const data=Buffer.alloc(60);data.write('RIFF');data.write('WAVE',8);const input={assetId:'commons-1',name:'test.wav',data,sha256:createHash('sha256').update(data).digest('hex')};
const classification={schema:1,method:'ai-metadata-v1',category:'Nature',subcategory:'Insects',tags:['crickets'],aliases:['chirping']};
test('reads newest hash-bound AI receipt; owner metadata wins and audio bytes and receipts remain unchanged',async()=>{
 const db=dbMock();await saveAudio(db,input);const path=AUDIO_ROOT+'/commons-1/',receipt={schema:'SoundScrubberClassification-1',assetId:input.assetId,sha256:input.sha256,bytes:data.length,classification};
 await db.write(path+'classification-1793120000000.json',Buffer.from(JSON.stringify(receipt)));
 await db.write(path+'classification-1793120000001.json',Buffer.from(JSON.stringify({...receipt,sha256:'0'.repeat(64)})));
 assert.equal((await getAudioRecord(db,input.assetId)).classification.category,'Nature');
 const saved=await classifyAudio(db,{...input,classification:{...classification,method:'owner',category:'Episode 5'}});assert(saved.persisted);
 const record=await getAudioRecord(db,input.assetId);assert.equal(record.classification.category,'Episode 5');assert(record.cloudReceipts.dropbox.verified);assert.equal(record.cloudReceipts.drive.verified,false);assert.deepEqual(db.files.get(path+'test.wav').data,data);
 await assert.rejects(classifyAudio(db,{...input,sha256:'0'.repeat(64),classification:{...classification,method:'owner'}}),/identity changed/);
 await assert.rejects(classifyAudio(db,{...input,classification:{...classification,method:'owner',category:'../\u0000'}}),/Invalid/);
});
test('managed deletion accepts matching classification metadata, rejects another asset receipt',async()=>{
 const db=dbMock();await saveAudio(db,input);const path=AUDIO_ROOT+'/commons-1/',receipt={schema:'SoundScrubberClassification-1',assetId:'commons-2',sha256:input.sha256,bytes:data.length,classification};
 const f=path+'classification-1793120000000.json';await db.write(f,Buffer.from(JSON.stringify(receipt)));await assert.rejects(deleteAudio(db,input),/Classification identity/);assert(db.files.has(path+'test.wav'));
 receipt.assetId=input.assetId;await db.write(f,Buffer.from(JSON.stringify(receipt)),(await db.meta(f)).rev);const result=await deleteAudio(db,input);assert(result.destinations.dropbox.verified);assert(!db.files.has(f));assert(!db.files.has(path+'test.wav'));
});
test('SxLock category synchronization retains decoded buffers and placed cue decisions',()=>{
 const renderCalls=[],sounds=new Map(),clips=[{soundId:'scrubber-commons:1',start:2.5,offset:.25,duration:1.2,volume:35,loop:true}],buffer={fixture:true};
 sounds.set('scrubber-commons:1',{id:'scrubber-commons:1',sha256:'a'.repeat(64),origin:'scrubber',buffer});
 const info={dataset:{},textContent:'124 hosted sounds'},c=vm.createContext({sounds,clips,$:()=>info,renderCategories:()=>renderCalls.push('categories'),renderLibrary:()=>renderCalls.push('library'),renderClips:()=>renderCalls.push('clips')});
 vm.runInContext(sx.slice(sx.indexOf('function syncApprovedEffects('),sx.indexOf('libraryReady.then(()=>window.GSApprovedEffects')),c);
 c.entries=[{id:'scrubber-commons:1',sourceId:'commons:1',name:'Acheta.ogg',sha256:'a'.repeat(64),category:'Animals & nature',subcategory:'Insects',tags:['crickets'],aliases:['chirping']}];
 vm.runInContext('syncApprovedEffects(entries)',c);assert.equal(sounds.get('scrubber-commons:1').category,'Animals & nature');assert.equal(sounds.get('scrubber-commons:1').buffer,buffer);assert(sounds.get('scrubber-commons:1').tags.includes('crickets'));assert.equal(clips[0].start,2.5);assert.equal(clips[0].volume,35);assert(clips[0].loop);assert(renderCalls.includes('categories'));
});
