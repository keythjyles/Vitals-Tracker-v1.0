// One explicitly selected, repository-versioned experiment. No public trigger.
// Credentials stay in the existing service; Dropbox CAS prevents restart spending.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readOwnerNotes} from './gemini-owner-notes.mjs';
const RUN='GS-GEMINI-20261029-01';
const root=new URL('../../tools/jokelab/',import.meta.url);
export const experimentPath='/Grill Sergeant/JokeLab Gemini Conversations/'+RUN+'-experiment.json';
export async function handleExperimentRead(req,res,u,token){
 if(u.pathname!=='/api/gemini-experiment')return false;
 const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'https://keythjyles.github.io'});res.end(JSON.stringify(data));return true};
 if(req.method!=='GET')return send(405,{error:'method_not_allowed'});
 if(req.headers.origin&&req.headers.origin!=='https://keythjyles.github.io')return send(403,{error:'origin_not_allowed'});
 const r=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{authorization:'Bearer '+token,'dropbox-api-arg':JSON.stringify({path:experimentPath})}});
 if(!r.ok)return send(502,{error:'experiment_read_failed'});
 const first=await r.json();if(first.events?.some(e=>e.state==='running')){await runExperiment(token,{retrieveOnly:true,maxPolls:1});const refreshed=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{authorization:'Bearer '+token,'dropbox-api-arg':JSON.stringify({path:experimentPath})}});if(refreshed.ok)return send(200,{experiment:await refreshed.json()});}
 return send(200,{experiment:first});
}
const hash=value=>createHash('sha256').update(value).digest('hex');
export async function runExperiment(token,{env=process.env,fetcher=fetch,jobOverride,retrieveOnly=false,maxPolls=60}={}){
 if(env.GEMINI_EXPERIMENT_RUN_ID!==RUN)return {state:'disabled'};
 if(!env.GEMINI_API_KEY)throw Error('experiment_not_configured');
 const job=jobOverride||JSON.parse(await readFile(new URL('runs/'+RUN+'.job.json',root),'utf8'));
 if(job.runId!==RUN||job.authorization.currency!=='USD'||job.authorization.cap!==5||!job.authorization.evidence)throw Error('invalid_experiment_authorization');
 const headers={authorization:'Bearer '+token};
 async function load(){
  const r=await fetcher('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{...headers,'dropbox-api-arg':JSON.stringify({path:experimentPath})}});
  if(r.ok){const rev=JSON.parse(r.headers.get('dropbox-api-result')||'{}').rev;if(!rev)throw Error('missing_revision');return {doc:await r.json(),rev}}
  if(r.status===409&&(await r.text()).includes('not_found'))return {doc:{schema:'GS-CollaborationExperiment-1',runId:RUN,authorization:job.authorization,events:[]},rev:null};
  throw Error('experiment_read_failed');
 }
 async function save(doc,rev){
  const mk=await fetcher('https://api.dropboxapi.com/2/files/create_folder_v2',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({path:experimentPath.slice(0,experimentPath.lastIndexOf('/')),autorename:false})});
  if(!mk.ok&&!(await mk.text()).includes('conflict'))throw Error('experiment_folder_failed');
  const r=await fetcher('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{...headers,'content-type':'application/octet-stream','dropbox-api-arg':JSON.stringify({path:experimentPath,mode:rev?{'.tag':'update',update:rev}:{'.tag':'add'},autorename:false,strict_conflict:true,mute:true})},body:JSON.stringify(doc)});
  if(!r.ok)throw Error(r.status===409?'experiment_conflict':'experiment_save_failed');
  const receipt=await r.json();if(!receipt.rev)throw Error('missing_saved_revision');return receipt.rev;
 }
 let prior=await load();const action=job.action;
 for(const resolution of job.reconciliations||[job.reconcile].filter(Boolean)){
  const old=prior.doc.events.find(e=>e.id===resolution.id);
  const rejected=old?.state==='uncertain'&&[400,404].includes(old.providerStatus)&&old.providerStatus===(resolution.providerStatus??404);
  const terminalFailure=old?.state==='incomplete'&&old.providerState==='failed'&&resolution.kind==='terminal_provider_failure'&&JSON.stringify(old.providerError||'').includes(resolution.errorCode||'__none__');
  const manuallyAbandoned=old?.state==='uncertain'&&!old.providerStatus&&resolution.kind==='operator_abandon_with_full_reservation';
  if((rejected||manuallyAbandoned||terminalFailure)&&old.requestSha256===resolution.requestSha256){
   old.state=(rejected||terminalFailure)?'rejected':'abandoned_uncertain';old.resolution={at:new Date().toISOString(),reason:resolution.reason,reservationRetained:true};
   prior.rev=await save(prior.doc,prior.rev);
  }
 }
 async function finish(event,document,rev,response){
  if(response.id){event.responseId=response.id;event.modelVersion=response.model||event.model;event.providerState=response.status;event.state='running';rev=await save(document,rev);}
  if(['in_progress','queued','running'].includes(response.status)){
   event.state='running';rev=await save(document,rev);
   for(let n=0;n<maxPolls;n++){
    try{const r=await fetcher('https://generativelanguage.googleapis.com/v1beta/interactions/'+encodeURIComponent(event.responseId),{headers:{'x-goog-api-key':env.GEMINI_API_KEY},signal:AbortSignal.timeout(20000)});if(!r.ok)return {state:'running',actionId:event.id,persisted:true};response=await r.json();}catch{return {state:'running',actionId:event.id,persisted:true}}
    if(!['in_progress','queued','running'].includes(response.status))break;
    if(n+1<maxPolls)await new Promise(resolve=>setTimeout(resolve,3000));
   }
   if(['in_progress','queued','running'].includes(response.status))return {state:'running',actionId:event.id,persisted:true};
  }
  const video=(response.steps||[]).filter(s=>s.type==='model_output').flatMap(s=>s.content||[]).find(p=>p.type==='video');
  if(event.type==='video'&&video&&response.status==='completed'){
   let bytes;
   if(video.data)bytes=Buffer.from(video.data,'base64');
   else if(video.uri){
    const uri=new URL(video.uri);if(uri.protocol!=='https:'||!['generativelanguage.googleapis.com','storage.googleapis.com'].includes(uri.hostname))throw Error('unsupported_video_delivery_host');
    const r=await fetcher(uri.href,{headers:uri.hostname==='generativelanguage.googleapis.com'?{'x-goog-api-key':env.GEMINI_API_KEY}:{},redirect:'error',signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('video_download_failed');bytes=Buffer.from(await r.arrayBuffer());
   }
   if(!bytes?.length||bytes.length>50000000)throw Error('invalid_video_bytes');
   const folder=experimentPath.replace('-experiment.json','');
   const mk=await fetcher('https://api.dropboxapi.com/2/files/create_folder_v2',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({path:folder,autorename:false})});if(!mk.ok&&!(await mk.text()).includes('conflict'))throw Error('video_folder_failed');
   const path=folder+'/'+event.id+'-original.mp4';
   const upload=await fetcher('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{...headers,'content-type':'application/octet-stream','dropbox-api-arg':JSON.stringify({path,mode:{'.tag':'add'},autorename:false,strict_conflict:true,mute:true})},body:bytes});
   if(!upload.ok&&upload.status!==409)throw Error('video_upload_failed');
   const readback=await fetcher('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{...headers,'dropbox-api-arg':JSON.stringify({path})}});if(!readback.ok)throw Error('video_readback_failed');
   const checked=Buffer.from(await readback.arrayBuffer());if(hash(checked)!==hash(bytes))throw Error('video_hash_mismatch');
   event.output={path,sha256:hash(bytes),bytes:bytes.length,mimeType:video.mime_type||'video/mp4',verifiedReadback:true};
  }
  event.response=(response.steps||[]).filter(s=>s.type==='model_output').flatMap(s=>(s.content||[]).filter(p=>p.type==='text').map(p=>p.text||'')).join('\n').trim();
  event.responseId=response.id||event.responseId||null;event.modelVersion=response.model||null;event.usage=response.usage||null;event.providerState=response.status;event.providerError=(response.error||response.errors)?JSON.parse(JSON.stringify(response.error||response.errors).replaceAll(env.GEMINI_API_KEY,'[redacted]')):null;event.providerResponseKeys=Object.keys(response);
  event.state=(event.response||event.output)&&response.status==='completed'?'completed':'incomplete';event.completedAt=new Date().toISOString();
  event.estimatedUsageUsd=event.usage?((event.usage.total_input_tokens||0)*(event.type==='video'?1.50:0.75)+(event.usage.total_output_tokens||0)*(event.type==='video'?17.50:3.75))/1e6:null;event.actualChargeUsd=null;
  await save(document,rev);
  const check=await load();const stored=check.doc.events.find(e=>e.id===event.id);if(stored?.requestSha256!==event.requestSha256||stored?.response!==event.response||stored?.output?.sha256!==event.output?.sha256)throw Error('experiment_readback_failed');
  return {state:event.state,actionId:event.id,persisted:true};
 }
 if(prior.doc.authorization.cap!==5)throw Error('budget_identity_changed');
 const recorded=prior.doc.events.find(e=>e.id===action.id);
 if(recorded?.responseId&&['running','incomplete'].includes(recorded.state))return finish(recorded,prior.doc,prior.rev,{id:recorded.responseId,model:recorded.model,status:'in_progress'});
 if(recorded)return {state:'already_recorded',actionId:action.id};
 if(retrieveOnly)return {state:'not_started',actionId:action.id};
 const ownerDirection=await readOwnerNotes(token,fetcher);
 if(ownerDirection.doc.notes.at(-1)?.id&&job.ownerNotesThrough!==ownerDirection.doc.notes.at(-1).id)throw Error('owner_direction_pending_review');
 if(prior.doc.events.some(e=>!['completed','rejected','abandoned_uncertain'].includes(e.state)))throw Error('unresolved_prior_request');
 if(action.requires?.some(id=>!prior.doc.events.some(e=>e.id===id&&e.state==='completed')))throw Error('missing_prerequisite');
 if(!((action.type==='text'&&action.model==='gemini-3.8-flash'&&action.reserveUsd===0.25)||(action.type==='video'&&action.model==='gemini-omni-1.1-flash'&&action.reserveUsd===2)))throw Error('unsupported_experiment_action');
 if(action.type==='video'&&(!job.plan?.chatgptAgreed||!job.plan?.geminiAgreementActionId||!action.requires?.includes(job.plan.geminiAgreementActionId)))throw Error('missing_two_ai_plan');
 if(prior.doc.events.reduce((n,e)=>n+e.reservedUsd,0)+action.reserveUsd>5)throw Error('budget_exceeded');
 const skills=await Promise.all(['gs-character','gs-performance','gs-production'].map(name=>readFile(new URL('skills/'+name+'.v1.md',root),'utf8')));
 const imagePath=new URL('../jokelets/media/GS_Jokelet_Pebble_Straight_Stare_v01.jpg',root),image=await readFile(imagePath);
 const instruction=skills.join('\n\n');
 const privateNotes=(action.architectNoteIds||[]).map(id=>{const n=ownerDirection.doc.notes.find(n=>n.id===id);if(!n)throw Error('missing_architect_direction');return n.text});
 const prompt=job.assignment+'\n\n'+action.prompt+(privateNotes.length?'\n\nARCHITECT DIRECTION (verbatim, private record):\n'+privateNotes.join('\n\n'):'');
 // Conservative bound: <=250k encoded request bytes, <=2048 output tokens,
 // no tools/audio; low thinking within total output cap. $0.25 reservation retained even on failure.
 const body=JSON.stringify(action.type==='video'?{model:action.model,input:[{type:'text',text:instruction+'\n\n'+prompt},{type:'image',mime_type:'image/jpeg',data:image.toString('base64')}],generation_config:{max_output_tokens:65536},response_format:{type:'video',aspect_ratio:'9:16',resolution:'720p',duration:'10s',delivery:'uri'},background:true,store:true,stream:false}:{model:action.model,system_instruction:instruction,input:[{type:'text',text:prompt},{type:'image',mime_type:'image/jpeg',data:image.toString('base64')}],generation_config:{max_output_tokens:2048,thinking_level:'low'},background:true,store:true,stream:false});
 if(Buffer.byteLength(body)>250000)throw Error('input_bound_exceeded');
 if(Date.now()>Date.parse('2027-01-01T00:00:00Z'))throw Error('pricing_verification_expired');
 const models=await fetcher('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',{headers:{'x-goog-api-key':env.GEMINI_API_KEY},signal:AbortSignal.timeout(20000)});
 if(!models.ok)throw Error('model_discovery_failed');
 const available=(await models.json()).models||[];
 if(!available.some(m=>m.name==='models/'+action.model))throw Error('text_model_unavailable');
 const event={id:action.id,type:action.type,model:action.model,state:'pending',at:new Date().toISOString(),reservedUsd:action.reserveUsd,requestSha256:hash(body),prompt,skillSha256:skills.map(hash),referenceSha256:hash(image),capabilities:available.filter(m=>/omni|veo|flash-latest|2.5-flash$|3.8-flash$/.test(m.name)).map(m=>({name:m.name,version:m.version,inputTokenLimit:m.inputTokenLimit,outputTokenLimit:m.outputTokenLimit,supportedGenerationMethods:m.supportedGenerationMethods})),reviewApproval:false};
 const pending={...prior.doc,events:[...prior.doc.events,event]};
 const rev=await save(pending,prior.rev);
 let response;
 try{
  const r=await fetcher('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':env.GEMINI_API_KEY,'content-type':'application/json'},body,signal:AbortSignal.timeout(60000)});
  if(!r.ok){event.providerStatus=r.status;try{const err=await r.json();event.providerErrorCode=err.error?.status||err.error?.code||null;event.providerErrorMessage=String(err.error?.message||'').replaceAll(env.GEMINI_API_KEY,'[redacted]').slice(0,800)}catch{};throw Error('provider_rejected')}
  response=await r.json();
 }catch{
  event.state='uncertain';event.error='provider_request_failed_no_automatic_retry';
  await save(pending,rev);return {state:'uncertain',actionId:action.id};
 }
 return finish(event,pending,rev,response);
}
