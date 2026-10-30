import {PROJECT_ROOT,indexedJokes,projectFolders,projectAssets,preferredBed,isVideo} from './project-index.mjs?v=1';
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
const sourceURL=a=>new URL('../jokelets/'+a.src,import.meta.url).href;
export function createProjectPicker({api,onOpenProject,onUseAsset,onLocal,onPause,hasProject=()=>false}){
 const dialog=el('dialog',undefined,'project-picker');dialog.id='projectPicker';dialog.setAttribute('aria-labelledby','projectPickerTitle');
 const heading=el('div',undefined,'picker-header'),title=el('h2','Open project · your jokes');title.id='projectPickerTitle';heading.append(title,button('✕ Close',()=>dialog.close()));
 const tools=el('div',undefined,'picker-tools'),search=el('input');search.type='search';search.placeholder='Search your joke projects';search.setAttribute('aria-label','Search joke projects');
 const grid=button('Grid',()=>view('grid')),list=button('List',()=>view('list')),refresh=button('Refresh',()=>load(true)),home=button('Joke projects',()=>load()),folders=button('Other folders',()=>browse('/Grill Sergeant'));
 tools.append(search,grid,list,refresh,home,folders);
 const path=el('p',PROJECT_ROOT,'picker-path'),status=el('p','','picker-status');status.id='projectPickerStatus';status.setAttribute('role','status');
 const results=el('div',undefined,'picker-list');results.id='projectPickerList';
 const detail=el('div',undefined,'picker-detail');detail.hidden=true;detail.id='projectPickerDetail';
 const footer=el('div',undefined,'picker-footer');footer.append(button('Import into current project',()=>{dialog.close();onLocal();}));
 dialog.append(heading,tools,path,status,results,detail,footer);document.body.append(dialog);
 let mode='grid',epoch=0,projects=new Map(),catalog=null,listing=null,entries=null,current=null,previews=new Map(),previewEpoch=0;
 try{mode=localStorage.getItem('gs_studio_picker_view')||'grid';}catch{}
 const message=(s,error=false)=>{status.textContent=s;status.classList.toggle('error',error);};
 const stop=()=>{for(const m of dialog.querySelectorAll('video,audio'))m.pause();};
 const observer=new IntersectionObserver(items=>{for(const item of items)if(item.isIntersecting){observer.unobserve(item.target);item.target._connect?.();}},{root:dialog,rootMargin:'150px'});
 function clear(){stop();observer.disconnect();++previewEpoch;results.replaceChildren();detail.replaceChildren();detail.hidden=true;}
 function view(value){mode=value;results.classList.toggle('list',value==='list');detail.querySelectorAll('.picker-list').forEach(e=>e.classList.toggle('list',value==='list'));grid.setAttribute('aria-pressed',String(value==='grid'));list.setAttribute('aria-pressed',String(value==='list'));try{localStorage.setItem('gs_studio_picker_view',value);}catch{}}
 function media(a){
  const type=/\.(mp3|wav|m4a|ogg|aac)$/i.test(a.name||'')?'audio':isVideo(a)?'video':/\.(png|jpe?g|webp)$/i.test(a.name||'')?'img':null;
  if(!type)return el('div',a.role||'Asset','picker-missing');const m=el(type);m.setAttribute('aria-label','Preview '+(a.name||''));if(type!=='img'){m.controls=true;m.preload='metadata';m.playsInline=true;m.muted=type==='video';m.addEventListener('play',()=>{for(const other of dialog.querySelectorAll('video,audio'))if(other!==m)other.pause();});}
  const token=previewEpoch;m._connect=async()=>{try{let url;if(a.src){url=sourceURL(a);if(a.poster&&type==='video')m.poster=sourceURL({src:a.poster});}else{if(!previews.has(a.path))previews.set(a.path,api('/api/playback?path='+encodeURIComponent(a.path)).then(d=>d.url).catch(e=>{previews.delete(a.path);throw e;}));url=await previews.get(a.path);}if(token===previewEpoch&&m.isConnected)m.src=url;}catch{m.replaceWith(el('div','Preview unavailable · refresh to retry','picker-missing'));}};observer.observe(m);return m;
 }
 function card(p){
  const row=el('article',undefined,'picker-card');row.dataset.projectId=p.id;const bed=preferredBed(p)||p.assets?.find(isVideo);if(bed)row.append(media(bed));else row.append(el('div','Text project','picker-missing'));
  const name=el('h3',p.title||p.id),note=el('p',p.saved?'Saved project':p.catalog?'Existing joke · sources preserved':'Loading project…');row.append(name,note);
  const actions=el('div',undefined,'picker-actions');actions.append(button('Assets',()=>showProject(p.id)),button('Open project',()=>openProject(p)));row.append(actions);return row;
 }
 function render(){
  clear();const q=search.value.toLowerCase().trim();for(const p of projects.values())if((p.title+' '+p.id).toLowerCase().includes(q))results.append(card(p));view(mode);
 }
 async function seeds(){
  if(catalog)return catalog;const read=async(relative)=>{const r=await fetch(new URL(relative,import.meta.url));if(!r.ok)throw Error('Joke catalog unavailable');return r.json();};
  const [ledger,jokes]=await Promise.all([read('../jokelab/PRODUCTION_LEDGER.json'),read('../jokelets/catalog.json')]);catalog=indexedJokes(ledger,jokes);return catalog;
 }
 async function load(force=false){
  const token=++epoch;current=null;path.textContent=PROJECT_ROOT;search.placeholder='Search your joke projects';message('Loading your joke projects…');
  if(force){listing=null;previews.clear();}
  // The picker is already visible; cloud/auth failures stay inside it.
  const [seedResult,cloudResult]=await Promise.allSettled([seeds(),listing&&!force?listing:listing=api('/api/joke-projects')]);if(token!==epoch)return;
  projects=new Map((seedResult.status==='fulfilled'?seedResult.value:[]).map(p=>[p.id,p]));
  if(cloudResult.status==='fulfilled'){
   let folders=cloudResult.value.projects||[];
   if(cloudResult.value.has_more){try{const all=await api('/api/assets');if(all.has_more)throw Error('Incomplete cloud folder listing');folders=projectFolders(all.entries);}catch(e){message('Folder list incomplete: '+e.message,true);}}
   for(const f of folders){const prior=projects.get(f.id)||{id:f.id,title:f.id,assets:[]};projects.set(f.id,{...prior,path:f.path||PROJECT_ROOT+'/'+f.id,saved:true});}
  }else{listing=null;message('Saved project connection unavailable: '+cloudResult.reason.message+' Your catalog previews remain available.',true);}
  render();if(cloudResult.status==='fulfilled'&&!status.classList.contains('error'))message(projects.size+' joke projects · choose Open project to load the bed and saved work.');
  // Read at most three manifests at once; render incrementally without blocking the picker.
  const pending=[...projects.values()].filter(p=>p.saved);let index=0;
  await Promise.all(Array.from({length:Math.min(3,pending.length)},async()=>{while(index<pending.length){const p=pending[index++];try{const d=await api('/api/joke-project?id='+encodeURIComponent(p.id));if(token!==epoch)return;if(d.project){projects.set(p.id,{...p,...d.project,saved:true});const old=results.querySelector('[data-project-id="'+p.id+'"]');if(old)old.replaceWith(card(projects.get(p.id)));}}catch(e){if(token===epoch)message('Some saved projects could not load: '+e.message,true);}}}));
 }
 async function openProject(p,bed=null){
  stop();message('Opening '+(p.title||p.id)+' · restoring project and assets…');try{await onOpenProject(p,bed,s=>message(s));dialog.close();}catch(e){message('Project not opened: '+e.message,true);}
 }
 async function showProject(id){
  stop();const p=projects.get(id);if(!p)return;current=id;detail.replaceChildren();detail.hidden=false;
  detail.append(el('h2',p.title||p.id),el('p',p.path,'picker-path'));
  if(p.text){const text=el('details'),summary=el('summary','Saved joke text');text.append(summary,el('p',p.text,'picker-text'));detail.append(text);}
  const assets=el('div',undefined,'picker-list');assets.classList.toggle('list',mode==='list');const list=projectAssets(p);for(const a of list.length?list:p.assets||[]){const row=el('article',undefined,'picker-card');row.append(media(a),el('h3',a.name||a.id),el('p',a.role||'Asset'));row.append(button('Save asset',async()=>{try{const url=a.src?sourceURL(a):(await api('/api/playback?path='+encodeURIComponent(a.path))).url;const response=await fetch(url);if(!response.ok)throw Error('Source download failed');const blob=await response.blob(),href=URL.createObjectURL(blob),link=el('a');link.href=href;link.download=a.name||'asset';link.click();setTimeout(()=>URL.revokeObjectURL(href),30000);message('Save requested for '+a.name+'. Original stays in the project.');}catch(e){message(e.message,true);}}));if(a.role==='bed')row.append(button('Use this bed',()=>openProject(p,a)));else if(!a.parent&&onUseAsset)row.append(button('Add this item',async()=>{try{message('Loading '+a.name+'…');await onUseAsset(p,a);dialog.close();}catch(e){message(e.message,true);}}));assets.append(row);}detail.append(assets);detail.scrollIntoView({block:'nearest'});
 }
 async function browse(folder){
  const token=++epoch;current=folder;clear();path.textContent=folder;message('Loading folders…');try{
   if(!entries){const d=await api('/api/assets');if(d.has_more)throw Error('Cloud folder list is incomplete; refresh before selecting.');entries=d.entries||[];}
   if(token!==epoch)return;const children=new Map(),files=[];for(const e of entries){const p=e.path_display||'';if(!p.startsWith(folder+'/'))continue;const rest=p.slice(folder.length+1),parts=rest.split('/');if(parts.length>1)children.set(parts[0],folder+'/'+parts[0]);else if(e['.tag']==='folder')children.set(parts[0],p);else if(isVideo(e)||/\.(mp3|wav|m4a|png|webp)$/i.test(e.name||''))files.push(e);}
   const up=folder.slice(0,folder.lastIndexOf('/'));if(up.startsWith('/Grill Sergeant'))results.append(button('↤ Parent folder',()=>browse(up)));
   for(const [name,p] of children)results.append(button('▣ '+name,()=>{const canonical=p.startsWith(PROJECT_ROOT+'/')?p.slice(PROJECT_ROOT.length+1):'';if(projects.has(canonical))showProject(canonical);else browse(p);}));
   for(const f of files){const a={kind:'previewlock',name:f.name,path:f.path_display},row=el('article',undefined,'picker-card');row.append(media(a),el('h3',f.name));row.append(button('Use video',async()=>{try{await onUseAsset(null,a);dialog.close();}catch(e){message(e.message,true);}}));results.append(row);}view(mode);message(children.size+' folders · '+files.length+' media files');
  }catch(e){message('Folders unavailable: '+e.message,true);}
 }
 search.oninput=()=>{if(current?.startsWith('/')){const q=search.value.toLowerCase();for(const row of results.children)row.hidden=!row.textContent.toLowerCase().includes(q);}else render();};
 dialog.addEventListener('close',()=>{stop();observer.disconnect();++epoch;});
 return {open:async(id)=>{onPause?.();footer.hidden=!hasProject();folders.disabled=!hasProject();if(!dialog.open)dialog.showModal();status.classList.remove('error');await load();if(id&&dialog.open)showProject(id);},close:()=>dialog.close(),showCurrent:()=>current};
}
