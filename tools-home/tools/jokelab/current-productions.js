import {productionItems,assetURL,visibleItems} from './production-model.mjs';
const $=id=>document.getElementById(id),API='https://gs-previewlock-api.onrender.com',CACHE='gs-jokelab-productions-v1';
const rows=$('gs-current-rows'),status=$('gs-current-status');
let items=[],overrides={},revisions=new Map(),ready=new Set(),pending=new Set(),saveQueue=Promise.resolve(),localProject=null,urls=[],edits=new Map();
try{const cached=JSON.parse(localStorage.getItem(CACHE)||'{}');overrides=cached.overrides||cached;pending=new Set(cached.pending||[])}catch{}
const key=()=>localStorage.getItem('gs_previewlock_key')||'';
async function api(path,options={}){if(!key())throw Error('Cloud connection unavailable on this browser');const r=await fetch(API+path,{...options,headers:{authorization:'Bearer '+key(),...options.headers}});const data=await r.json();if(!r.ok)throw Error(data.error||'Cloud service unavailable');return data}
function remember(){try{localStorage.setItem(CACHE,JSON.stringify({overrides,pending:[...pending]}))}catch{status.textContent='Browser recovery unavailable; cloud save still required.'}}
async function loadOverride(id){const data=await api('/api/jokelab-production?id='+encodeURIComponent(id));revisions.set(id,data.rev);ready.add(id);if(data.production&&!pending.has(id))overrides[id]=data.production;return data}
async function save(item,patch,message){const id=item.id;const editNumber=(edits.get(id)||0)+1;edits.set(id,editNumber);overrides[id]={name:item.name,decision:'REVIEW',playhead:0,...overrides[id],...patch};pending.add(id);remember();message.textContent='Saving…';
 const intended={...overrides[id]};
 saveQueue=saveQueue.catch(()=>{}).then(async()=>{
  try{if(!ready.has(id)){const remote=await loadOverride(id);if(remote.production){ready.delete(id);throw Error('Cloud record found; refresh before changing it')}}
   const data=await api('/api/jokelab-production?id='+encodeURIComponent(id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rev:revisions.get(id),production:intended})});
   revisions.set(id,data.rev);if(edits.get(id)===editNumber){overrides[id]=data.production;pending.delete(id)}remember();message.textContent=data.production.decision+' · Saved to Dropbox';
  }catch(e){if(e.message==='production_changed_reload'){ready.delete(id);revisions.delete(id)}message.textContent='Not cloud-saved · '+e.message;message.classList.add('production-error')}
 });await saveQueue;
}
async function localSx(){
 let state;try{state=JSON.parse(localStorage.getItem('sxlock-project-v1')||'null')}catch{}
 // Read an existing database only: no empty database, upgrades, or project writes.
 if(!indexedDB.databases)return null;const existing=await indexedDB.databases();if(!existing.some(x=>x.name==='SxLock-media'))return null;
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('SxLock-media');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 try{const read=(store,id)=>new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  const saved=(await read('projects','current'))?.state;if(saved&&(!state||(saved.savedAt||0)>(state.savedAt||0)))state=saved;
  if(!state?.videoRef||!state.video)return null;const media=await read('videos',state.videoRef);if(!media?.blob)return null;
  localProject=state;const src=URL.createObjectURL(media.blob);urls.push(src);
  return {id:'sxlock-'+state.videoRef.replace(/[^a-zA-Z0-9-]/g,'-').slice(0,80),name:state.filename||state.video,state:'SxLock · saved edit on this browser',assets:[{url:src}],priority:-1,localSx:true};
 }finally{db.close()}
}
async function resumeSx(item,message){
 // Reuse SxLock's tested project importer, including its stored-media verification.
 const child=window.open('../sxlock/index.html','_blank');if(!child){message.textContent='Allow the editor tab to open';return}
 message.textContent='Opening saved edit…';let timer;
 try{await new Promise((resolve,reject)=>{const end=Date.now()+30000;timer=setInterval(()=>{try{if(child.closed)throw Error('Editor closed');if(child.SxLock?.ready){clearInterval(timer);resolve()}else if(Date.now()>end)throw Error('Editor load timed out')}catch(e){clearInterval(timer);reject(e)}},100)});
  await child.SxLock.ready;const transfer=new child.DataTransfer();transfer.items.add(new child.File([JSON.stringify(localProject)],'JokeLab-resume.json',{type:'application/json'}));const input=child.document.getElementById('loadProject');input.files=transfer.files;input.dispatchEvent(new child.Event('change',{bubbles:true}));
  const back=child.document.createElement('button');back.textContent='← JokeLab';back.style.cssText='position:fixed;right:8px;bottom:8px;z-index:9999;padding:10px;background:#17251e;color:white;border:1px solid #89b99b;border-radius:6px';back.onclick=()=>{window.focus();child.close()};child.document.body.append(back);message.textContent='Saved project sent to SxLock · check recovery status there';
 }catch(e){message.textContent=e.message}finally{clearInterval(timer)}
}
function render(){
 const query=$('gs-production-search').value,view=$('gs-production-filter').value;
 rows.querySelectorAll('video,audio').forEach(v=>v.pause());rows.replaceChildren();const visible=visibleItems(items,overrides,view,query);
 for(const item of visible){const edit=overrides[item.id]||{};const row=document.createElement('article');row.className='production-row';row.dataset.id=item.id;row.dataset.decision=edit.decision||'REVIEW';
 const preview=document.createElement('div'),info=document.createElement('div'),actions=document.createElement('div');info.className='production-info';actions.className='production-actions';
 const name=document.createElement('input');name.className='production-name';name.value=edit.name||item.name;name.maxLength=200;name.setAttribute('aria-label','Rename '+item.name);
 const message=document.createElement('p');message.className='production-message';message.setAttribute('role','status');message.textContent=pending.has(item.id)?'Not cloud-saved':edit.decision||item.state;
 name.addEventListener('change',()=>{const value=name.value.trim();if(value)save(item,{name:value},message);else name.value=edit.name||item.name});name.addEventListener('keydown',e=>{if(e.key==='Enter')name.blur()});info.append(name,message);
 const asset=item.assets?.find(a=>a.url||a.dropboxPath||/\.(mp4|webm|mp3|wav)(?:$|\?)/i.test(a.src||''));
 let media;
 if(asset){const audio=/\.(mp3|wav)(?:$|\?)/i.test(asset.src||asset.dropboxPath||'');media=document.createElement(audio?'audio':'video');media.controls=true;media.preload='none';media.setAttribute('aria-label','Preview '+item.name);if(!audio)media.playsInline=true;
  const src=asset.url||assetURL(asset,new URL('../jokelets/',location.href));if(src)media.src=src;
  const play=document.createElement('button');play.textContent='▶ Play';play.className='production-play';play.setAttribute('aria-label','Play '+item.name);
  play.onclick=async()=>{play.disabled=true;try{document.querySelectorAll('#gs-current-rows video,#gs-current-rows audio').forEach(v=>{if(v!==media)v.pause()});if(asset.dropboxPath){const d=await api('/api/playback?path='+encodeURIComponent(asset.dropboxPath));media.src=d.url}await media.play()}catch(e){message.textContent='Playback: '+e.message}finally{play.disabled=false}};
  media.addEventListener('loadedmetadata',()=>{if(Number.isFinite(media.duration))media.currentTime=Math.min(Number(overrides[item.id]?.playhead)||0,media.duration)});
  media.addEventListener('pause',()=>{if(media.currentTime>0&&Math.abs(media.currentTime-(overrides[item.id]?.playhead||0))>.1)save(item,{playhead:media.currentTime},message)});
  media.addEventListener('error',()=>{message.textContent='Preview unavailable · source retained'});
  if(audio){preview.append(play);info.append(media)}else preview.append(media,play);
 }else preview.textContent='Source pending';
 const button=(text,fn)=>{const b=document.createElement('button');b.textContent=text;b.onclick=fn;actions.append(b);return b};
 for(const [label,decision]of edit.decision==='REMOVED'?[['Restore','REVIEW']]:[['Approve','APPROVED'],['Hold','HOLD'],['Remove','REMOVED']])button(label,async()=>{actions.querySelectorAll('button').forEach(b=>b.disabled=true);await save(item,{decision},message);row.dataset.decision=decision;actions.querySelectorAll('button').forEach(b=>b.disabled=false);if(!pending.has(item.id)&&['HOLD','REMOVED'].includes(decision))row.remove()});
 if(item.localSx)button('Resume',()=>resumeSx(item,message));
 if(item.workspace?.caplock){const a=document.createElement('a');a.textContent='CapLock';a.href=item.workspace.caplock;a.target='_blank';actions.append(a)}
 if(item.previewName){const a=document.createElement('a');a.textContent='PreviewLock';a.href='../previewlock/cloud-test.html?v=R27.1&open='+encodeURIComponent(item.previewName);a.target='_blank';actions.append(a)}
 if(pending.has(item.id))button('Retry save',()=>save(item,{},message));
 row.append(preview,info,actions);rows.append(row);
 }
 status.textContent=visible.length+' productions · '+(key()?'Existing cloud connection':'Cloud unavailable on this browser; changes need cloud save');
}
async function load(){status.textContent='Loading saved productions…';try{const response=await fetch('PRODUCTION_LEDGER.json',{cache:'no-store'});if(!response.ok)throw Error('Ledger unavailable');items=productionItems(await response.json());const local=await localSx().catch(()=>null);if(local)items.unshift(local);render();
 if(key()){for(let i=0;i<items.length;i+=4){await Promise.allSettled(items.slice(i,i+4).map(item=>loadOverride(item.id)));}remember();render()}
 }catch(e){status.textContent='Production list unavailable · '+e.message+' · originals retained'}}
$('gs-production-search').oninput=render;$('gs-production-filter').onchange=render;$('gs-production-refresh').onclick=()=>{ready.clear();load()};
window.addEventListener('pagehide',()=>{urls.forEach(URL.revokeObjectURL)});load();
