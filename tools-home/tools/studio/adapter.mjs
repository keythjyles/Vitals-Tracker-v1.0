// Same-origin studio RPC. No credentials or temporary playback URLs cross this boundary.
export const inStudio=()=>window.parent!==window&&new URLSearchParams(location.search).get('studio')==='1';
export function installAdapter(module,handlers){
 if(!inStudio())return;
 document.documentElement.classList.add('gs-studio-module');
 const css=document.createElement('style');css.textContent='.gs-studio-module .caplock-launch-nav,.gs-studio-module .audio-tool-nav,.gs-studio-module nav[aria-label="Production tools"],.gs-studio-module nav[aria-label="Caption production tools"],.gs-studio-module [aria-label="Production tools"],.gs-studio-module [aria-label="Caption production tools"],.gs-studio-module [aria-label="Audio tools"],.gs-studio-module #jokeProjectPanel,.gs-studio-module .links{display:none!important}';document.head.append(css);
 let working=false,context=null;
 window.addEventListener('message',async event=>{
  const d=event.data;if(event.origin!==location.origin||event.source!==window.parent||d?.protocol!=='GS-Studio-1'||d.module!==module||typeof d.id!=='string'||d.id.length>100)return;
  const reply=(result,error)=>event.source.postMessage({protocol:'GS-Studio-1',module,id:d.id,result,error},event.origin);
  if(d.action==='ping'){reply({ready:true});return;}
  if(working){reply(null,'Module is still opening or saving.');return;}
  if(!['open','checkpoint','pause'].includes(d.action)){reply(null,'Unknown studio action.');return;}
  working=true;
  try{
   if(d.action==='open'){if(!d.payload?.project?.id)throw Error('Choose a joke first.');context=d.payload;await handlers.open(context);reply({opened:true,projectId:context.project.id});}
   else {if(!context)throw Error('Module has no joke project.');if(handlers.busy?.())throw Error('Finish the current recording, render or save first.');await handlers.pause?.();reply(d.action==='checkpoint'?await handlers.checkpoint(context):{paused:true});}
  }catch(e){reply(null,e.message||String(e));}finally{working=false;}
 });
 // No implicit autoplay on selection, restore or phase return.
 document.addEventListener('visibilitychange',()=>{if(document.hidden)handlers.pause?.();});
}
export async function api(path,options={}){
 const key=localStorage.getItem('gs_previewlock_key');if(!key)throw Error('This browser has no saved studio connection. Open the app in your connected browser; your selection stays here.');
 const r=await fetch('https://gs-previewlock-api.onrender.com'+path,{...options,headers:{Authorization:'Bearer '+key,...options.headers},signal:AbortSignal.timeout(65000)});const d=await r.json();if(!r.ok)throw Error(d.error||'Project request failed ('+r.status+').');return d;
}
export async function assetBlob(asset){const d=await api('/api/playback?path='+encodeURIComponent(asset.path)),r=await fetch(d.url);if(!r.ok)throw Error('Source unavailable: '+asset.name);const b=await r.blob();if(asset.size&&b.size!==asset.size)throw Error('Source size changed: '+asset.name);if(asset.sha256){const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==asset.sha256)throw Error('Source hash changed: '+asset.name);}return b;}
export async function storeAsset(projectId,blob,name,role){const d=await api('/api/joke-project/asset?id='+encodeURIComponent(projectId)+'&role='+role+'&name='+encodeURIComponent(name),{method:'POST',headers:{'content-type':'application/octet-stream'},body:blob});if(!d.asset||!d.project)throw Error('Asset save was not acknowledged.');return d;}
