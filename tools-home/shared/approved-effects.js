/* Shared owner decisions and original audio. */
(() => {
 'use strict';
 const KEY='sx-scrubber-review-v2',REJECT='sx-scrubber-rejected-v1',listeners=new Set();
 const API='https://gs-previewlock-api.onrender.com',DRIVE_SESSION='gs_sound_drive_session';
 let database;
 const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}};
 function list(){const reject=read(REJECT);return Object.entries(read(KEY)).filter(([id,v])=>v&&v.status==='approved'&&!reject[id]).map(([id,v])=>(window.GSEffectClassification?.enrich({...v,sourceId:id,id:'scrubber-'+id})||{...v,sourceId:id,id:'scrubber-'+id})).sort((a,b)=>a.name.localeCompare(b.name));}
 function saveLedger(ledger){localStorage.setItem(KEY,JSON.stringify(ledger));notify();channel?.postMessage({type:'changed'})}
 const usesDrive=v=>v.storageProvider==='drive'||v.cloudReceipts?.drive?.provider==='drive';
 async function audioFetch(path,options={}){
  const drive=path.startsWith('/api/audio-drive-');
  const key=localStorage.getItem(drive?DRIVE_SESSION:'gs_previewlock_key');
 if(!key)throw Object.assign(Error(drive?'Connect Google Drive to finish saving.':'PreviewLock connection is required for older sounds and cloud sync.'),{status:401});
  const response=await fetch(API+path,{...options,headers:{authorization:'Bearer '+key,...options.headers}});
  if(!response.ok){
   const result=await response.json().catch(()=>({}));
   throw Object.assign(Error(result.error||(drive?'Google Drive request ':'Sound storage request ')+response.status),{status:response.status});
  }
  return response;
 }
 async function request(path,body){
  const options=body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{};
  return (await audioFetch(path,options)).json();
 }
 let refreshJob=null,lastRefresh=0;
 async function syncOne(id){
  const v=read(KEY)[id];if(!v||v.status!=='approved'||!v.cloudAssetId||!v.sha256)return;
  const drive=usesDrive(v),route=drive?'/api/audio-drive-':'/api/audio-';
  if(drive&&(!localStorage.getItem(DRIVE_SESSION)||!v.cloudReceipts?.drive?.verified)){
   if(v.classificationPending)throw Error('Category saved on this device. Google Drive sync is pending.');
   return;
  }
  if(v.classificationPending){const sent=v.classification;const result=await request(route+'classify',{assetId:v.cloudAssetId,sha256:v.sha256,classification:sent});const ledger=read(KEY),current=ledger[id];if(current?.status==='approved'&&current.sha256===v.sha256&&JSON.stringify(current.classification)===JSON.stringify(sent)&&result.persisted&&result.sha256===v.sha256){current.classificationPending=false;saveLedger(ledger)}return}
  const result=await request(route+'record?assetId='+encodeURIComponent(v.cloudAssetId));
  const ledger=read(KEY),current=ledger[id],c=window.GSEffectClassification.normalize(result.classification);
  if(!current||current.status!=='approved'||current.sha256!==v.sha256||current.classificationPending||result.sha256!==v.sha256||result.bytes!==v.storedBytes||!(drive?result.cloudReceipts?.drive?.verified:result.cloudReceipts?.dropbox?.verified)||!c)return;
  if(JSON.stringify(current.classification)===JSON.stringify(c))return;
  current.classification=c;saveLedger(ledger);
 }
 function refresh(){if(!window.GSEffectClassification||refreshJob||Date.now()-lastRefresh<60000||!localStorage.getItem('gs_previewlock_key')&&!localStorage.getItem(DRIVE_SESSION))return refreshJob;lastRefresh=Date.now();refreshJob=(async()=>{for(const [id,v]of Object.entries(read(KEY)))if(v.status==='approved')try{await syncOne(id)}catch{}})().finally(()=>{refreshJob=null});return refreshJob}
 async function updateClassification(id,value){const ledger=read(KEY),v=ledger[id];if(!v||v.status!=='approved')throw Error('This sound is no longer approved.');const c=window.GSEffectClassification.normalize({...value,schema:1,method:'owner',updatedAt:new Date().toISOString()});if(!c)throw Error('Enter a category.');v.classification=c;v.classificationPending=true;saveLedger(ledger);await syncOne(id)}
 function notify(){const entries=list();for(const fn of listeners){try{fn(entries)}catch(e){console.warn('Approved effects refresh failed',e)}}}
 function db(){if(!database)database=new Promise((resolve,reject)=>{const req=indexedDB.open('scrubber-saved-audio',1);req.onupgradeneeded=()=>req.result.createObjectStore('sounds');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)}).catch(e=>{database=null;throw e});return database;}
 async function cached(id){const store=await db();return new Promise((resolve,reject)=>{const q=store.transaction('sounds').objectStore('sounds').get(id);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});}
 async function blob(entry){
  // Saved projects may retain this approved identity even after intake rejection.
  let file=await cached(entry.sourceId||entry.scrubberSourceId).catch(()=>null);
  if(!file&&usesDrive(entry)){
   if(!entry.cloudAssetId||!/^[a-f0-9]{64}$/.test(entry.sha256||''))throw Error('The approved original is unavailable on this device.');
   const query=new URLSearchParams({assetId:entry.cloudAssetId,sha256:entry.sha256});
   if(entry.cloudReceipts?.drive?.fileId)query.set('fileId',entry.cloudReceipts.drive.fileId);
   const response=await audioFetch('/api/audio-drive-original?'+query);
   file=await response.blob();
  }
  if(!file){
   const path=entry.cloudReceipts?.dropbox?.path||entry.cloudPath;
   const key=localStorage.getItem('gs_previewlock_key')||'';
   if(!path||!key)throw Error('Approved audio is unavailable here. Return to Sound Scrubber to resume its saved original.');
   if(!path.startsWith('/Grill Sergeant/Sound Effects/')||path.includes('..'))throw Error('Invalid approved audio path');
   const lookup=await audioFetch('/api/playback?path='+encodeURIComponent(path));
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
 window.GSApprovedEffects={list,blob,audioFetch,driveSessionKey:DRIVE_SESSION,updateClassification,refresh,subscribe(fn){listeners.add(fn);fn(list());refresh();return()=>listeners.delete(fn)},publish(){notify();channel?.postMessage({type:'changed'})}};
})();

