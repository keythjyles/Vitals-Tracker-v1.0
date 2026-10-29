// One explicitly selected, repository-versioned experiment. No public trigger.
// Credentials stay in the existing service; Dropbox CAS prevents restart spending.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const RUN='GS-GEMINI-20261029-01';
const root=new URL('../../tools/jokelab/',import.meta.url);
export const experimentPath='/Grill Sergeant/JokeLab Gemini Conversations/'+RUN+'-experiment.json';
const hash=value=>createHash('sha256').update(value).digest('hex');
export async function runExperiment(token,{env=process.env,fetcher=fetch}={}){
 if(env.GEMINI_EXPERIMENT_RUN_ID!==RUN)return {state:'disabled'};
 if(!env.GEMINI_API_KEY)throw Error('experiment_not_configured');
 const job=JSON.parse(await readFile(new URL('runs/'+RUN+'.job.json',root),'utf8'));
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
 if(job.reconcile){
  const old=prior.doc.events.find(e=>e.id===job.reconcile.id);
  if(old?.state==='uncertain'&&old.providerStatus===404&&old.requestSha256===job.reconcile.requestSha256){
   old.state='rejected';old.resolution={at:new Date().toISOString(),reason:job.reconcile.reason,reservationRetained:true};
   prior.rev=await save(prior.doc,prior.rev);
  }
 }
 if(prior.doc.authorization.cap!==5)throw Error('budget_identity_changed');
 if(prior.doc.events.some(e=>e.id===action.id))return {state:'already_recorded',actionId:action.id};
 if(prior.doc.events.some(e=>!['completed','rejected'].includes(e.state)))throw Error('unresolved_prior_request');
 if(action.requires?.some(id=>!prior.doc.events.some(e=>e.id===id&&e.state==='completed')))throw Error('missing_prerequisite');
 if(action.type!=='text'||action.model!=='gemini-3.8-flash'||action.reserveUsd!==0.25)throw Error('unsupported_experiment_action');
 if(prior.doc.events.reduce((n,e)=>n+e.reservedUsd,0)+action.reserveUsd>5)throw Error('budget_exceeded');
 const skills=await Promise.all(['gs-character','gs-performance','gs-production'].map(name=>readFile(new URL('skills/'+name+'.v1.md',root),'utf8')));
 const imagePath=new URL('../jokelets/media/GS_Jokelet_Pebble_Straight_Stare_v01.jpg',root),image=await readFile(imagePath);
 const instruction=skills.join('\n\n');
 const prompt=job.assignment+'\n\n'+action.prompt;
 // Conservative bound: <=250k encoded request bytes, <=2048 output tokens,
 // no tools/audio; minimal thinking within total output cap. $0.25 reservation retained even on failure.
 const body=JSON.stringify({model:action.model,system_instruction:instruction,input:[{type:'text',text:prompt},{type:'image',mime_type:'image/jpeg',data:image.toString('base64')}],generation_config:{max_output_tokens:2048,thinking_level:'minimal'},background:false,store:false,stream:false});
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
 event.response=(response.steps||[]).filter(s=>s.type==='model_output').flatMap(s=>(s.content||[]).filter(p=>p.type==='text').map(p=>p.text||'')).join('\n').trim();
 event.responseId=response.id||null;event.modelVersion=response.model||null;event.usage=response.usage||null;
 event.providerState=response.status;
 event.state=event.response&&response.status==='completed'?'completed':'incomplete';event.completedAt=new Date().toISOString();
 event.estimatedUsageUsd=event.usage?((event.usage.total_input_tokens||0)*0.75+(event.usage.total_output_tokens||0)*3.75)/1e6:null;
 event.actualChargeUsd=null; // Usage estimate is not an itemized bill, including free-tier usage.
 await save(pending,rev);
 const check=await load();if(check.doc.events.at(-1)?.requestSha256!==event.requestSha256||check.doc.events.at(-1)?.response!==event.response)throw Error('experiment_readback_failed');
 return {state:event.state,actionId:action.id,persisted:true};
}
