/* Approved effects v1: shared owner decisions and original audio, no timeline edits. */
(() => {
 'use strict';
 const KEY='sx-scrubber-review-v2',REJECT='sx-scrubber-rejected-v1',listeners=new Set();
 let database;
 const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}};
 function list(){const reject=read(REJECT);return Object.entries(read(KEY)).filter(([id,v])=>v&&v.status==='approved'&&!reject[id]).map(([id,v])=>(window.GSEffectClassification?.enrich({...v,sourceId:id,id:'scrubber-'+id})||{...v,sourceId:id,id:'scrubber-'+id})).sort((a,b)=>a.name.localeCompare(b.name));}
 function saveLedger(ledger){localStorage.setItem(KEY,JSON.stringify(ledger));notify();channel?.postMessage({type:'changed'})}
 async function request(path,body){const key=localStorage.getItem('gs_previewlock_key');if(!key)throw Error('Category saved here; cloud sync will resume when PreviewLock is connected.');const r=await fetch('https://gs-previewlock-api.onrender.com'+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+key,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('Category cloud sync needs retry ('+r.status+'). Your local category is retained.');return r.json()}
 let refreshJob=null,lastRefresh=0;
 async function syncOne(id){
  const v=read(KEY)[id];if(!v||v.status!=='approved'||!v.cloudAssetId||!v.sha256)return;
  if(v.classificationPending){const sent=v.classification;const result=await request('/api/audio-classify',{assetId:v.cloudAssetId,sha256:v.sha256,classification:sent});const ledger=read(KEY),current=ledger[id];if(current?.status==='approved'&&current.sha256===v.sha256&&JSON.stringify(current.classification)===JSON.stringify(sent)&&result.persisted&&result.sha256===v.sha256){current.classificationPending=false;saveLedger(ledger)}return}
  const result=await request('/api/audio-record?assetId='+encodeURIComponent(v.cloudAssetId));
  const ledger=read(KEY),current=ledger[id],c=window.GSEffectClassification.normalize(result.classification);
  if(!current||current.status!=='approved'||current.sha256!==v.sha256||current.classificationPending||result.sha256!==v.sha256||result.bytes!==v.storedBytes||!result.cloudReceipts?.dropbox?.verified||!c)return;
  if(JSON.stringify(current.classification)===JSON.stringify(c))return;
  current.classification=c;saveLedger(ledger);
 }
 function refresh(){if(!window.GSEffectClassification||refreshJob||Date.now()-lastRefresh<60000||!localStorage.getItem('gs_previewlock_key'))return refreshJob;lastRefresh=Date.now();refreshJob=(async()=>{for(const [id,v]of Object.entries(read(KEY)))if(v.status==='approved')try{await syncOne(id)}catch{}})().finally(()=>{refreshJob=null});return refreshJob}
 async function updateClassification(id,value){const ledger=read(KEY),v=ledger[id];if(!v||v.status!=='approved')throw Error('This sound is no longer approved.');const c=window.GSEffectClassification.normalize({...value,schema:1,method:'owner',updatedAt:new Date().toISOString()});if(!c)throw Error('Enter a category.');v.classification=c;v.classificationPending=true;saveLedger(ledger);await syncOne(id)}
 function notify(){const entries=list();for(const fn of listeners){try{fn(entries)}catch(e){console.warn('Approved effects refresh failed',e)}}}
 function db(){if(!database)database=new Promise((resolve,reject)=>{const req=indexedDB.open('scrubber-saved-audio',1);req.onupgradeneeded=()=>req.result.createObjectStore('sounds');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)}).catch(e=>{database=null;throw e});return database;}
 async function cached(id){const store=await db();return new Promise((resolve,reject)=>{const q=store.transaction('sounds').objectStore('sounds').get(id);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});}
 async function blob(entry){
  // Saved projects may retain this approved identity even after intake rejection.
  let file=await cached(entry.sourceId||entry.scrubberSourceId).catch(()=>null);
  if(!file){
   const path=entry.cloudReceipts?.dropbox?.path||entry.cloudPath;
   const key=localStorage.getItem('gs_previewlock_key')||'';
   if(!path||!key)throw Error('Approved audio is unavailable here. Return to Sound Scrubber to resume its saved original.');
   if(!path.startsWith('/Grill Sergeant/Sound Effects/')||path.includes('..'))throw Error('Invalid approved audio path');
   const lookup=await fetch('https://gs-previewlock-api.onrender.com/api/playback?path='+encodeURIComponent(path),{headers:{authorization:'Bearer '+key}});
   if(!lookup.ok)throw Error('Approved audio cloud lookup failed');
   const response=await fetch((await lookup.json()).url);if(!response.ok)throw Error('Approved audio download failed');file=await response.blob();
  }
  if(!(file instanceof Blob)||!file.size||file.size>64*1024*1024)throw Error('Approved audio is empty or exceeds the 64 MB editor limit');
  if(entry.storedBytes&&file.size!==entry.storedBytes)throw Error('Approved audio byte count mismatch');
  if(/^[a-f0-9]{64}$/.test(entry.sha256||'')){
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');
   if(hash!==entry.sha256)throw Error('Approved audio hash mismatch');
  }
  return file;
 }
 const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('gs-approved-effects-v1'):null;
 channel?.addEventListener('message',notify);
 window.addEventListener('storage',e=>{if(e.key===KEY||e.key===REJECT||e.key===null)notify()});
 window.addEventListener('focus',()=>{notify();refresh()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){notify();refresh()}});
 window.GSApprovedEffects={list,blob,updateClassification,refresh,subscribe(fn){listeners.add(fn);fn(list());refresh();return()=>listeners.delete(fn)},publish(){notify();channel?.postMessage({type:'changed'})}};
})();

