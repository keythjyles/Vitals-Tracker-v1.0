// Metadata-only production decisions. No media mutation or generation path.
const ROOT='/Grill Sergeant/JokeLab Productions';
export async function handleJokeLab(req,res,u,token){
 if(u.pathname!=='/api/jokelab-production')return false;
 const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'});res.end(JSON.stringify(data));return true};
 const origin=req.headers.origin;
 if(origin&&!['https://keythjyles.github.io','http://localhost:3101','http://127.0.0.1:3199'].includes(origin))return send(403,{error:'origin_not_allowed'});
 if(!['GET','POST'].includes(req.method))return send(405,{error:'method_not_allowed'});
 const id=u.searchParams.get('id')||'';if(!/^[a-zA-Z0-9-]{6,100}$/.test(id))return send(400,{error:'invalid_production_id'});
 const path=ROOT+'/'+id+'.json';const auth={authorization:'Bearer '+token};
 const read=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{...auth,'dropbox-api-arg':JSON.stringify({path})}});
 let prior=null,rev=null;
 if(read.ok){prior=await read.json();rev=JSON.parse(read.headers.get('dropbox-api-result')||'{}').rev;if(!rev)return send(502,{error:'missing_revision'})}
 else if(read.status!==409||!(await read.text()).includes('not_found'))return send(502,{error:'production_read_failed'});
 if(req.method==='GET')return send(200,{production:prior,rev});
 let raw='';for await(const chunk of req){raw+=chunk.toString();if(Buffer.byteLength(raw)>12000)return send(413,{error:'request_too_large'})}
 let data;try{data=JSON.parse(raw)}catch{return send(400,{error:'invalid_json'})}
 if((data.rev??null)!==rev)return send(409,{error:'production_changed_reload'});
 const p=data.production;
 if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>200||/[\x00-\x1f]/.test(p.name)||!['REVIEW','APPROVED','HOLD','REMOVED'].includes(p.decision)||!Number.isFinite(p.playhead)||p.playhead<0||p.playhead>86400)return send(400,{error:'invalid_production'});
 const event={name:p.name.trim(),decision:p.decision,playhead:p.playhead,at:new Date().toISOString()};
 const production={schema:'GS-ProductionDecision-1',id,...event,history:[...(prior?.history||[]),event].slice(-500)};
 const mk=await fetch('https://api.dropboxapi.com/2/files/create_folder_v2',{method:'POST',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({path:ROOT,autorename:false})});
 if(!mk.ok&&!(await mk.text()).includes('conflict'))return send(502,{error:'production_folder_failed'});
 const saved=await fetch('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{...auth,'content-type':'application/octet-stream','dropbox-api-arg':JSON.stringify({path,mode:rev?{'.tag':'update',update:rev}:{'.tag':'add'},autorename:false,strict_conflict:true,mute:true})},body:JSON.stringify(production)});
 if(!saved.ok)return send(saved.status===409?409:502,{error:'production_save_failed'});
 const receipt=await saved.json();if(!receipt.rev)return send(502,{error:'missing_save_receipt'});
 return send(200,{production,rev:receipt.rev,persisted:true,destination:'dropbox'});
}
