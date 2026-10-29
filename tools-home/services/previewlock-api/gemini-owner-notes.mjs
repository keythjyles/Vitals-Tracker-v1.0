// Owner direction is separate from provider job revisions and never generates media.
export const ownerNotesPath='/Grill Sergeant/JokeLab Gemini Conversations/GS-GEMINI-20261029-01-owner-notes.json';
export async function readOwnerNotes(token,fetcher=fetch){
 const r=await fetcher('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{authorization:'Bearer '+token,'dropbox-api-arg':JSON.stringify({path:ownerNotesPath})}});
 if(r.ok){const rev=JSON.parse(r.headers.get('dropbox-api-result')||'{}').rev;if(!rev)throw Error('missing_notes_revision');return {doc:await r.json(),rev}}
 if(r.status===409&&(await r.text()).includes('not_found'))return {doc:{schema:'GS-OwnerDirection-1',runId:'GS-GEMINI-20261029-01',notes:[]},rev:null};
 throw Error('owner_notes_read_failed');
}
export async function handleOwnerNotes(req,res,u,token){
 if(u.pathname!=='/api/gemini-owner-notes')return false;
 const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'https://keythjyles.github.io'});res.end(JSON.stringify(data));return true};
 if(req.headers.origin&&req.headers.origin!=='https://keythjyles.github.io')return send(403,{error:'origin_not_allowed'});
 if(!['GET','POST'].includes(req.method))return send(405,{error:'method_not_allowed'});
 const existing=await readOwnerNotes(token);
 if(req.method==='GET')return send(200,{notes:existing.doc.notes,rev:existing.rev});
 let raw='';for await(const c of req){raw+=c.toString();if(Buffer.byteLength(raw)>16000)return send(413,{error:'request_too_large'})}
 let data;try{data=JSON.parse(raw)}catch{return send(400,{error:'invalid_json'})}
 if(!/^[a-zA-Z0-9-]{12,100}$/.test(data.id||'')||typeof data.text!=='string'||!data.text.trim()||data.text.length>4000)return send(400,{error:'invalid_owner_note'});
 const prior=existing.doc.notes.find(n=>n.id===data.id);
 if(prior)return send(prior.text===data.text.trim()?200:409,{note:prior,persisted:true,duplicate:true});
 if(existing.doc.notes.length>=500)return send(413,{error:'owner_note_limit'});
 const note={id:data.id,author:'Owner',text:data.text.trim(),at:new Date().toISOString(),state:'awaiting_ai_review'};
 const doc={...existing.doc,notes:[...existing.doc.notes,note]};
 const r=await fetch('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/octet-stream','dropbox-api-arg':JSON.stringify({path:ownerNotesPath,mode:existing.rev?{'.tag':'update',update:existing.rev}:{'.tag':'add'},autorename:false,strict_conflict:true,mute:true})},body:JSON.stringify(doc)});
 if(!r.ok)return send(r.status===409?409:502,{error:r.status===409?'notes_changed_retry_same_id':'owner_note_save_failed'});
 const receipt=await r.json();if(!receipt.rev)return send(502,{error:'missing_note_save_receipt'});
 const check=await readOwnerNotes(token);if(!check.doc.notes.some(n=>n.id===note.id&&n.text===note.text))return send(502,{error:'owner_note_readback_failed'});
 return send(200,{note,persisted:true,rev:check.rev});
}
