import {ensureToolbox,makeToolboxPlacement,assetFrameLabel,shiftPlacementIn,fitPlacementOut,setPlacementSpeed} from './toolbox-core.mjs?v=24';
import {inspectToolboxFile} from './toolbox-media.mjs?v=24';
import {BackgroundSurface} from './background.mjs?v=23';
const $=id=>document.getElementById(id);
const signature=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('');
export function createToolboxUI(o){
 const cache=new Map();let busy=false,previewURL=null,previewTick=null,previewAsset=null;
 const p=()=>o.project(),assets=()=>ensureToolbox(p()),current=()=>p().clips.find(c=>c.id===o.selected()),assetFor=c=>assets().find(a=>a.id===c?.toolboxId);
 const placed=()=>p().clips.filter(c=>!c.captionNumber||c.placed).slice().sort((a,b)=>a.inFrame-b.inFrame);
 function stopPreview(){cancelAnimationFrame(previewTick);previewTick=null;$('toolboxPreviewVideo').pause();$('toolboxPreviewVideo').removeAttribute('src');$('toolboxPreviewVideo').load();if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;previewAsset=null;$('toolboxPreview').hidden=true;}
 function render(){
  const list=assets().slice().sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));for(const c of p().clips){const m=o.media().get(c.id);if(m?.blob&&c.toolboxId&&!cache.has(c.toolboxId))cache.set(c.toolboxId,m.blob);}
  $('editActiveCaption').textContent='+ Files';$('editActiveCaption').disabled=busy||!o.ready();$('placementState').textContent='Toolbox · '+list.length;
  $('insertCaption').textContent='Insert';$('insertCaption').disabled=busy||!o.ready();$('sheetInsertCaption').textContent='Insert another';$('sheetInsertCaption').disabled=busy||!o.ready();
  const items=placed(),index=items.findIndex(c=>c.id===o.selected());$('previousCaption').disabled=index<=0;$('nextCaption').disabled=index<0||index>=items.length-1;
  $('previousCaption').title='Previous placement';$('nextCaption').title='Next placement';$('toItemStart').disabled=!current();$('play').disabled=!o.ready();
  const c=current(),a=assetFor(c);$('clipFrameInfo').textContent=c?assetFrameLabel(a)+` · Span ${c.outFrame-c.inFrame} frames / ${((c.outFrame-c.inFrame)/25).toFixed(3)}s · ${(c.playbackRate??1).toFixed(3)}×`:'';
  if(!$('toolboxDialog').open)return;
  $('toolboxFilesAdd').disabled=busy;$('toolboxList').replaceChildren();
  for(const a of list){
   const used=items.filter(c=>c.toolboxId===a.id).length,row=document.createElement('div');row.className='toolbox-row'+(used?' used':'');row.dataset.assetId=a.id;
   const use=document.createElement('button');use.type='button';use.className='toolbox-insert';use.setAttribute('aria-label','Insert '+a.name);use.disabled=busy;
   const title=document.createElement('strong');title.textContent=a.name;const info=document.createElement('small');info.textContent=assetFrameLabel(a);use.append(title,info);use.onclick=()=>insert(a.id);
   const badge=document.createElement('span');badge.className='toolbox-use-count';badge.textContent=used?'Used '+used+'×':'Ready';
   const preview=document.createElement('button');preview.type='button';preview.textContent='▶ Preview';preview.setAttribute('aria-label','Preview '+a.name);preview.disabled=busy;preview.onclick=()=>showPreview(a.id);
   row.append(use,badge,preview);$('toolboxList').append(row);
  }
  $('toolboxEmpty').hidden=!!list.length;
 }
 function open(){if(!o.ready())return o.say('Choose your bed video first. Play it to check it, then add files.');o.pause();if(!$('toolboxDialog').open)$('toolboxDialog').showModal();$('toolboxStatus').textContent='Choose a file to insert at F'+o.frame()+'. Used files stay available.';render();}
 function choose(){if(!o.ready())return o.say('Choose your bed video first.');$('toolboxFiles').click();}
 async function add(files){
  if(busy||!files.length)return;if(!o.ready())return o.say('Choose your bed video first.');
  o.pause();open();busy=true;const epoch=o.epoch(),pending=[];render();
  try{
   for(const file of files){
    $('toolboxStatus').textContent=`Reading ${pending.length+1}/${files.length} · ${file.name}`;
    const hash=await signature(file),existing=assets().find(a=>a.name===file.name&&(a.sha256===hash||!a.sha256&&a.ref.name===file.name&&a.ref.size===file.size));
    const meta=await inspectToolboxFile(file,file.name);
    const a={id:existing?.id||crypto.randomUUID(),name:file.name,ref:{kind:'local',name:file.name,size:file.size},...meta,sha256:hash,...(existing?.chroma?{chroma:existing.chroma}:{})};pending.push({a,file});
   }
   if(epoch!==o.epoch())throw Error('Bed changed during file selection.');
   if(!o.change(()=>{for(const {a}of pending){const i=p().toolbox.findIndex(old=>old.id===a.id);if(i<0)p().toolbox.push(a);else p().toolbox[i]=a;}}))throw Error('Toolbox files could not be saved.');
   for(const {a,file}of pending)cache.set(a.id,file);
   $('toolboxStatus').textContent=`${assets().length} files in this bed’s toolbox. Tap a file to insert it; it stays reusable.`;o.say('Toolbox ready. Insert lets you choose any file, as often as needed.');
  }catch(e){$('toolboxStatus').textContent=e.message;o.say(e.message);}finally{busy=false;$('toolboxFiles').value='';render();}
 }
 async function media(a){
  let blob=cache.get(a.id);
  if(!blob&&a.ref.kind==='previewlock'){const d=await o.api('/api/playback?path='+encodeURIComponent(a.ref.path));const r=await fetch(d.url);if(!r.ok)throw Error('File unavailable: '+a.name);blob=await r.blob();cache.set(a.id,blob);}
  if(!blob)throw Error('Use + Files to reconnect '+a.name+'. Its saved placements stay in the project.');
  if(!a.duration||!a.frames){const meta=await inspectToolboxFile(blob,a.name);if(!o.change(()=>Object.assign(a,meta,{chroma:a.chroma||meta.chroma})))throw Error('Could not read clip details.');}
  return blob;
 }
 async function insert(id){
  if(busy)return;const a=assets().find(a=>a.id===id);if(!a)return;
  busy=true;render();let c;const epoch=o.epoch();
  try{
   const blob=await media(a);o.pause();c=makeToolboxPlacement(a,o.frame(),crypto.randomUUID(),current());await o.attach(c,blob);
   if(epoch!==o.epoch())throw Error('Bed changed before insertion.');
   if(!o.change(()=>{p().clips.push(c);p().editFocus='overlay';}))throw Error('Placement could not be added.');
   $('toolboxDialog').close();o.select(c.id);o.say(a.name+' inserted. It remains in the toolbox for another insertion.');
  }catch(e){if(c&&!p().clips.some(x=>x.id===c.id))o.detach(c.id);$('toolboxStatus').textContent=e.message;o.say(e.message);}finally{busy=false;render();}
 }
 const previewSurface=new BackgroundSurface($('toolboxPreviewCanvas'));
 function paintPreview(){
  const v=$('toolboxPreviewVideo');if(!previewAsset||previewAsset.type==='audio'||v.readyState<2)return;
  if(previewAsset.chroma?.enabled)previewSurface.draw(v,previewAsset.chroma,{maxWidth:540});
  else{const canvas=previewSurface.canvas;canvas.width=v.videoWidth;canvas.height=v.videoHeight;const ctx=previewSurface.ctx;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(v,0,0);}
 }
 async function showPreview(id){
  const a=assets().find(a=>a.id===id);if(!a)return;
  try{stopPreview();const blob=await media(a);if(a.type==='image'){$('toolboxStatus').textContent=assetFrameLabel(a)+'. Insert to position this still image.';return;}
   previewAsset=a;previewURL=URL.createObjectURL(blob);const v=$('toolboxPreviewVideo');v.muted=a.type!=='audio';v.volume=1;$('toolboxPreviewCanvas').hidden=a.type==='audio';v.onloadeddata=()=>{if(previewAsset?.id!==a.id)return;paintPreview();$('toolboxPreview').hidden=false;};v.src=previewURL;$('toolboxPreviewName').textContent=a.name+' · '+assetFrameLabel(a);
  }catch(e){$('toolboxStatus').textContent=e.message;}
 }
 function duration(c){return assetFor(c)?.duration||c.sourceDuration||o.media().get(c.id)?.el.duration;}
 function timing(fn){const c=current();if(!c)return;o.pause();o.change(()=>fn(c,duration(c)));}
 $('toolboxPreviewPlay').onclick=()=>{const v=$('toolboxPreviewVideo');if(v.paused){v.play().catch(e=>o.say(e.message));const tick=()=>{paintPreview();if(!v.paused)previewTick=requestAnimationFrame(tick);};tick();}else{v.pause();paintPreview();}};
 $('toolboxPreviewVideo').onended=paintPreview;$('toolboxPreviewVideo').onseeked=paintPreview;
 $('toolboxClose').onclick=()=>$('toolboxDialog').close();$('toolboxDialog').addEventListener('close',stopPreview);
 $('toolboxFilesAdd').onclick=choose;$('toolboxFiles').onchange=e=>add([...e.target.files||[]]);
 $('editActiveCaption').onclick=choose;$('railImport').onclick=open;$('overlayLibrary').onclick=open;$('insertCaption').onclick=open;$('sheetInsertCaption').onclick=()=>{o.closeProperties();open();};
 $('clipStart').onchange=e=>timing(c=>shiftPlacementIn(c,Number(e.target.value)));
 $('clipEnd').onchange=e=>timing((c,d)=>fitPlacementOut(c,Number(e.target.value),d));
 $('clipMarkIn').onclick=()=>timing(c=>shiftPlacementIn(c,o.frame()));$('clipMarkOut').onclick=()=>timing((c,d)=>fitPlacementOut(c,o.frame(),d));
 $('clipSpeed').onchange=e=>timing((c,d)=>setPlacementSpeed(c,Number(e.target.value),d));
 for(const [id,delta]of [['speedDown',-.01],['speedUp',.01]])$(id).onclick=()=>timing((c,d)=>setPlacementSpeed(c,Math.max(.1,Math.min(8,Math.round(((c.playbackRate??1)+delta)*1000)/1000)),d));
 $('speedReset').onclick=()=>timing((c,d)=>setPlacementSpeed(c,1,d));$('speedFit').onclick=()=>timing((c,d)=>fitPlacementOut(c,c.outFrame,d));
 for(const [id,delta]of [['previousCaption',-1],['nextCaption',1]])$(id).onclick=()=>{const items=placed(),index=items.findIndex(c=>c.id===o.selected()),c=items[index+delta];if(c){o.pause();o.select(c.id);o.seek(c.inFrame);}};
 return {render,open,add,cache,reset(){stopPreview();cache.clear();if($('toolboxDialog').open)$('toolboxDialog').close();},frameLabel(c){return assetFrameLabel(assetFor(c));},async reconnect(files){
  for(const a of assets()){for(const f of files){if(f.name!==a.ref.name||f.size!==a.ref.size)continue;const hash=await signature(f);if(a.sha256&&hash!==a.sha256)throw Error('Different file contents: '+f.name+'. Choose the original file.');const meta=await inspectToolboxFile(f,f.name);Object.assign(a,meta,{chroma:a.chroma||meta.chroma,sha256:hash});cache.set(a.id,f);break;}}render();
 }};
}
