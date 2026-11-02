import {normalizeCutOrigin,cutProjectId,sha256Bytes,verifyCutOutput,projectBed} from './cut-jokelets-core.mjs?v=1';
const QUEUES='gs_jokelet_cut_queues_v1',PING='gs_jokelet_cut_changed_v1',EVENT='gs-jokelet-cuts-changed';
let opening;
function database(){
 if(!opening)opening=new Promise((resolve,reject)=>{
  const r=indexedDB.open('gs-jokelet-cut-handoff-v1',1);
  r.onupgradeneeded=()=>{r.result.createObjectStore('projects',{keyPath:'id'});r.result.createObjectStore('media',{keyPath:'id'});};
  r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null;};resolve(r.result);};r.onerror=()=>{opening=null;reject(r.error);};r.onblocked=()=>{opening=null;reject(Error('Close an older cut picker and retry.'));};
 });return opening;
}
async function read(store,key){const db=await database();return new Promise((resolve,reject)=>{const r=key===undefined?db.transaction(store).objectStore(store).getAll():db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function write(fn){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction(['projects','media'],'readwrite');try{fn(tx.objectStore('projects'),tx.objectStore('media'));}catch(e){tx.abort();reject(e);return;}tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||Error('Cut handoff could not be stored.'));});}
function queues(){const q=JSON.parse(localStorage.getItem(QUEUES)||'{}');if(!q||Array.isArray(q)||typeof q!=='object')throw Error('The cut handoff list could not be read.');return q;}
function changed(){try{localStorage.setItem(PING,String(Date.now())+'-'+Math.random());}catch{}window.dispatchEvent(new Event(EVENT));}
export function beginCutQueue(sourceHash,origins,{append=false}={}){
 if(!/^[a-f0-9]{64}$/.test(sourceHash)||!origins.length)throw Error('Choose a source and at least one saved cut.');
 const q=queues(),prior=append?q[sourceHash]:null,values=origins.map(normalizeCutOrigin);const merged=[...(prior?.origins||[]).filter(o=>!values.some(v=>v.cut.id===o.cut.id&&v.cut.inFrame===o.cut.inFrame&&v.cut.outFrame===o.cut.outFrame)),...values];q[sourceHash]={origins:merged,states:prior?.states||{},updated:new Date().toISOString()};localStorage.setItem(QUEUES,JSON.stringify(q));changed();
}
export function cutQueueStatus(sourceHash,id,state,error='',progress=null){
 const q=queues();if(!q[sourceHash])return;q[sourceHash].states[id]={state,error:String(error).slice(0,800),progress};q[sourceHash].updated=new Date().toISOString();localStorage.setItem(QUEUES,JSON.stringify(q));changed();
}
export const getCutProject=id=>read('projects',id);
export async function readCutVideo(id){const v=await read('media',id);return v?.blob||null;}
export async function matchingCutVideo(sha256){
 const matches=[];
 for(const record of await read('projects')){
  let digest=record.cloud?.asset?.sha256||record.sha256;
  if(!digest&&record.hasVideo){const blob=await readCutVideo(record.id);if(blob)digest=await sha256Bytes(await blob.arrayBuffer());}
  if(digest===sha256)matches.push(record);
 }
 // Identical footage can deliberately appear in several projects. Never guess among them.
 return matches.length===1?matches[0]:null;
}
export async function stageCutProject(origin,output){
 origin=normalizeCutOrigin(origin);const id=await cutProjectId(origin),prior=await getCutProject(id);
 if(prior?.cloud||prior?.hasVideo){const next={...prior,origin,updated:new Date().toISOString()};await write(projects=>projects.put(next));changed();return next;}
 const blob=output.blob;if(!(blob instanceof Blob)||!blob.size)throw Error('Prepare the cut video before opening its caption project.');
 const record={id,origin,name:output.name,format:output.format,verified:output.verified,sha256:await sha256Bytes(await blob.arrayBuffer()),bytes:blob.size,hasVideo:true,updated:new Date().toISOString()};
 await write((projects,media)=>{projects.put(record);media.put({id,blob});});changed();return record;
}
async function markCloudProject(record,project){
 const bed=projectBed(project);const next={...record,hasVideo:false,cloud:{id:project.id,asset:bed},updated:new Date().toISOString()};
 await write((projects,media)=>{projects.put(next);media.delete(record.id);});changed();return next;
}
export async function listCutProjects(sourceHash=null){
 const records=new Map((await read('projects')).map(r=>[r.id,r])),q=queues(),origins=new Map();
 for(const [hash,batch] of Object.entries(q)){if(sourceHash&&hash!==sourceHash)continue;for(const raw of batch.origins||[]){const origin=normalizeCutOrigin(raw),id=await cutProjectId(origin);origins.set(id,{origin,state:batch.states?.[id]});}}
 const result=[];for(const [id,{origin,state}]of origins){const r=records.get(id),ready=!!(r?.hasVideo||r?.cloud);result.push({id,title:origin.cut.name,stagedCut:true,cutOriginLocal:origin,cutState:r?.cloud?'saved':ready?'ready':state?.state==='error'?'error':'preparing',progress:state?.progress,error:state?.error||'',assets:r?.cloud?[r.cloud.asset]:r?.hasVideo?[{role:'bed',name:r.name,cutPreviewId:id}]:[],saved:!!r?.cloud});}
 return result.sort((a,b)=>a.cutOriginLocal.source.name.localeCompare(b.cutOriginLocal.source.name)||a.cutOriginLocal.cut.index-b.cutOriginLocal.cut.index);
}
export function watchCutProjects(callback){const storage=e=>{if([QUEUES,PING].includes(e.key))callback();};window.addEventListener('storage',storage);window.addEventListener(EVENT,callback);return()=>{window.removeEventListener('storage',storage);window.removeEventListener(EVENT,callback);};}
export async function publishCutProject(api,id,onProgress=()=>{}){
 const record=await getCutProject(id);if(!record)throw Error('This cut is still being prepared in Clipper.');const origin=normalizeCutOrigin(record.origin);if(record.hasVideo&&record.bytes>40*1024*1024)throw Error('This jokelet exceeds the existing 40 MB project-file limit. Its prepared video is retained.');
 onProgress('Opening '+origin.cut.name+' project…');
 const route='/api/joke-project/from-cut?id='+encodeURIComponent(id),post=body=>api(route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 let d=await post({origin});
 if(d.project?.cutOrigin?.state!=='ready'){
  const blob=await readCutVideo(id);if(!blob)throw Error('Return to Clipper and tap CapLock to prepare this cut again.');
  const output=verifyCutOutput({...record.verified,format:record.format,bytes:blob.size,sha256:await sha256Bytes(await blob.arrayBuffer())},origin);
  onProgress('Saving '+origin.cut.name+' video in its own jokelet project…');
  const saved=await api('/api/joke-project/asset?id='+encodeURIComponent(id)+'&role=bed&name='+encodeURIComponent(record.name),{method:'POST',headers:{'content-type':'application/octet-stream'},body:blob});
  if(!saved.persisted||saved.asset?.sha256!==output.sha256||saved.asset?.size!==output.bytes)throw Error('The jokelet video save could not be verified. Retry this project.');
  d=await post({origin,assetId:saved.asset.id,output});
 }
 const p=d.project,bed=projectBed(p);
 if(!d.persisted||p?.id!==id||await cutProjectId(p.cutOrigin?.origin)!==id||p.cutOrigin.state!=='ready'||!bed||bed.sha256!==p.cutOrigin.output?.sha256||bed.size!==p.cutOrigin.output?.bytes||!bed.path?.startsWith('/Grill Sergeant/JokeLab Productions/'+id+'/'))throw Error('The saved jokelet project did not match this cut.');
 await markCloudProject(record,p);return p;
}
