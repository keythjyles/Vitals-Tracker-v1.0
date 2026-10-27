import {createHash,randomUUID} from 'node:crypto';
export const AUDIO_ROOT='/Grill Sergeant/Sound Effects';
export const DRIVE_LIBRARY_FOLDER='1H269DHSY2hYwD7SKhmCmh2uAmBCh9LDy';
export const AUDIO_DELETE_ROOT='/Grill Sergeant/Sound Effect Deletions';
const MAX=100*1024*1024;
const ID=/^(commons-\d{1,14}|local-[a-f0-9]{64}|check-[a-f0-9]{8,64})$/;
export function validName(name){return typeof name==='string'&&/^[^\\/<>:"|?*\x00-\x1f]{1,170}\.(ogg|oga|opus|wav|mp3|flac|m4a)$/i.test(name)}
export function contentHash(data){const chunks=[];for(let i=0;i<data.length;i+=4*1024*1024)chunks.push(createHash('sha256').update(data.subarray(i,i+4*1024*1024)).digest());return createHash('sha256').update(Buffer.concat(chunks)).digest('hex')}
export function validAudio(data,name){const ext=name.split('.').pop().toLowerCase(),s=data.toString('ascii',0,12);return data.length>=12&&(ext==='wav'?s.startsWith('RIFF')&&s.slice(8,12)==='WAVE':['ogg','oga','opus'].includes(ext)?s.startsWith('OggS'):ext==='flac'?s.startsWith('fLaC'):ext==='m4a'?s.slice(4,8)==='ftyp':ext==='mp3'&&(s.startsWith('ID3')||(data[0]===255&&(data[1]&224)===224)))}
export class AudioError extends Error{constructor(status,message){super(message);this.status=status}}
export function dropboxClient(token,fetcher=fetch){
 async function call(endpoint,data){const r=await fetcher('https://api.dropboxapi.com/2/files/'+endpoint,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(data)});const d=await r.json();if(!r.ok){if(d.error_summary?.startsWith('path/not_found'))return null;throw new AudioError(r.status===409?409:502,'Dropbox '+endpoint+' failed')}return d}
 return {
  async folder(path){try{return await call('create_folder_v2',{path,autorename:false})}catch(e){if(e.status!==409)throw e;const m=await call('get_metadata',{path});if(m?.['.tag']!=='folder')throw e;return m}},
  meta:path=>call('get_metadata',{path}),
  async list(path){let page=await call('list_folder',{path,recursive:false,limit:2000});if(!page)return {entries:[]};const entries=[...page.entries];while(page.has_more){page=await call('list_folder/continue',{cursor:page.cursor});if(!page)throw new AudioError(502,'Dropbox listing interrupted');entries.push(...page.entries)}return {entries}},
  remove:path=>call('delete_v2',{path}),
  move:(from,to)=>call('move_v2',{from_path:from,to_path:to,autorename:false}),
  async read(path){const r=await fetcher('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{authorization:'Bearer '+token,'dropbox-api-arg':JSON.stringify({path})}});if(!r.ok){const d=await r.json();if(d.error_summary?.startsWith('path/not_found'))return null;throw new AudioError(502,'Dropbox audio record read failed')}return {data:await r.json(),rev:JSON.parse(r.headers.get('dropbox-api-result')||'{}').rev}},
  async write(path,data,rev){const r=await fetcher('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/octet-stream','dropbox-api-arg':JSON.stringify({path,mode:rev?{'.tag':'update',update:rev}:{'.tag':'add'},strict_conflict:true,autorename:false,mute:true})},body:data});if(!r.ok)throw new AudioError(r.status===409?409:502,'Dropbox audio write failed');return r.json()}
 }
}
function verify(meta,data){if(!meta?.id||!meta.rev||meta.size!==data.length||meta.content_hash!==contentHash(data))throw new AudioError(502,'Dropbox audio verification failed');return {verified:true,id:meta.id,path:meta.path_display,rev:meta.rev,bytes:meta.size,contentHash:meta.content_hash,verifiedAt:new Date().toISOString()}}
export async function saveAudio(db,{assetId,name,data,info={},sha256}){
 if(!ID.test(assetId)||!validName(name))throw new AudioError(400,'Invalid audio identity or filename');
 if(data.length>MAX)throw new AudioError(413,'Audio exceeds 100 MB');
 if(!validAudio(data,name))throw new AudioError(415,'Audio format does not match filename');
 const hash=createHash('sha256').update(data).digest('hex');if(hash!==sha256)throw new AudioError(422,'Audio SHA-256 mismatch');
 await requireNoDeletion(db,assetId,true);
 const folder=AUDIO_ROOT+'/'+assetId,recordPath=folder+'/asset.json';
 await db.folder(AUDIO_ROOT);await db.folder(folder);
 const prior=await db.read(recordPath);if(prior&&prior.data.sha256!==hash)throw new AudioError(409,'Original differs; existing recording preserved');
 let path=folder+'/'+name,meta;
 if(prior?.data.cloudReceipts?.dropbox?.id){meta=await db.meta(prior.data.cloudReceipts.dropbox.id);verify(meta,data);if(meta.path_display!==path){await db.move(meta.path_display,path);meta=await db.meta(meta.id)}}
 else{meta=await db.meta(path);if(!meta){try{await db.write(path,data)}catch(e){if(e.status!==409)throw e}meta=await db.meta(path)}}
 const receipt=verify(meta,data);
 const record={...(prior?.data||{}),schema:'SoundScrubberCloud-1',assetId,name,originalName:prior?.data.originalName||info.originalName||name,sha256:hash,bytes:data.length,status:'approved',approvedAt:prior?.data.approvedAt||info.approvedAt||new Date().toISOString(),metadata:{...info,classification:prior?.data.metadata?.classification||info.classification||null},renameHistory:[...(prior?.data.renameHistory||[]),...(prior&&prior.data.name!==name?[{from:prior.data.name,to:name,at:new Date().toISOString()}]:[])],cloudReceipts:{...(prior?.data.cloudReceipts||{}),dropbox:receipt,drive:prior?.data.cloudReceipts?.drive||{verified:false,status:'pending'}},updatedAt:new Date().toISOString()};
 const bytes=Buffer.from(JSON.stringify(record));await db.write(recordPath,bytes,prior?.rev);const saved=await db.meta(recordPath);if(saved?.size!==bytes.length||saved?.content_hash!==contentHash(bytes))throw new AudioError(502,'Audio saved; metadata verification pending. Retry safely.');
 return {assetId,name,sha256:hash,cloudReceipts:record.cloudReceipts,recordPath,cloudSaveStatus:record.cloudReceipts.drive.verified?'verified':'partial',persisted:true};
}
export async function renameAudio(db,{assetId,name}){
 if(!ID.test(assetId)||!validName(name))throw new AudioError(400,'Invalid audio identity or filename');
 await requireNoDeletion(db,assetId);
 const folder=AUDIO_ROOT+'/'+assetId,recordPath=folder+'/asset.json',prior=await db.read(recordPath);if(!prior)throw new AudioError(404,'Saved audio record not found');
 const record=prior.data,receipt=record.cloudReceipts?.dropbox;if(!receipt?.id)throw new AudioError(409,'Dropbox audio not yet saved');
 if(name.split('.').pop().toLowerCase()!==record.name.split('.').pop().toLowerCase())throw new AudioError(400,'Keep the original audio extension');
 let meta=await db.meta(receipt.id);if(!meta||meta.content_hash!==receipt.contentHash||meta.size!==receipt.bytes)throw new AudioError(409,'Dropbox original changed; rename stopped');
 if(meta.path_display!==folder+'/'+name){await db.move(meta.path_display,folder+'/'+name);meta=await db.meta(meta.id)}
 record.renameHistory=[...(record.renameHistory||[]),{from:record.name,to:name,at:new Date().toISOString()}];record.name=name;record.updatedAt=new Date().toISOString();record.cloudReceipts.dropbox={...receipt,path:meta.path_display,rev:meta.rev,verifiedAt:record.updatedAt};record.cloudReceipts.drive={...(record.cloudReceipts.drive||{}),verified:false,status:'rename_pending'};
 const bytes=Buffer.from(JSON.stringify(record));await db.write(recordPath,bytes,prior.rev);const saved=await db.meta(recordPath);if(saved?.content_hash!==contentHash(bytes))throw new AudioError(502,'Rename metadata verification failed');return {name,cloudReceipts:record.cloudReceipts,recordPath};
}
export async function getAudioRecord(db,assetId){
 if(!ID.test(assetId))throw new AudioError(400,'Invalid audio identity');
 await requireNoDeletion(db,assetId);
 const folder=AUDIO_ROOT+'/'+assetId,prior=await db.read(folder+'/asset.json');if(!prior)throw new AudioError(404,'Audio record not found');
 const record=prior.data;
 const files=(await db.list(folder))?.entries||[];
 const receipts=files.filter(f=>/^drive-receipt-\d{13}\.json$/.test(f.name)).sort((a,b)=>b.name.localeCompare(a.name));
 let drive={verified:false,status:'pending'};
 for(const entry of receipts){
  const r=(await db.read(entry.path_display))?.data;
  if(r?.schema==='SoundScrubberDriveReceipt-1'&&r.assetId===assetId&&r.sha256===record.sha256&&r.bytes===record.bytes&&r.name===record.name&&r.rootFolderId===DRIVE_LIBRARY_FOLDER&&r.verified===true&&r.method==='connected-drive-upload-and-readback'&&/^[A-Za-z0-9_-]{10,200}$/.test(r.fileId||'')){
   drive={...r,receiptPath:entry.path_display};break;
  }
 }
 let classification=record.metadata?.classification||null;
 if(classification?.method!=='owner')for(const f of files.filter(f=>/^classification-\d{13}\.json$/.test(f.name)).sort((a,b)=>b.name.localeCompare(a.name))){
  const r=(await db.read(f.path_display))?.data;
  if(r?.schema==='SoundScrubberClassification-1'&&r.assetId===assetId&&r.sha256===record.sha256&&r.bytes===record.bytes&&validClassification(r.classification)&&r.classification.method==='ai-metadata-v1'){classification=r.classification;break}
 }
 const receipt=record.cloudReceipts.dropbox,current=await db.meta(receipt.id);
 const dropbox={...receipt,verified:Boolean(current&&current.size===record.bytes&&current.content_hash===receipt.contentHash&&current.path_display===receipt.path)};
 return {assetId,name:record.name,sha256:record.sha256,bytes:record.bytes,classification,cloudReceipts:{dropbox,drive},cloudSaveStatus:drive.verified&&dropbox.verified?'verified':'partial'};
}
export function validClassification(c){
 const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\u0000-\u001f<>]/.test(v);
 return Boolean(c&&c.schema===1&&['owner','ai-metadata-v1','metadata-rules-v1'].includes(c.method)&&text(c.category,80)&&typeof c.subcategory==='string'&&c.subcategory.length<=80&&!/[\u0000-\u001f<>]/.test(c.subcategory)&&[c.tags,c.aliases].every(a=>Array.isArray(a)&&a.length<=40&&a.every(t=>text(t,80))));
}
export async function classifyAudio(db,{assetId,sha256,classification}){
 if(!ID.test(assetId)||!/^[a-f0-9]{64}$/.test(sha256||'')||!validClassification(classification)||classification.method!=='owner')throw new AudioError(400,'Invalid sound classification');
 await requireNoDeletion(db,assetId);
 const recordPath=AUDIO_ROOT+'/'+assetId+'/asset.json',prior=await db.read(recordPath);
 if(!prior)throw new AudioError(404,'Saved audio record not found');
 const record=prior.data;if(record.status!=='approved'||record.sha256!==sha256)throw new AudioError(409,'Sound identity changed; classification stopped');
 const receipt=record.cloudReceipts?.dropbox,current=receipt?.id&&await db.meta(receipt.id);
 if(!current||current.content_hash!==receipt.contentHash||current.size!==record.bytes)throw new AudioError(409,'Saved original changed; classification stopped');
 const value={schema:1,method:'owner',category:classification.category.trim(),subcategory:classification.subcategory.trim(),tags:[...new Set(classification.tags)],aliases:[...new Set(classification.aliases)],updatedAt:new Date().toISOString()};
 record.metadata={...record.metadata,classification:value};record.updatedAt=value.updatedAt;
 await writeVerified(db,recordPath,record,prior.rev);
 return {assetId,sha256,classification:value,persisted:true};
}
async function writeVerified(db,path,value,rev){
 const bytes=Buffer.from(JSON.stringify(value));await db.write(path,bytes,rev);
 const meta=await db.meta(path);if(meta?.size!==bytes.length||meta.content_hash!==contentHash(bytes))throw new AudioError(502,'Deletion checkpoint not verified; retry');
}
async function requireNoDeletion(db,assetId,allowCompleted=false){
 const path=AUDIO_DELETE_ROOT+'/'+assetId+'.json',job=await db.read(path);
 if(!job)return;
 if(allowCompleted&&job.data.complete===true){await db.remove(path);if(await db.meta(path))throw new AudioError(502,'Previous deletion receipt cleanup pending');return}
 throw new AudioError(409,'This recording has a managed deletion request; retry Delete to refresh its status');
}
function deletionResult(job){return {assetId:job.assetId,requestId:job.requestId,persisted:true,complete:job.complete===true,destinations:job.destinations}}
export async function deleteAudio(db,{assetId,sha256,name,contentHash:expectedContentHash,bytes}){
 if(!ID.test(assetId)||!/^[a-f0-9]{64}$/.test(sha256||''))throw new AudioError(400,'Invalid deletion identity');
 const folder=AUDIO_ROOT+'/'+assetId,jobPath=AUDIO_DELETE_ROOT+'/'+assetId+'.json';
 let saved=await db.read(jobPath),job=saved?.data;
 if(job&&(job.assetId!==assetId||job.sha256!==sha256))throw new AudioError(409,'Deletion identity changed; recording retained');
 if(job?.complete)return deletionResult(job);
 if(!job){
  const prior=await db.read(folder+'/asset.json');const record=prior?.data;
  if(record&&(record.assetId!==assetId||record.sha256!==sha256))throw new AudioError(409,'Saved original differs; deletion stopped');
  const entries=(await db.list(folder)).entries;
  const originalName=record?.name||name;
  if(entries.length&&!validName(originalName))throw new AudioError(409,'Original identity needs recovery before deletion');
  const receipts=record?.cloudReceipts?.drive?.verified?[record.cloudReceipts.drive]:[];
  for(const entry of entries){
   if(entry['.tag']==='folder'||![originalName,'asset.json'].includes(entry.name)&&!/^drive-receipt-\d{13}\.json$/.test(entry.name)&&!/^classification-\d{13}\.json$/.test(entry.name))throw new AudioError(409,'Unrecognized managed file; deletion stopped');
   if(/^drive-receipt-\d{13}\.json$/.test(entry.name)){const r=(await db.read(entry.path_display))?.data;if(r?.assetId!==assetId||r.sha256!==sha256||r.rootFolderId!==DRIVE_LIBRARY_FOLDER)throw new AudioError(409,'Drive receipt identity differs; deletion stopped');receipts.push(r)}
   if(/^classification-\d{13}\.json$/.test(entry.name)){const r=(await db.read(entry.path_display))?.data;if(r?.schema!=='SoundScrubberClassification-1'||r.assetId!==assetId||r.sha256!==sha256||r.bytes!==(record?.bytes??bytes)||!validClassification(r.classification))throw new AudioError(409,'Classification identity differs; deletion stopped')}
   if(entry.name===originalName){
    const receipt=record?.cloudReceipts?.dropbox;
    if(entry.size!==(record?.bytes??bytes)||entry.content_hash!==(receipt?.contentHash||expectedContentHash)||receipt?.id&&entry.id!==receipt.id)throw new AudioError(409,'Dropbox original differs; deletion stopped');
   }
  }
  job={schema:'SoundScrubberDeletion-1',assetId,sha256,name:originalName||null,bytes:record?.bytes??bytes??null,requestId:randomUUID(),requestedAt:new Date().toISOString(),rootFolderId:DRIVE_LIBRARY_FOLDER,driveReceipts:receipts,managedFiles:entries.map(e=>({id:e.id,name:e.name,contentHash:e.content_hash,bytes:e.size})),complete:false,destinations:{dropbox:{verified:false,status:'pending'},drive:{verified:false,status:'pending'}}};
  // This durable intent precedes any removal. The daily mirror must skip it.
  await db.folder(AUDIO_DELETE_ROOT);await writeVerified(db,jobPath,job);
 }
 // Re-read each provider state on every retry; never turn an error into absence.
 try{
  const entries=(await db.list(folder)).entries;
  for(const e of entries){const planned=job.managedFiles.find(f=>f.id===e.id&&f.name===e.name);if(!planned||e['.tag']==='folder'||e.size!==planned.bytes||e.content_hash!==planned.contentHash)throw new AudioError(409,'Managed contents changed; deletion stopped')}
  for(const entry of entries){const current=await db.meta(entry.id);if(!current)continue;if(current.content_hash!==entry.content_hash||current.size!==entry.size||current.path_display!==entry.path_display)throw new AudioError(409,'Managed file changed; deletion stopped');await db.remove(entry.id);if(await db.meta(entry.id))throw new AudioError(502,'Dropbox file deletion not verified')}
  if((await db.list(folder)).entries.length)throw new AudioError(409,'Managed folder is not empty');
  if(await db.meta(folder))await db.remove(folder);
  if(await db.meta(folder))throw new AudioError(502,'Dropbox deletion not verified');
  job.destinations.dropbox={verified:true,status:'deleted',verifiedAt:new Date().toISOString()};
 }catch(e){job.destinations.dropbox={verified:false,status:'failed',error:e.message}}
 // The connected Drive worker writes a separate completion receipt; it cannot
 // claim Dropbox success or mutate this job while the API is checkpointing it.
 const receipt=(await db.read(AUDIO_DELETE_ROOT+'/'+assetId+'-'+job.requestId+'-drive.json'))?.data;
 if(receipt?.schema==='SoundScrubberDriveDeletionReceipt-1'&&receipt.assetId===assetId&&receipt.sha256===sha256&&receipt.requestId===job.requestId&&receipt.rootFolderId===DRIVE_LIBRARY_FOLDER&&receipt.verified===true&&receipt.method==='connected-drive-delete-and-readback'&&['deleted','absent'].includes(receipt.status)&&Number.isFinite(Date.parse(receipt.verifiedAt))&&Date.parse(receipt.verifiedAt)>=Date.parse(job.requestedAt))job.destinations.drive={verified:true,status:receipt.status,verifiedAt:receipt.verifiedAt};
 job.complete=job.destinations.dropbox.verified&&job.destinations.drive.verified;
 job.updatedAt=new Date().toISOString();saved=await db.read(jobPath);await writeVerified(db,jobPath,job,saved?.rev);
 return deletionResult(job);
}
let active=false;
export async function handleAudio(req,res,url,token){
 if(!['/api/audio-save','/api/audio-rename','/api/audio-record','/api/audio-delete','/api/audio-classify'].includes(url.pathname))return false;
 const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'https://keythjyles.github.io'});res.end(JSON.stringify(data))};
 if(url.pathname==='/api/audio-record'&&req.method==='GET'){try{send(200,await getAudioRecord(dropboxClient(token),url.searchParams.get('assetId')||''))}catch(e){send(e.status||502,{error:e.message})}return true}
 if(req.method!=='POST'){send(405,{error:'method_not_allowed'});return true}
 if(req.headers.origin&&req.headers.origin!=='https://keythjyles.github.io'){send(403,{error:'origin_not_allowed'});return true}
 if(active){send(409,{error:'Another audio save is finishing. Retry this sound.'});return true}active=true;
 try{
  const parts=[];let size=0;for await(const c of req){size+=c.length;if(size>(url.pathname.endsWith('save')?MAX:url.pathname.endsWith('classify')?10000:4096))throw new AudioError(413,'Audio request too large');parts.push(c)}
  const data=Buffer.concat(parts),db=dropboxClient(token);let result;
  if(!url.pathname.endsWith('save')){let input;try{input=JSON.parse(data.toString())}catch{throw new AudioError(400,'Invalid audio request JSON')}if(!input||typeof input!=='object'||Array.isArray(input))throw new AudioError(400,'Invalid audio request');result=url.pathname.endsWith('delete')?await deleteAudio(db,input):url.pathname.endsWith('classify')?await classifyAudio(db,input):await renameAudio(db,input)}
  else{let info={};try{info=JSON.parse(decodeURIComponent(String(req.headers['x-audio-info']||'%7B%7D')))}catch{throw new AudioError(400,'Invalid audio metadata')}
   if(!info||typeof info!=='object'||Array.isArray(info)||JSON.stringify(info).length>10000)throw new AudioError(400,'Invalid audio metadata');
   result=await saveAudio(db,{assetId:String(req.headers['x-audio-id']||''),name:decodeURIComponent(String(req.headers['x-audio-name']||'')),sha256:String(req.headers['x-audio-sha256']||''),info,data});
  }
  send(200,result);
 }catch(e){send(e.status||502,{error:e instanceof AudioError?e.message:url.pathname.endsWith('delete')?'Audio deletion incomplete; retry to verify destinations.':'Audio save failed; original preserved. Retry safely.'})}finally{active=false}
 return true;
}

