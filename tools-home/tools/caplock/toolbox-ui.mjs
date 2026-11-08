import {ensureToolbox,makeToolboxPlacement,assetFrameLabel,shiftPlacementIn,fitPlacementOut,setPlacementSpeed,fitVideoPlacement} from './toolbox-core.mjs?v=28';
import {inspectToolboxFile} from './toolbox-media.mjs?v=28';
import {BackgroundSurface} from './background.mjs?v=23';
const $=id=>document.getElementById(id);
const signature=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('');
export function createToolboxUI(o){
 const cache=new Map();let busy=false,previewURL=null,previewTick=null,previewAsset=null,replacing=null,position='playhead';
 const p=()=>o.project(),assets=()=>ensureToolbox(p()),current=()=>p().clips.find(c=>c.id===o.selected()),assetFor=c=>assets().find(a=>a.id===c?.toolboxId);
 const placed=()=>{
  const items=p().clips.filter(c=>!c.captionNumber||c.placed);
  return p().canvas?items:items.sort((a,b)=>a.inFrame-b.inFrame);
 };
 const positions=[['toolboxPrepend','prepend'],['toolboxAppend','append']];
 const placementFrame=()=>position==='prepend'?0:position==='append'?o.end():o.frame();
 const placementHint=()=>position==='prepend'?'Choose a file to prepend. Existing layers move together.':'Choose a file to insert at F'+placementFrame()+'.';
 function stopPreview(){cancelAnimationFrame(previewTick);previewTick=null;$('toolboxPreviewVideo').pause();$('toolboxPreviewVideo').removeAttribute('src');$('toolboxPreviewVideo').load();if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;previewAsset=null;$('toolboxPreview').hidden=true;}
 function render(){
  const list=assets().slice().sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));for(const c of p().clips){const m=o.media().get(c.id);if(m?.blob&&c.toolboxId&&!cache.has(c.toolboxId))cache.set(c.toolboxId,m.blob);}
  $('editActiveCaption').textContent='+ Files';$('editActiveCaption').disabled=busy||!o.ready();$('placementState').textContent='Toolbox · '+list.length+(o.extendedFrames?.()?' · '+o.extendedFrames()+' frames':'');
  $('insertCaption').textContent=p().canvas?'Toolbox':'Insert';$('insertCaption').disabled=busy||!o.ready();$('sheetInsertCaption').textContent='Insert another';$('sheetInsertCaption').disabled=busy||!o.ready();
  const items=placed(),index=items.findIndex(c=>c.id===o.selected());$('previousCaption').disabled=index<=0;$('nextCaption').disabled=index<0||index>=items.length-1;
  $('previousCaption').title='Previous placement';$('nextCaption').title='Next placement';$('toItemStart').disabled=!current();$('play').disabled=!o.ready();
  const c=current(),a=assetFor(c),cut=c?.sourceTrim;
  const sourceLabel=cut?'Source F'+cut.inFrame+'–'+cut.outFrame+' · '+(cut.end-cut.start).toFixed(3)+'s':assetFrameLabel(a);
  $('clipFrameInfo').textContent=c?sourceLabel+` · Span ${c.outFrame-c.inFrame} frames / ${((c.outFrame-c.inFrame)/25).toFixed(3)}s · ${(c.playbackRate??1).toFixed(3)}×`:'';
  if(!$('toolboxDialog').open)return;
  $('toolboxFilesAdd').disabled=busy;$('toolboxList').replaceChildren();
  for(const [id,mode] of positions){
   const button=$(id);
   button.hidden=!!replacing||!p().canvas;
   button.disabled=busy;
   button.setAttribute('aria-pressed',String(position===mode));
  }
  const available=replacing?list.filter(a=>a.type==='video'):list;
  for(const a of available){
   const used=items.filter(c=>c.toolboxId===a.id).length,row=document.createElement('div');row.className='toolbox-row'+(used?' used':'');row.dataset.assetId=a.id;
   const use=document.createElement('button');use.type='button';use.className='toolbox-insert';use.setAttribute('aria-label',(replacing?'Replace with ':'Insert ')+a.name);use.disabled=busy;
   const title=document.createElement('strong');title.textContent=a.name;const info=document.createElement('small');info.textContent=assetFrameLabel(a);use.append(title,info);use.onclick=()=>insert(a.id);
   const badge=document.createElement('span');badge.className='toolbox-use-count';badge.textContent=used?'Used '+used+'×':'Ready';
   const preview=document.createElement('button');preview.type='button';preview.textContent='▶ Preview';preview.setAttribute('aria-label','Preview '+a.name);preview.disabled=busy;preview.onclick=()=>showPreview(a.id);
   row.append(use,badge,preview);$('toolboxList').append(row);
  }
  $('toolboxEmpty').hidden=!!available.length;
 }
 function open(replacement=null){
  if(!o.ready())return o.say('Choose your first video to start the project.');
  o.pause();
  if(!$('toolboxDialog').open){
   replacing=replacement;
   position='playhead';
   $('toolboxDialog').showModal();
  }
  $('toolboxTitle').textContent=replacing?'Replace video':'Toolbox';
  $('toolboxStatus').textContent=replacing?'Choose a video for this layer.':placementHint();
  render();
 }
 function choose(){if(!o.ready())return o.say('Choose your bed video first.');$('toolboxFiles').click();}
 async function add(files){
  if(busy||!files.length)return;if(!o.ready())return o.say('Choose your bed video first.');
  o.pause();open();busy=true;const epoch=o.epoch(),pending=[];render();
  try{
   for(const file of files){
    $('toolboxStatus').textContent=`Reading ${pending.length+1}/${files.length} · ${file.name}`;
    const hash=await signature(file);
    let existing=[...assets(),...pending.map(({a})=>a)].find(a=>a.name===file.name&&(a.sha256===hash||!a.sha256&&a.ref.name===file.name&&a.ref.size===file.size));
    const original=cache.get(existing?.id);
    if(original&&!existing.sha256&&await signature(original)!==hash)existing=null;
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
  if(!a.duration||!a.frames||p().canvas&&a.type==='video'&&!a.width){const meta=await inspectToolboxFile(blob,a.name);if(!o.change(()=>Object.assign(a,meta,{chroma:a.chroma||meta.chroma})))throw Error('Could not read clip details.');}
  return blob;
 }
 async function insert(id){
  if(busy)return;const a=assets().find(a=>a.id===id);if(!a)return;
  busy=true;render();let c;const epoch=o.epoch();
  try{
   const replacement=replacing,prepend=position==='prepend',joining=position!=='playhead';
   const blob=await media(a);o.pause();
   c=makeToolboxPlacement(a,replacement?.inFrame??placementFrame(),crypto.randomUUID(),p().canvas?undefined:current());
   if(p().canvas&&a.type==='video')fitVideoPlacement(c,a,p().canvas);
   if(joining&&a.type==='video')c.volume=1;
   if(replacement){c.volume=replacement.volume;c.visible=replacement.visible;}
   await o.attach(c,blob);
   if(epoch!==o.epoch())throw Error('Project changed before insertion.');
   if(!o.change(()=>{
    if(replacement){
     const index=p().clips.indexOf(replacement);
     if(index<0)throw Error('This layer has changed. Reopen Replace.');
     p().clips.splice(index,1,c);
    }else if(prepend){
     const span=c.outFrame-c.inFrame;
     for(const layer of p().clips)shiftPlacementIn(layer,layer.inFrame+span);
     for(const caption of p().captions){
      if(caption.inFrame!==null)caption.inFrame+=span;
      if(caption.outFrame!==null)caption.outFrame+=span;
     }
     p().clips.unshift(c);
    }else p().clips.push(c);
    p().editFocus='overlay';
   }))throw Error('Placement could not be added.');
   $('toolboxDialog').close();o.select(c.id);
   if(replacement||joining)o.seek(c.inFrame);
   o.say(a.name+(replacement?' replaced the selected layer.':' inserted at F'+c.inFrame+'.'));
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
 $('toolboxClose').onclick=()=>$('toolboxDialog').close();$('toolboxDialog').addEventListener('close',()=>{if(!$('toolboxDialog').open){replacing=null;stopPreview();}});
 for(const [id,mode] of positions)$(id).onclick=()=>{
  position=position===mode?'playhead':mode;
  $('toolboxStatus').textContent=placementHint();
  render();
 };
 $('toolboxFilesAdd').onclick=choose;$('toolboxFiles').onchange=e=>add([...e.target.files||[]]);
 $('editActiveCaption').onclick=choose;
 for(const id of ['railImport','overlayLibrary','insertCaption'])$(id).onclick=()=>open();
 $('sheetInsertCaption').onclick=()=>{o.closeProperties();open();};
 $('replaceVideo').onclick=()=>{const c=current();if(c?.type==='video'&&!c.locked){o.closeProperties();open(c);}};
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
