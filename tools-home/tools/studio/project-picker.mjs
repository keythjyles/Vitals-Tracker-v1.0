import {moduleReady,stageAccepts,stageAsset,stageRecord,stageLabel,STAGES} from '../../shared/production-stages.mjs?v=1';
import {captionCutLabel} from '../../shared/cut-passes.mjs?v=4';
import {PROJECT_ROOT,indexedJokes,projectFolders,projectAssets,preferredBed,isVideo} from './project-index.mjs?v=5-studio';
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
const sourceURL=a=>new URL('../jokelets/'+a.src,import.meta.url).href;
export function createProjectPicker({api,onOpenProject,onUseAsset,onLocal,onPause,hasProject=()=>false,extraProjects=null,extraMedia=null,module=null}){
 const dialog=el('dialog',undefined,'project-picker');dialog.id='projectPicker';dialog.setAttribute('aria-labelledby','projectPickerTitle');
 const heading=el('div',undefined,'picker-header'),title=el('h2','Open project · your jokes');title.id='projectPickerTitle';heading.append(title,button('✕ Close',()=>dialog.close()));
 const tools=el('div',undefined,'picker-tools'),search=el('input');search.type='search';search.placeholder='Search your joke projects';search.setAttribute('aria-label','Search joke projects');
 const grid=button('Grid',()=>view('grid')),list=button('List',()=>view('list')),refresh=button('Refresh',()=>load(true)),home=button('Joke projects',()=>{sourceFilter=null;return load();}),folders=button('Other folders',()=>browse('/Grill Sergeant'));
 const allLabel=el('label',undefined,'picker-show-all'),all=el('input');all.type='checkbox';all.id='productionShowAll';allLabel.append(all,document.createTextNode('Show all files'));allLabel.hidden=!module;all.onchange=()=>{if(current&&projects.has(current))showProject(current);else render();};tools.append(search,grid,list,refresh,home,folders,allLabel);
 const path=el('p',PROJECT_ROOT,'picker-path'),status=el('p','','picker-status');status.id='projectPickerStatus';status.setAttribute('role','status');
 const results=el('div',undefined,'picker-list');results.id='projectPickerList';
 const detail=el('div',undefined,'picker-detail');detail.hidden=true;detail.id='projectPickerDetail';
 const footer=el('div',undefined,'picker-footer');footer.append(button('Import into current project',()=>{dialog.close();onLocal();}));
 dialog.append(heading,tools,path,status,results,detail,footer);document.body.append(dialog);
 let mode='grid',epoch=0,projects=new Map(),catalog=null,listing=null,entries=null,current=null,previews=new Map(),previewEpoch=0;
 let sourceFilter=null,openingProject=false;const localURLs=new Set();
 try{mode=localStorage.getItem('gs_studio_picker_view')||'grid';}catch{}
 const message=(s,error=false)=>{status.textContent=s;status.classList.toggle('error',error);};
 const stop=()=>{for(const m of dialog.querySelectorAll('video,audio'))m.pause();};
 const observer=new IntersectionObserver(items=>{for(const item of items)if(item.isIntersecting){observer.unobserve(item.target);item.target._connect?.();}},{root:dialog,rootMargin:'150px'});
 function clear(){stop();observer.disconnect();++previewEpoch;for(const url of localURLs)URL.revokeObjectURL(url);localURLs.clear();results.replaceChildren();detail.replaceChildren();detail.hidden=true;}
 function view(value){mode=value;results.classList.toggle('list',value==='list');detail.querySelectorAll('.picker-list').forEach(e=>e.classList.toggle('list',value==='list'));grid.setAttribute('aria-pressed',String(value==='grid'));list.setAttribute('aria-pressed',String(value==='list'));try{localStorage.setItem('gs_studio_picker_view',value);}catch{}}
 function media(a){
  const type=/\.(mp3|wav|m4a|ogg|aac)$/i.test(a.name||'')?'audio':isVideo(a)?'video':/\.(png|jpe?g|webp)$/i.test(a.name||'')?'img':null;
  if(!type)return el('div',a.role||'Asset','picker-missing');const m=el(type);m.setAttribute('aria-label','Preview '+(a.name||''));if(type!=='img'){m.controls=true;m.preload='metadata';m.playsInline=true;m.muted=type==='video';m.addEventListener('play',()=>{for(const other of dialog.querySelectorAll('video,audio'))if(other!==m)other.pause();});}
  const token=previewEpoch;m._connect=async()=>{try{let url;if(a.cutPreviewId&&extraMedia){const blob=await extraMedia(a.cutPreviewId);if(!blob)throw Error('Cut preview unavailable');url=URL.createObjectURL(blob);if(token!==previewEpoch||!m.isConnected){URL.revokeObjectURL(url);return;}localURLs.add(url);}else if(a.src){url=sourceURL(a);if(a.poster&&type==='video')m.poster=sourceURL({src:a.poster});}else{if(!previews.has(a.path))previews.set(a.path,api('/api/playback?path='+encodeURIComponent(a.path)).then(d=>d.url).catch(e=>{previews.delete(a.path);throw e;}));url=await previews.get(a.path);}if(token===previewEpoch&&m.isConnected)m.src=url;}catch{m.replaceWith(el('div','Preview unavailable · refresh to retry','picker-missing'));}};observer.observe(m);return m;
 }
 function card(p){
  const row=el('article',undefined,'picker-card');row.dataset.projectId=p.id;if(p.stagedCut||p.cutOrigin)row.classList.add('jokelet-card');const bed=(module==='sound'?stageAsset(p,'captioned'):null)||preferredBed(p)||p.assets?.find(isVideo);if(bed)row.append(media(bed));else row.append(el('div','Text project','picker-missing'));
  const name=el('h3',p.title||p.id);let description=p.saved?'Saved project':p.catalog?'Existing joke · sources preserved':'Loading project…';
  if(!p.stagedCut&&p.cutOrigin&&p.cutOrigin.state!=='ready')description='Video save incomplete · reopen this cut from Clipper.';
  if(p.stagedCut){const c=p.cutOriginLocal.cut;description=p.cutState==='preparing'?'Preparing'+(p.progress==null?'…':' · '+p.progress+'%'):p.cutState==='error'?'Preparation failed: '+p.error:'Jokelet · F'+c.inFrame+'–'+c.outFrame;}
  if(module&&!p.stagedCut){const staged=module==='sound'?stageAsset(p,'captioned'):(p.assets||[]).find(a=>stageAccepts(p,a,module));description=staged?stageLabel(p,staged):p.caplock&&module==='captions'?'Resume caption edit':description;}const note=el('p',description);row.append(name,note);
  const actions=el('div',undefined,'picker-actions'),open=button('Open project',()=>openProject(p));open.className='picker-open';if(p.stagedCut){open.dataset.gsDynamicHelp='true';open.title='Open '+p.title+' with its own video and caption workspace.';}open.disabled=openingProject||(p.stagedCut&&!['ready','saved'].includes(p.cutState))||(!p.stagedCut&&p.cutOrigin&&p.cutOrigin.state!=='ready');
  if(!p.stagedCut||p.saved)actions.append(button('Assets',()=>showProject(p.id)));actions.append(open);row.append(actions);return row;
 }
 function allowed(p){return !module||all.checked||p.stagedCut&&module==='captions'||moduleReady(p,module);}
 function render(){
  clear();const q=search.value.toLowerCase().trim();for(const p of projects.values())if(allowed(p)&&(p.title+' '+p.id).toLowerCase().includes(q))results.append(card(p));view(mode);
 }
 async function seeds(){
  if(catalog)return catalog;const read=async(relative)=>{const r=await fetch(new URL(relative,import.meta.url));if(!r.ok)throw Error('Joke catalog unavailable');return r.json();};
  const [ledger,jokes]=await Promise.all([read('../jokelab/PRODUCTION_LEDGER.json'),read('../jokelets/catalog.json')]);catalog=indexedJokes(ledger,jokes);return catalog;
 }
 async function load(force=false){
  const token=++epoch;current=null;path.textContent=PROJECT_ROOT;search.placeholder='Search your joke projects';title.textContent=sourceFilter?'Caption a jokelet':'Open project · your jokes';home.textContent=sourceFilter?'All projects':'Joke projects';message(sourceFilter?'Receiving cuts from Clipper…':'Loading your joke projects…');
  if(force){listing=null;previews.clear();}
  if(sourceFilter&&extraProjects){
   projects=new Map((await extraProjects(sourceFilter)).map(p=>[p.id,p]));if(token!==epoch)return;path.textContent=[...projects.values()][0]?.cutOriginLocal?.source.name||'Clipper cuts';render();cutCountMessage();return;
  }
  // The picker is already visible; cloud/auth failures stay inside it.
  const [seedResult,cloudResult]=await Promise.allSettled([seeds(),listing&&!force?listing:listing=api('/api/joke-projects')]);if(token!==epoch)return;
  projects=new Map((seedResult.status==='fulfilled'?seedResult.value:[]).map(p=>[p.id,p]));
  if(cloudResult.status==='fulfilled'){
   let folders=cloudResult.value.projects||[];
   if(cloudResult.value.has_more){try{const all=await api('/api/assets');if(all.has_more)throw Error('Incomplete cloud folder listing');folders=projectFolders(all.entries);}catch(e){message('Folder list incomplete: '+e.message,true);}}
   for(const f of folders){const prior=projects.get(f.id)||{id:f.id,title:f.id,assets:[]};projects.set(f.id,{...prior,path:f.path||PROJECT_ROOT+'/'+f.id,saved:true});}
  }else{listing=null;message('Saved project connection unavailable: '+cloudResult.reason.message+' Your catalog previews remain available.',true);}
  if(extraProjects){try{const extras=await extraProjects();if(token!==epoch)return;projects=new Map([...extras.map(p=>[p.id,{...projects.get(p.id),...p}]),...[...projects].filter(([id])=>!extras.some(p=>p.id===id))]);}catch(e){message('Cut list unavailable: '+e.message,true);}}
  render();if(cloudResult.status==='fulfilled'&&!status.classList.contains('error'))message(module?'Ready for this stage · Show all files reveals other stages and ordinary imports.':projects.size+' joke projects · choose Open project to load the bed and saved work.');
  // Read at most three manifests at once; render incrementally without blocking the picker.
  const pending=[...projects.values()].filter(p=>p.saved);let index=0;
  await Promise.all(Array.from({length:Math.min(3,pending.length)},async()=>{while(index<pending.length){const p=pending[index++];try{const d=await api('/api/joke-project?id='+encodeURIComponent(p.id));if(token!==epoch)return;if(d.project){projects.set(p.id,{...p,...d.project,saved:true});const old=results.querySelector('[data-project-id="'+p.id+'"]');const item=projects.get(p.id);if(allowed(item)){if(old)old.replaceWith(card(item));else if(!search.value||item.title?.toLowerCase().includes(search.value.toLowerCase()))results.append(card(item));}else old?.remove();}}catch(e){if(token===epoch)message('Some saved projects could not load: '+e.message,true);}}}));
 }
 function cutCountMessage(){if(openingProject)return;const ready=[...projects.values()].filter(p=>['ready','saved'].includes(p.cutState)).length;message(projects.size?ready+' of '+projects.size+' jokelets ready · choose Open project.':'Open Clipper and tap CapLock to send your saved cuts.');}
 async function refreshExtras(){
  if(!dialog.open||!extraProjects||current)return;const token=epoch,items=await extraProjects(sourceFilter);if(token!==epoch||!dialog.open)return;
  const ids=new Set(items.map(p=>p.id));if(sourceFilter)for(const id of projects.keys())if(!ids.has(id)){projects.delete(id);results.querySelector('[data-project-id="'+id+'"]')?.remove();}
  for(const p of items){const old=projects.get(p.id);if(old?.stagedCut&&old.cutState===p.cutState&&(p.cutState!=='preparing'||old.progress===p.progress)&&old.error===p.error&&old.title===p.title)continue;projects.set(p.id,{...old,...p});const row=results.querySelector('[data-project-id="'+p.id+'"]');if(row)row.replaceWith(card(projects.get(p.id)));else results.prepend(card(projects.get(p.id)));}
  if(sourceFilter)cutCountMessage();view(mode);
 }
 async function openProject(p,bed=null){
  if(openingProject)return;openingProject=true;dialog.setAttribute('aria-busy','true');for(const b of dialog.querySelectorAll('.picker-open'))b.disabled=true;
  stop();message('Opening '+(p.title||p.id)+' · restoring project and assets…');try{await onOpenProject(p,bed,s=>message(s));dialog.close();}catch(e){message('Project not opened: '+e.message,true);}finally{openingProject=false;dialog.setAttribute('aria-busy','false');for(const p of projects.values()){const b=results.querySelector('[data-project-id="'+p.id+'"] .picker-open');if(b)b.disabled=(p.stagedCut&&!['ready','saved'].includes(p.cutState))||(!p.stagedCut&&p.cutOrigin&&p.cutOrigin.state!=='ready');}}
 }
 async function showProject(id){
  stop();let p=projects.get(id);if(!p)return;if(p.stagedCut&&p.saved){try{const d=await api('/api/joke-project?id='+encodeURIComponent(id));if(d.project){p={...p,...d.project};projects.set(id,p);}}catch(e){message('Project assets unavailable: '+e.message,true);return;}}current=id;detail.replaceChildren();detail.hidden=false;
  detail.append(el('h2',p.title||p.id),el('p',p.path,'picker-path'));
  if(p.text){const text=el('details'),summary=el('summary','Saved joke text');text.append(summary,el('p',p.text,'picker-text'));detail.append(text);}
  const assets=el('div',undefined,'picker-list');assets.classList.toggle('list',mode==='list');const list=projectAssets(p);for(const a of list.length?list:p.assets||[]){if(module&&!all.checked&&!stageAccepts(p,a,module))continue;const row=el('article',undefined,'picker-card');row.append(media(a),el('h3',stageRecord(p,a)?.fileName||a.name||a.id),el('p',[a.role||'Asset',captionCutLabel(a),stageLabel(p,a)].filter(Boolean).join(' · ')));row.append(button('Save asset',async()=>{try{const url=a.src?sourceURL(a):(await api('/api/playback?path='+encodeURIComponent(a.path))).url;const response=await fetch(url);if(!response.ok)throw Error('Source download failed');const blob=await response.blob(),href=URL.createObjectURL(blob),link=el('a');link.href=href;link.download=stageRecord(p,a)?.fileName||a.name||'asset';link.click();setTimeout(()=>URL.revokeObjectURL(href),30000);message('Save requested for '+a.name+'. Original stays in the project.');}catch(e){message(e.message,true);}}));if(a.role==='bed')row.append(button('Use this bed',()=>openProject(p,a)));else if(!a.parent&&onUseAsset)row.append(button('Add this item',async()=>{try{message('Loading '+a.name+'…');await onUseAsset(p,a);dialog.close();}catch(e){message(e.message,true);}}));assets.append(row);}detail.append(assets);detail.scrollIntoView({block:'nearest'});
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
 dialog.addEventListener('close',()=>{stop();observer.disconnect();for(const url of localURLs)URL.revokeObjectURL(url);localURLs.clear();++epoch;});
 return {open:async(id,options={})=>{onPause?.();all.checked=false;if(options.sourceHash!==undefined){sourceFilter=options.sourceHash;search.value='';mode='list';}else if(id)sourceFilter=null;footer.hidden=!hasProject();folders.disabled=!hasProject();if(!dialog.open)dialog.showModal();status.classList.remove('error');await load();if(id&&dialog.open)showProject(id);},refreshExtras,close:()=>dialog.close(),showCurrent:()=>current};
}


