// GS Gemini collaboration bridge. Explicit user-initiated turns only.
// The PreviewLock server authenticates requests before calling this handler.
const ROOT='/Grill Sergeant/JokeLab Gemini Conversations';
const allowedOrigins=new Set(['https://keythjyles.github.io','http://localhost:3101','http://127.0.0.1:3199']);
const respond=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'https://keythjyles.github.io'});res.end(JSON.stringify(data));return true};
const validId=id=>/^[a-zA-Z0-9-]{6,100}$/.test(id);
async function readDocument(path,token){
 const r=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{authorization:'Bearer '+token,'dropbox-api-arg':JSON.stringify({path})}});
 if(r.ok){const rev=JSON.parse(r.headers.get('dropbox-api-result')||'{}').rev;if(!rev)throw Error('missing_revision');return {doc:await r.json(),rev}}
 if(r.status===409&&(await r.text()).includes('not_found'))return {doc:null,rev:null};
 throw Error('read_failed');
}
async function saveDocument(path,doc,rev,token){
 const folder=path.slice(0,path.lastIndexOf('/'));
 const auth={authorization:'Bearer '+token};
 const mk=await fetch('https://api.dropboxapi.com/2/files/create_folder_v2',{method:'POST',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({path:folder,autorename:false})});
 if(!mk.ok&&!(await mk.text()).includes('conflict'))throw Error('folder_failed');
 const r=await fetch('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{...auth,'content-type':'application/octet-stream','dropbox-api-arg':JSON.stringify({path,mode:rev?{'.tag':'update',update:rev}:{'.tag':'add'},autorename:false,strict_conflict:true,mute:true})},body:JSON.stringify(doc)});
 if(!r.ok){if(r.status===409)return null;throw Error('save_failed')}
 return (await r.json()).rev;
}
export async function handleGeminiCollaboration(req,res,u,token){
 if(u.pathname!=='/api/gemini-conversation')return false;
 if(req.headers.origin&&!allowedOrigins.has(req.headers.origin))return respond(res,403,{error:'origin_not_allowed'});
 if(!['GET','POST'].includes(req.method))return respond(res,405,{error:'method_not_allowed'});
 const id=u.searchParams.get('id')||'';if(!validId(id))return respond(res,400,{error:'invalid_production_id'});
 const path=ROOT+'/'+id+'.json';
 let existing;try{existing=await readDocument(path,token)}catch{return respond(res,502,{error:'conversation_read_failed'})}
 if(req.method==='GET')return respond(res,200,{conversation:existing.doc,rev:existing.rev,enabled:process.env.GEMINI_ENABLED==='true'});
 if(process.env.GEMINI_ENABLED!=='true')return respond(res,423,{error:'gemini_generation_disabled',message:'Enable only after explicit budget and first-generation approval'});
 if(!process.env.GEMINI_API_KEY||!process.env.GEMINI_MODEL)return respond(res,503,{error:'gemini_not_configured'});
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>12000)return respond(res,413,{error:'request_too_large'})}
 let data;try{data=JSON.parse(raw)}catch{return respond(res,400,{error:'invalid_json'})}
 if(data.rev!==existing.rev||typeof data.message!=='string'||!data.message.trim()||data.message.length>5000||typeof data.requestId!=='string'||!/^[a-zA-Z0-9-]{12,100}$/.test(data.requestId))return respond(res,400,{error:'invalid_or_stale_request'});
 if(existing.doc?.turns?.some(t=>t.requestId===data.requestId))return respond(res,409,{error:'request_already_recorded'});
 const turns=existing.doc?.turns||[];
 if(turns.length>=80)return respond(res,413,{error:'conversation_limit_reached'});
 const now=new Date().toISOString();
 const pending={schema:'GS-GeminiConversation-1',productionId:id,turns:[...turns,{requestId:data.requestId,user:data.message.trim(),state:'pending',at:now}]};
 let rev;try{rev=await saveDocument(path,pending,existing.rev,token)}catch{return respond(res,502,{error:'save_before_generation_failed'})}
 if(!rev)return respond(res,409,{error:'conversation_changed_reload'});
 // Never auto-retry an uncertain provider call: pending turn remains in Dropbox.
 let result;
 try{
 const context='You are Gemini collaborating with ChatGPT and Grill Sergeant JokeLab. Develop one standalone dad-joke single at a time. Keep Grill Sergeant terse and deadpan. Preserve approved footage, sound, and words. Offer editable transparent caption/caplet directions, preferably frame-aware at 25fps. The user can modify or regenerate one word or animation without rebuilding others. Do not claim to render video or invoke HeyGen, ElevenLabs or CapLock. Return useful creative instructions, not claims of completed production.';
 const history=pending.turns.slice(-12).flatMap(t=>[{role:'user',parts:[{text:t.user}]},...(t.assistant?[{role:'model',parts:[{text:t.assistant}]}]:[])]);
 const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(process.env.GEMINI_MODEL)+':generateContent',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'content-type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:context}]},contents:history,generationConfig:{maxOutputTokens:1600}}),signal:AbortSignal.timeout(60000)});
 if(!r.ok)throw Error('provider_'+r.status);
 const response=await r.json();result=(response.candidates||[]).flatMap(c=>(c.content?.parts||[]).map(p=>p.text||'')).join('\n').trim();if(!result)throw Error('empty_response');
 }catch{return respond(res,502,{error:'generation_uncertain',message:'Request is recorded as pending; do not automatically retry',rev})}
 const finished={...pending,turns:[...turns,{requestId:data.requestId,user:data.message.trim(),assistant:result,state:'completed',at:now,completedAt:new Date().toISOString()}]};
 try{const next=await saveDocument(path,finished,rev,token);if(!next)return respond(res,409,{error:'response_save_conflict',message:'Do not regenerate; reconcile pending turn'});return respond(res,200,{conversation:finished,rev:next,persisted:true})}
 catch{return respond(res,502,{error:'response_save_failed',message:'Do not regenerate; provider may have charged'})}
}
