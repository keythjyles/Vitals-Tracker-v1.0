// Field Guide FG-01: one explicitly authorized, non-retrying Gemini image test.
// Existing PreviewLock authentication and Dropbox token are supplied by server.js.
import {createHash} from 'node:crypto';
const JOB='GS-FG01-GEMINI-ONE-USD-20261112';
const LEDGER='/Grill Sergeant/Field Guide/FG01/gemini-one-dollar-test.json';
const IMAGE='/Grill Sergeant/Field Guide/FG01/gemini-one-dollar-result.png';
const MASTER='/Grill Sergeant/Field Guide/FG01/approved-master.png';
const PRESET='FG-01';
const respond=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'https://keythjyles.github.io'});res.end(JSON.stringify(data));return true};
const auth=t=>({authorization:'Bearer '+t});
async function read(path,t){
 const r=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{...auth(t),'dropbox-api-arg':JSON.stringify({path})}});
 if(r.ok)return {body:await r.json(),rev:JSON.parse(r.headers.get('dropbox-api-result')||'{}').rev};
 if(r.status===409&&(await r.text()).includes('not_found'))return null;
 throw Error('ledger_unavailable');
}
async function put(path,bytes,t){
 const folder=path.slice(0,path.lastIndexOf('/'));const mk=await fetch('https://api.dropboxapi.com/2/files/create_folder_v2',{method:'POST',headers:{...auth(t),'content-type':'application/json'},body:JSON.stringify({path:folder,autorename:false})});
 if(!mk.ok&&!(await mk.text()).includes('conflict'))throw Error('folder_error');
 const r=await fetch('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{...auth(t),'content-type':'application/octet-stream','dropbox-api-arg':JSON.stringify({path,mode:{'.tag':'add'},autorename:false,strict_conflict:true,mute:true})},body:bytes});
 if(!r.ok)throw Error('write_or_duplicate_error');return await r.json();
}
export async function handleFieldGuideGemini(req,res,u,token){
 if(u.pathname!=='/api/fieldguide/fg01')return false;
 if(req.method==='GET'){try{return respond(res,200,{job:JOB,preset:PRESET,referencePath:MASTER,ledger:(await read(LEDGER,token))?.body||null})}catch{return respond(res,502,{error:'ledger_unavailable'})}}
 if(req.method!=='POST')return respond(res,405,{error:'method_not_allowed'});
 if(process.env.GEMINI_FG01_ONE_SHOT!=='true')return respond(res,423,{error:'one_shot_disabled'});
 if(!process.env.GEMINI_API_KEY)return respond(res,503,{error:'gemini_not_configured'});
 // Exactly one request is allowed. A pending ledger permanently blocks duplicate submissions.
 let existing;try{existing=await read(LEDGER,token)}catch{return respond(res,502,{error:'ledger_unavailable'})}
 if(existing)return respond(res,409,{error:'already_reserved_no_retry',ledger:existing.body});
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>12000)return respond(res,413,{error:'request_too_large'})}
 let data;try{data=JSON.parse(raw)}catch{return respond(res,400,{error:'invalid_json'})}
 if(data?.job!==JOB||data?.preset!==PRESET||!Array.isArray(data?.cluster)||data.cluster.length!==5||data.cluster.some((v,i)=>typeof v!=='string'||v.length>100||!v.trim())||!Array.isArray(data?.frames)||data.frames.length!==6||data.frames.some(n=>!Number.isInteger(n)||n<0))return respond(res,400,{error:'invalid_cluster_or_cues'});
 // Retrieve the canonical reference from our asset library, not from a per-request upload.
 const ref=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{...auth(token),'dropbox-api-arg':JSON.stringify({path:MASTER})}});
 if(!ref.ok)return respond(res,424,{error:'approved_master_not_registered',assetPath:MASTER,message:'Register approved master once in global assets; no generation or budget reservation performed'});
 const reference=Buffer.from(await ref.arrayBuffer());if(reference.length<5000||reference.length>7500000)return respond(res,424,{error:'approved_master_invalid'});
 const referenceBase64=reference.toString('base64');
  const model='gemini-2.5-flash-image';
 const instruction='Use this exact five-element cluster in order: '+data.cluster.join(' / ')+'. Frame markers: '+data.frames.join(', ')+'. Create ONLY the typography artwork, with a perfectly uniform solid chroma blue (#0000FF) background. The attached approved reference is the visual authority. Five centered independent lines: SUFFERING, while, FIGHTING, over, CLAIMS. SUFFERING FIGHTING CLAIMS must be identical-size bright opaque cream bold condensed uppercase with rich dimensional dark shadow. while and over must be flowing connected gold cursive, tight to the adjacent headlines, each with short symmetric gold rules that NEVER cross letters. Match the reference exactly in visual weight, optical spacing, relative widths and alignment. No human, no apron, no photography, no other text, no decorative extras. Output one premium-quality clean graphic, portrait aspect ratio.';
 const reserved={schema:'GS-FG01-OneShot-1',job:JOB,status:'reserved_uncertain_until_verified',reservedUsd:1,attempts:1,model,preset:PRESET,cluster:data.cluster,frames:data.frames,referenceSha256:createHash('sha256').update(reference).digest('hex'),createdAt:new Date().toISOString(),autoRetry:false};
 try{await put(LEDGER,Buffer.from(JSON.stringify(reserved)),token)}catch{return respond(res,409,{error:'reservation_failed_or_exists'})}
 try{
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'content-type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:instruction},{inline_data:{mime_type:'image/png',data:referenceBase64}}]}],generationConfig:{responseModalities:['IMAGE'],imageConfig:{aspectRatio:'9:16'}}}),signal:AbortSignal.timeout(120000)});
  if(!r.ok)return respond(res,502,{error:'provider_failed_no_retry',providerStatus:r.status,job:JOB});
  const body=await r.json();const part=(body.candidates||[]).flatMap(c=>c.content?.parts||[]).find(p=>p.inlineData?.data||p.inline_data?.data);
  const encoded=part?.inlineData?.data||part?.inline_data?.data;if(!encoded)return respond(res,502,{error:'no_image_returned_no_retry',job:JOB});
  const bytes=Buffer.from(encoded,'base64');if(bytes.length>15000000)return respond(res,502,{error:'output_too_large'});
  const saved=await put(IMAGE,bytes,token);
  return respond(res,200,{status:'image_saved',job:JOB,dropboxPath:IMAGE,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,dropboxId:saved.id,approval:'pending'});
 }catch{return respond(res,502,{error:'request_or_save_uncertain_no_retry',job:JOB})}
}
