const API='/api/drive-manager/';
const FOLDER='application/vnd.google-apps.folder';
const $=id=>document.getElementById(id);
const state={email:'',connected:false,view:'folder',folder:'root',query:'',files:[],selected:new Set(),next:null,location:null,busy:false,load:0,controller:null,pins:[],history:[],jobs:[]};
let toastTimer,dialogError,dialogEpoch=0;
const node=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;};
const button=(text,fn,cls)=>{const x=node('button',text,cls);x.type='button';x.addEventListener('click',()=>Promise.resolve().then(fn).catch(showError));return x;};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const key=name=>'vt-drive-manager.'+state.email+'.'+name;
const bytes=value=>{const n=Number(value);if(!Number.isFinite(n))return '';if(n<1024)return n+' B';const i=Math.min(4,Math.floor(Math.log(n)/Math.log(1024)));return (n/1024**i).toFixed(i===1?0:1)+' '+['B','KB','MB','GB','TB'][i];};
const date=value=>value?new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'';
const contentURL=(id,download=false)=>API+'content?id='+encodeURIComponent(id)+(download?'&download=1':'');
const viewName={folder:'My Drive',recent:'Recent files',starred:'Starred',shared:'Shared with me',trash:'Trash',all:'All Drive'};
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,6500);}
function showError(error){const text=error?.message||String(error);if($('dialog').open&&dialogError){dialogError.textContent=text;dialogError.hidden=false;}else{const target=$('workspace').hidden?$('notice'):$('error');target.textContent=text;target.hidden=false;}}
function setBusy(value){state.busy=value;document.body.setAttribute('aria-busy',String(value));for(const id of ['moveSelected','trashSelected','restoreSelected','dialogClose'])$(id).disabled=value;const canAdd=state.view==='folder'&&!state.query&&!state.location?.item.trashed&&state.location?.item.capabilities?.canAddChildren!==false;for(const id of ['newFolder','upload'])$(id).disabled=value||!canAdd;for(const b of $('dialogActions').querySelectorAll('button'))b.disabled=value;}
async function api(path,{method='GET',data,headers={},body,signal}={}){
 let response;
 try{response=await fetch(API+path,{method,credentials:'same-origin',cache:'no-store',headers:{...(data?{'content-type':'application/json'}:{}),...headers},body:data?JSON.stringify(data):body,signal:signal||AbortSignal.timeout(method==='GET'?60000:150000)});}
 catch(error){if(error.name==='AbortError')throw error;throw Error(method==='GET'?'Drive could not be reached. Your previous list is still shown; use Refresh to try again.':'The result is uncertain. Refresh to check Drive before applying this change again.');}
 const result=await response.json().catch(()=>({error:'Drive returned an unreadable response.'}));
 if(response.status===401){setConnection(false);throw Error(result.error||'Reconnect Google Drive.');}
 if(!response.ok)throw Error(result.error||'Drive did not complete the request.');
 return result;
}
const write=(path,data)=>api(path,{method:'POST',data,headers:{'x-request-id':crypto.randomUUID()}});
function setConnection(connected,account={}){
 state.connected=connected;$('workspace').hidden=!connected;$('connectInfo').hidden=connected;$('connect').hidden=connected;$('disconnect').hidden=!connected;
 $('accountText').textContent=connected?'Connected · '+account.email:'Your files stay private. Connect your Google Drive account.';
 if(connected){state.email=account.email;state.pins=read(key('pins'),[]);state.history=read(key('history'),[]);renderPins();renderActivity();}
 else{state.selected.clear();$('selection').hidden=true;}
}
function showDialog(title){dialogEpoch++;$('dialogTitle').textContent=title;$('dialogBody').replaceChildren();$('dialogActions').replaceChildren();dialogError=node('p','','error');dialogError.hidden=true;$('dialogBody').append(dialogError);if(!$('dialog').open)$('dialog').showModal();return $('dialogBody');}
function closeDialog(){if(!state.busy){dialogEpoch++;$('dialog').close();}}
function dialogActions(items){$('dialogActions').replaceChildren(...items);}
function renderSelection(){const count=state.selected.size;$('selection').hidden=!count;$('selectedCount').textContent=count+' selected';$('restoreSelected').hidden=state.view!=='trash';$('moveSelected').hidden=state.view==='trash';$('trashSelected').hidden=state.view==='trash';const first=state.files.slice(0,100);$('selectAll').checked=first.length>0&&first.every(f=>state.selected.has(f.id));$('selectAll').indeterminate=count>0&&!$('selectAll').checked;}
function renderPins(){
 $('pins').replaceChildren();for(const pin of state.pins){const row=node('div',undefined,'pin');row.append(button(pin.name,()=>navigate(pin.id),'pin-name'),button('×',()=>{state.pins=state.pins.filter(p=>p.id!==pin.id);save(key('pins'),state.pins);renderPins();},'unpin'));row.lastChild.setAttribute('aria-label','Unpin '+pin.name);$('pins').append(row);}
 $('pinCurrent').hidden=state.view!=='folder'||state.folder==='root'||!state.location;
}
function pin(item){if(!state.pins.some(p=>p.id===item.id))state.pins.push({id:item.id,name:item.name});save(key('pins'),state.pins);renderPins();toast('Pinned '+item.name);}
function renderActivity(){
 $('activity').replaceChildren();if(!state.history.length){$('activity').append(node('p','Your verified changes will appear here.'));return;}
 for(const entry of state.history.slice(0,20)){const row=node('div',undefined,'activity-row');row.append(node('div',entry.label),node('small',new Date(entry.at).toLocaleString()));
  if(!entry.undone&&['rename','move','trash'].includes(entry.action))row.append(button('Undo',()=>undo(entry),'small'));
  $('activity').append(row);
 }
}
function record(action,result,label){state.history.unshift({key:crypto.randomUUID(),at:new Date().toISOString(),action,before:result.before,after:result.after,label});state.history=state.history.slice(0,30);save(key('history'),state.history);renderActivity();}
async function undo(entry){
 const current=(await api('item?id='+encodeURIComponent(entry.after.id))).item;
 const fields=entry.action==='rename'?['name']:entry.action==='move'?['parents']:['trashed'];
 if(fields.some(f=>JSON.stringify(current[f])!==JSON.stringify(entry.after[f])))throw Error('This item has changed since that action. Open its current location before changing it again.');
 if(entry.action==='trash'){await restore([current]);return;}
 const action=entry.action,input={ids:[current.id],action,expected:{[current.id]:Object.fromEntries(fields.map(f=>[f,current[f]]))}};
 if(action==='rename')input.name=entry.before.name;else input.targetId=entry.before.parents?.[0]||'root';
 await perform(input);entry.undone=true;save(key('history'),state.history);renderActivity();
}
async function load({append=false}={}){
 const seq=++state.load;state.controller?.abort();state.controller=new AbortController();$('error').hidden=true;$('empty').hidden=true;$('count').textContent='Loading…';$('refresh').disabled=true;
 const params=new URLSearchParams({view:state.view,folder:state.folder,query:state.query,sort:$('sort').value});if(append&&state.next)params.set('page',state.next);
 try{const result=await api('files?'+params,{signal:state.controller.signal});if(seq!==state.load)return;
  state.files=[...new Map((append?[...state.files,...(result.files||[])]:result.files||[]).map(f=>[f.id,f])).values()];state.next=result.nextPageToken||null;state.location=result.location||null;
  if(!append)state.selected.clear();render();if(result.incompleteSearch)toast('Google returned a partial search. Try a more specific filename.');
 }catch(error){if(error.name!=='AbortError'&&seq===state.load){$('count').textContent=state.files.length?'Previous list · refresh failed':'List unavailable';showError(error);}}
 finally{if(seq===state.load)$('refresh').disabled=false;}
}
function navigate(folder='root'){
 state.view='folder';state.folder=folder;state.query='';$('query').value='';save(key('lastFolder'),folder);
 const url=new URL(location.href);url.search='';if(folder!=='root')url.searchParams.set('folder',folder);history.replaceState(null,'',url);return load();
}
function render(){
 const current=state.location?.item,title=state.query?'Search results':state.view==='folder'?(current?.name||'My Drive'):viewName[state.view];$('viewTitle').textContent=title;$('breadcrumbs').replaceChildren();
 for(const b of document.querySelectorAll('[data-view]'))b.classList.toggle('active',b.dataset.view===state.view);
 const path=state.location?.path||[];
 if(path.length){path.forEach((f,i)=>{if(i)$('breadcrumbs').append(node('span','/','crumb-separator'));$('breadcrumbs').append(button(i===0&&!(f.parents?.length)?'My Drive':f.name,()=>navigate(f.id),'crumb'+(i===path.length-1?' current':'')));});}
 else $('breadcrumbs').append(button(state.query?'All Drive search':viewName[state.view],()=>navigate(),'crumb current'));
 $('copyLocation').hidden=state.view!=='folder'||Boolean(state.query);$('clearSearch').hidden=!state.query;
 $('trashWarning').hidden=!current?.trashed;
 if(current?.trashed)$('trashWarningText').textContent='This original folder is in Trash. Restore it to keep using the same folder and saved links.';
 const canAdd=state.view==='folder'&&!state.query&&!current?.trashed&&current?.capabilities?.canAddChildren!==false;
 $('newFolder').disabled=!canAdd||state.busy;$('upload').disabled=!canAdd||state.busy;$('pinCurrent').hidden=state.folder==='root'||state.view!=='folder'||Boolean(state.query);
 $('count').textContent=state.files.length+' '+(state.files.length===1?'item':'items')+(state.next?' · more available':'');$('selectLabel').textContent=state.files.length>100?'first 100':'files';$('more').hidden=!state.next;
 $('fileList').replaceChildren(...state.files.map(row));$('empty').hidden=state.files.length>0;
 $('empty').textContent=state.query?'No matches in this view. Try part of the filename.':current?.trashed?'Restore this folder to see its active contents.':state.view==='trash'?'No items found in Trash.':'This folder is empty.';
 renderSelection();renderPins();
}
function row(item){
 const r=node('div',undefined,'file-row'+(state.selected.has(item.id)?' selected':''));r.setAttribute('role','listitem');
 const check=node('input');check.type='checkbox';check.checked=state.selected.has(item.id);check.setAttribute('aria-label','Select '+item.name);
 check.addEventListener('change',()=>{if(check.checked&&state.selected.size>=100){check.checked=false;toast('Select up to 100 items per change.');return;}check.checked?state.selected.add(item.id):state.selected.delete(item.id);r.classList.toggle('selected',check.checked);renderSelection();});
 const icon=node('span',item.mimeType===FOLDER?'▰':item.mimeType?.startsWith('application/vnd.google-apps.')?'DOC':item.name.split('.').at(-1).slice(0,5).toUpperCase(),'file-icon'+(item.mimeType===FOLDER?' folder':''));icon.setAttribute('aria-hidden','true');
 const info=node('div');info.append(button(item.name,()=>openItem(item),'file-name'));
 const meta=node('div',undefined,'file-meta');let text=[item.mimeType===FOLDER?'Folder':bytes(item.size),date(item.modifiedTime),item.starred?'Starred':'',item.shared?'Shared':''].filter(Boolean).join(' · ');meta.append(document.createTextNode(text));
 if(item.trashed)meta.append(node('span',' · '+(item.explicitlyTrashed?'In Trash':'Inside a trashed folder'),'in-trash'));
 info.append(meta);const more=button('•••',()=>menu(item),'row-more');more.setAttribute('aria-label','Actions for '+item.name);r.append(check,icon,info,more);return r;
}
async function openItem(item){
 if(item.mimeType==='application/vnd.google-apps.shortcut'&&item.shortcutDetails?.targetId)item=(await api('item?id='+encodeURIComponent(item.shortcutDetails.targetId))).item;
 if(item.mimeType===FOLDER)return navigate(item.id);
 if(item.trashed)return details(item);
 const body=showDialog(item.name),url=contentURL(item.id),type=item.mimeType||'';
 if(/^image\/(png|jpeg|gif|webp|avif)$/.test(type)){const img=node('img',undefined,'image-preview');img.src=url;img.alt=item.name;body.append(img);}
 else if(/^(video|audio)\//.test(type)){const media=node(type.startsWith('video')?'video':'audio',undefined,'media-preview');media.controls=true;media.src=url;body.append(media);}
 else if(type==='application/pdf'||type.startsWith('application/vnd.google-apps.')||type==='text/plain'){const iframe=node('iframe',undefined,'preview');iframe.title=item.name;iframe.src=url;body.append(iframe);}
 else body.append(node('p','Download this file to open it in its matching app.','dialog-note'));
 const download=node('a','Download','button primary');download.href=contentURL(item.id,true);
 dialogActions([button('Location and details',()=>details(item)),button('Copy link',()=>copyLink(item)),download]);
}
function copyLink(item){const url=new URL('/drive/',location.origin);url.searchParams.set(item.mimeType===FOLDER?'folder':'file',item.id);return navigator.clipboard.writeText(url.href).then(()=>toast('Link copied to this original '+(item.mimeType===FOLDER?'folder':'file')+'.'));}
async function details(item){
 const result=await api('item?id='+encodeURIComponent(item.id));const body=showDialog(result.item.name);body.append(node('h3','Current location'));
 const trail=node('div',undefined,'detail-path');for(const [i,part]of result.path.entries()){if(i)trail.append(node('span','/'));trail.append(button(part.name,()=>{closeDialog();return navigate(part.id);},'small'));}body.append(trail);
 const list=node('ul',undefined,'detail-list');for(const text of ['Status: '+(result.item.trashed?'In Trash':'Active'),'Modified: '+date(result.item.modifiedTime),'Type: '+result.item.mimeType,...(result.item.size?['Size: '+bytes(result.item.size)]:[]),'Original ID: '+result.item.id])list.append(node('li',text));body.append(list);
 const actions=[button('Copy link',()=>copyLink(result.item))];if(result.item.trashed)actions.push(button('Restore original',()=>restore([result.item]),'primary'));dialogActions(actions);
}
function menu(item){
 const body=showDialog(item.name),actions=node('div',undefined,'menu-actions');
 if(item.trashed)actions.append(button('Restore original',()=>restore([item]),'primary'));
 else{actions.append(button('Open',()=>openItem(item)),button('Rename',()=>rename(item)),button('Move to folder',()=>pickFolder([item])));
  if(item.mimeType!==FOLDER)actions.append(button('Make a copy',()=>pickFolder([item],true)));
  actions.append(button(item.starred?'Remove star':'Add star',()=>perform({ids:[item.id],action:'star',starred:!item.starred})));
  if(item.mimeType===FOLDER)actions.append(button('Pin this folder',()=>{pin(item);closeDialog();}));
  else{const download=node('a','Download','button');download.href=contentURL(item.id,true);actions.append(download);}
 }
 actions.append(button('Location and details',()=>details(item)),button('Copy link',()=>copyLink(item)));
 if(!item.trashed)actions.append(button('Move to Trash',()=>trash([item]),'danger'));
 body.append(actions);
}
function rename(item){const body=showDialog('Rename'),label=node('label','Name','field'),input=node('input');input.type='text';input.value=item.name;input.maxLength=255;label.append(input);body.append(label);dialogActions([button('Cancel',closeDialog),button('Save name',()=>perform({ids:[item.id],action:'rename',name:input.value,expected:{[item.id]:{name:item.name}}}),'primary')]);input.focus();input.select();}
async function perform(input){
 if(state.busy)return;setBusy(true);
 try{const result=await write('change',input),good=result.results.filter(x=>x.ok),bad=result.results.filter(x=>!x.ok);
  const verbs={rename:'Renamed',move:'Moved',trash:'Moved to Trash',restore:'Restored original',star:input.starred?'Starred':'Unstarred'};
  for(const r of good)record(input.action,r,verbs[input.action]+' · '+r.after.name);
  setBusy(false);closeDialog();await load();
  if(bad.length)showError(Error(good.length+' completed; '+bad.length+' need attention. '+bad.map(x=>x.error).join(' ')));
  else toast((good.length===1?verbs[input.action]+' '+good[0].after.name:good.length+' items updated')+(input.action==='restore'?'. Original links retained.':'.'));
  return result;
 }catch(e){showError(e);throw e;}finally{setBusy(false);}
}
function selected(){return state.files.filter(f=>state.selected.has(f.id));}
function trash(items){const body=showDialog('Move to Trash?');body.append(node('p','Move '+items.length+' '+(items.length===1?'item':'items')+' to Google Drive Trash? You can restore the originals later.'));const list=node('ul');for(const f of items.slice(0,15))list.append(node('li',f.name));body.append(list);dialogActions([button('Cancel',closeDialog),button('Move '+items.length+' to Trash',()=>perform({ids:items.map(f=>f.id),action:'trash'}),'danger')]);}
async function restore(items){
 const body=showDialog('Restore originals');body.append(node('p','Checking the original folder locations…','dialog-note'));
 const epoch=dialogEpoch;
 const originals=new Map();
 for(let i=0;i<items.length;i+=8){const details=await Promise.all(items.slice(i,i+8).map(f=>api('item?id='+encodeURIComponent(f.id))));for(const result of details){for(const part of result.path){if(part.trashed)originals.set(part.id,part);}originals.set(result.item.id,result.item);}}
 if(epoch!==dialogEpoch||!$('dialog').open)return;
 const ordered=[...originals.values()];if(ordered.length>100)throw Error('Restore fewer items together so their parent folders can be included.');
 showDialog('Restore originals');$('dialogBody').append(node('p','Restore these original items and any parent folders needed to reach them. Their IDs and saved links stay the same.'));const list=node('ul');for(const f of ordered)list.append(node('li',f.name));$('dialogBody').append(list);
 dialogActions([button('Cancel',closeDialog),button('Restore '+ordered.length+' '+(ordered.length===1?'item':'items'),()=>perform({ids:ordered.map(f=>f.id),action:'restore'}),'primary')]);
}
async function pickFolder(items,copy=false){
 const body=showDialog(copy?'Copy to folder':'Move to folder');body.append(node('p',(copy?'Copy ':'Move ')+items.length+' '+(items.length===1?'item':'items')+'. Choose the destination below.','dialog-note'));
 const path=node('div',undefined,'picker-path'),form=node('form',undefined,'picker-search'),query=node('input'),search=button('Find folders',()=>browse('root',query.value));query.type='search';query.placeholder='Search folder names';query.setAttribute('aria-label','Find destination folder');form.append(query,search);form.addEventListener('submit',e=>{e.preventDefault();browse('root',query.value).catch(showError);});
 const folderList=node('div'),label=node('p','','dialog-note');body.append(path,form,label,folderList);let target='root',targetName='My Drive',page=null,generation=0;
 const commit=button(copy?'Copy here':'Move here',async()=>{
  if(!copy)return perform({ids:items.map(f=>f.id),action:'move',targetId:target});
  setBusy(true);try{for(const item of items){const result=await write('copy',{id:item.id,targetId:target,name:item.name});record('copy',{before:item,after:result.item},'Copied · '+result.item.name);}setBusy(false);closeDialog();await load();toast('Copy saved in '+targetName+'.');}finally{setBusy(false);}
 },'primary');
 dialogActions([button('Cancel',closeDialog),commit]);
 async function browse(folder,term='',append=false){
  const seq=++generation;commit.disabled=true;const params=new URLSearchParams({view:'folder',folder,foldersOnly:'1',query:term});if(append&&page)params.set('page',page);
  const result=await api('files?'+params);if(seq!==generation)return;if(!append)folderList.replaceChildren();page=result.nextPageToken;
  if(!term){target=result.location?.item.id||folder;targetName=result.location?.item.name||'My Drive';path.replaceChildren();(result.location?.path||[]).forEach((f,i)=>{if(i)path.append(node('span','/'));path.append(button(f.name,()=>browse(f.id),'small'));});label.textContent='Destination: '+targetName;commit.disabled=Boolean(result.location?.item.trashed);}
  else{label.textContent='Choose a folder from these search results.';commit.disabled=true;}
  for(const f of result.files||[])folderList.append(button('▰  '+f.name,()=>{query.value='';return browse(f.id);},'picker-row'));
  if(!(result.files||[]).length&&!append)folderList.append(node('p',term?'No matching folders.':'No subfolders. You can use this destination.','dialog-note'));
  if(page)folderList.append(button('More folders',()=>browse(folder,term,true),'small'));
 }
 await browse('root');
}
function newFolder(){const body=showDialog('New folder'),label=node('label','Folder name','field'),input=node('input');input.type='text';input.maxLength=255;label.append(input);body.append(node('p','Location: '+(state.location?.item.name||'My Drive'),'dialog-note'),label);dialogActions([button('Cancel',closeDialog),button('Create folder',async()=>{if(state.busy)return;setBusy(true);try{const result=await write('folder',{name:input.value,parentId:state.folder});record('folder',{after:result.item},'Created folder · '+result.item.name);setBusy(false);closeDialog();await load();toast('Created '+result.item.name);}finally{setBusy(false);}},'primary')]);input.focus();}
function renderUploads(){
 $('uploadPanel').hidden=!state.jobs.length;$('uploadJobs').replaceChildren();
 for(const job of state.jobs){const box=node('div',undefined,'upload-job');box.append(node('strong',job.file.name),node('p',job.message||'Waiting'));const progress=node('progress');progress.max=job.file.size||1;progress.value=job.complete?progress.max:job.offset;progress.setAttribute('aria-label','Upload progress for '+job.file.name);box.append(progress);
  if(job.paused)box.append(button('Resume upload',()=>runUpload(job),'primary'));$('uploadJobs').append(box);
 }
}
async function runUpload(job){
 if(job.running||job.complete)return;job.running=true;job.paused=false;job.message='Starting upload…';renderUploads();
 try{
  if(!job.ticket){const result=await write('upload',{name:job.file.name,mimeType:job.file.type||'application/octet-stream',size:job.file.size,parentId:job.parent});job.ticket=result.ticket;job.offset=0;}
  else{const result=await api('upload-chunk',{method:'PUT',headers:{'x-upload-ticket':job.ticket,'content-range':`bytes */${job.file.size}`,'content-type':'application/octet-stream'},body:new Uint8Array()});if(result.complete){job.complete=true;job.item=result.item;}else job.offset=result.offset;}
  while(!job.complete){const end=Math.min(job.offset+4*1024**2,job.file.size),zero=job.file.size===0;const result=await api('upload-chunk',{method:'PUT',headers:{'x-upload-ticket':job.ticket,'content-range':zero?'bytes */0':`bytes ${job.offset}-${end-1}/${job.file.size}`,'content-type':'application/octet-stream'},body:zero?new Uint8Array():job.file.slice(job.offset,end)});if(result.complete){job.complete=true;job.item=result.item;}else{if(result.offset<=job.offset)throw Error('Drive did not advance the upload. Resume to check its current position.');job.offset=result.offset;}job.message=job.complete?'Saved in '+job.parentName:Math.round(job.offset/Math.max(1,job.file.size)*100)+'% · '+job.parentName;renderUploads();}
  record('upload',{after:job.item},'Uploaded · '+job.item.name);if(state.view==='folder'&&state.folder===job.parent)await load();
 }catch(error){job.paused=true;job.message=error.message+' Keep this page open to resume.';}
 finally{job.running=false;renderUploads();}
}
async function uploadFiles(files){
 const parent=state.folder,parentName=state.location?.item.name||'My Drive';$('uploadTarget').textContent='Upload location: '+parentName;
 for(const file of files){const job={file,parent,parentName,offset:0};state.jobs.push(job);renderUploads();await runUpload(job);}
 $('uploadPanel').scrollIntoView({block:'nearest',behavior:'smooth'});
}
$('searchForm').addEventListener('submit',e=>{e.preventDefault();state.query=$('query').value.trim();return load();});
$('clearSearch').addEventListener('click',()=>{state.query='';$('query').value='';load();});
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>{if(b.dataset.view==='folder')return navigate();state.view=b.dataset.view;state.query='';$('query').value='';const u=new URL(location.href);u.search='';u.searchParams.set('view',state.view);history.replaceState(null,'',u);load();});
$('sort').addEventListener('change',()=>{save(key('sort'),$('sort').value);load();});$('refresh').addEventListener('click',()=>load());$('more').addEventListener('click',()=>load({append:true}));
$('selectAll').addEventListener('change',()=>{state.selected.clear();if($('selectAll').checked)for(const f of state.files.slice(0,100))state.selected.add(f.id);render();});
$('clearSelected').addEventListener('click',()=>{state.selected.clear();render();});$('moveSelected').addEventListener('click',()=>pickFolder(selected()).catch(showError));$('trashSelected').addEventListener('click',()=>trash(selected()));$('restoreSelected').addEventListener('click',()=>restore(selected()).catch(showError));
$('newFolder').addEventListener('click',newFolder);$('pinCurrent').addEventListener('click',()=>state.location&&pin(state.location.item));$('copyLocation').addEventListener('click',()=>copyLink(state.location?.item||{id:state.folder,mimeType:FOLDER}).catch(showError));$('restoreLocation').addEventListener('click',()=>restore([state.location.item]).catch(showError));
$('upload').addEventListener('click',()=>$('uploadInput').click());$('uploadInput').addEventListener('change',()=>{const files=[...$('uploadInput').files];$('uploadInput').value='';uploadFiles(files).catch(showError);});
$('dialogClose').addEventListener('click',closeDialog);$('dialog').addEventListener('cancel',e=>{if(state.busy)e.preventDefault();else dialogEpoch++;});
$('disconnect').addEventListener('click',async()=>{try{await api('disconnect',{method:'POST'});setConnection(false);}catch(e){showError(e);}});
async function start(){
 const params=new URLSearchParams(location.search),connection=params.get('connection');
 if(connection){const messages={ready:'Google Drive connected. This browser will keep the connection.',canceled:'Google connection was canceled. Your Drive files were not changed.',expired:'The connection request expired. Use Connect Google Drive to start again.',failed:'Google did not complete the connection. Use Connect Google Drive to try again.',account:'Choose your connected Vitals Tracker Google account.',offline:'Google did not provide background access. Connect again and approve the Drive permission.',unavailable:'The existing Google connection is unavailable. The backend configuration needs attention.'};$('notice').textContent=messages[connection]||'';$('notice').hidden=!messages[connection];}
 try{const account=await api('status');setConnection(account.connected,account);if(!account.connected)return;
  const savedSort=read(key('sort'),'name');if([...$('sort').options].some(o=>o.value===savedSort))$('sort').value=savedSort;
  state.folder=params.get('folder')||read(key('lastFolder'),'root');if(!/^(root|[A-Za-z0-9_-]{8,200})$/.test(state.folder))state.folder='root';
  if(['recent','starred','shared','trash','all'].includes(params.get('view')))state.view=params.get('view');
  await load();if(params.get('file'))await openItem((await api('item?id='+encodeURIComponent(params.get('file')))).item);
 }catch(e){showError(e);}
}
start();
