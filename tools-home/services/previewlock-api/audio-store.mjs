import {createHash} from 'node:crypto';
export const AUDIO_ROOT='/Grill Sergeant/Sound Effects';
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
 const folder=AUDIO_ROOT+'/'+assetId,recordPath=folder+'/asset.json';
 await db.folder(AUDIO_ROOT);await db.folder(folder);
 const prior=await db.read(recordPath);if(prior&&prior.data.sha256!==hash)throw new AudioError(409,'Original differs; existing recording preserved');
 let path=folder+'/'+name,meta;
 if(prior?.data.cloudReceipts?.dropbox?.id){meta=await db.meta(prior.data.cloudReceipts.dropbox.id);verify(meta,data);if(meta.path_display!==path){await db.move(meta.path_display,path);meta=await db.meta(meta.id)}}
 else{meta=await db.meta(path);if(!meta){try{await db.write(path,data)}catch(e){if(e.status!==409)throw e}meta=await db.meta(path)}}
 const receipt=verify(meta,data);
 const record={...(prior?.data||{}),schema:'SoundScrubberCloud-1',assetId,name,originalName:prior?.data.originalName||info.originalName||name,sha256:hash,bytes:data.length,status:'approved',approvedAt:prior?.data.approvedAt||info.approvedAt||new Date().toISOString(),metadata:info,renameHistory:[...(prior?.data.renameHistory||[]),...(prior&&prior.data.name!==name?[{from:prior.data.name,to:name,at:new Date().toISOString()}]:[])],cloudReceipts:{...(prior?.data.cloudReceipts||{}),dropbox:receipt,drive:prior?.data.cloudReceipts?.drive||{verified:false,status:'pending'}},updatedAt:new Date().toISOString()};
 const bytes=Buffer.from(JSON.stringify(record));await db.write(recordPath,bytes,prior?.rev);const saved=await db.meta(recordPath);if(saved?.size!==bytes.length||saved?.content_hash!==contentHash(bytes))throw new AudioError(502,'Audio saved; metadata verification pending. Retry safely.');
 return {assetId,name,sha256:hash,cloudReceipts:record.cloudReceipts,recordPath,cloudSaveStatus:record.cloudReceipts.drive.verified?'verified':'partial',persisted:true};
}
export async function renameAudio(db,{assetId,name}){
 if(!ID.test(assetId)||!validName(name))throw new AudioError(400,'Invalid audio identity or filename');
 const folder=AUDIO_ROOT+'/'+assetId,recordPath=folder+'/asset.json',prior=await db.read(recordPath);if(!prior)throw new AudioError(404,'Saved audio record not found');
 const record=prior.data,receipt=record.cloudReceipts?.dropbox;if(!receipt?.id)throw new AudioError(409,'Dropbox audio not yet saved');
 let meta=await db.meta(receipt.id);if(!meta||meta.content_hash!==receipt.contentHash||meta.size!==receipt.bytes)throw new AudioError(409,'Dropbox original changed; rename stopped');
 if(meta.path_display!==folder+'/'+name){await db.move(meta.path_display,folder+'/'+name);meta=await db.meta(meta.id)}
 record.renameHistory=[...(record.renameHistory||[]),{from:record.name,to:name,at:new Date().toISOString()}];record.name=name;record.updatedAt=new Date().toISOString();record.cloudReceipts.dropbox={...receipt,path:meta.path_display,rev:meta.rev,verifiedAt:record.updatedAt};
 const bytes=Buffer.from(JSON.stringify(record));await db.write(recordPath,bytes,prior.rev);const saved=await db.meta(recordPath);if(saved?.content_hash!==contentHash(bytes))throw new AudioError(502,'Rename metadata verification failed');return {name,cloudReceipts:record.cloudReceipts,recordPath};
}
let active=false;
export async function handleAudio(req,res,url,token){
 if(!['/api/audio-save','/api/audio-rename'].includes(url.pathname))return false;
 const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'https://keythjyles.github.io'});res.end(JSON.stringify(data))};
 if(req.method!=='POST'){send(405,{error:'method_not_allowed'});return true}
 if(req.headers.origin&&req.headers.origin!=='https://keythjyles.github.io'){send(403,{error:'origin_not_allowed'});return true}
 if(active){send(409,{error:'Another audio save is finishing. Retry this sound.'});return true}active=true;
 try{
  const parts=[];let size=0;for await(const c of req){size+=c.length;if(size>(url.pathname.endsWith('rename')?4096:MAX))throw new AudioError(413,'Audio request too large');parts.push(c)}
  const data=Buffer.concat(parts),db=dropboxClient(token);let result;
  if(url.pathname.endsWith('rename'))result=await renameAudio(db,JSON.parse(data.toString()));
  else{let info={};try{info=JSON.parse(decodeURIComponent(String(req.headers['x-audio-info']||'%7B%7D')))}catch{throw new AudioError(400,'Invalid audio metadata')}
   if(!info||typeof info!=='object'||Array.isArray(info)||JSON.stringify(info).length>10000)throw new AudioError(400,'Invalid audio metadata');
   result=await saveAudio(db,{assetId:String(req.headers['x-audio-id']||''),name:decodeURIComponent(String(req.headers['x-audio-name']||'')),sha256:String(req.headers['x-audio-sha256']||''),info,data});
  }
  send(200,result);
 }catch(e){send(e.status||502,{error:e instanceof AudioError?e.message:'Audio save failed; original preserved. Retry safely.'})}finally{active=false}
 return true;
}
