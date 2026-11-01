/** Locked SxLock equipment. Editors supply nodes and behavior, never new sizing. */
export const PLAYER_PROFILE=Object.freeze({id:'SxLock-R24',rail:76,row:29,frame:36,gap:7,frameGlyph:30,record:40,secondary:25});
export function mountPlayerShell(tool,config){
 if(typeof document==='undefined'||document.querySelector('.gs-player-shell'))return;
 const q=s=>s?document.querySelector(s):null,$=id=>document.getElementById(id),el=(tag,cls)=>Object.assign(document.createElement(tag),{className:cls});
 const important=(node,values)=>{if(node)for(const [key,value]of Object.entries(values))node.style.setProperty(key,String(value),'important');};
 let workspace=q(config.workspace),surface=q(config.stage),rail=q(config.rail),clock=q(config.clock),media=q(config.video);
 if(tool==='cliplock')surface=workspace?.querySelector('.screen');
 if(tool==='wavlock'){
  surface=$('wave');clock=$('clock');media=$('audio');if(!surface)return;
  workspace=el('div','gs-viewer');surface.closest('section').before(workspace);rail=el('nav','');workspace.append(surface,rail);
  for(const id of ['play','prev','next','markIn','markOut','preview','goIn','goOut','clearSelection','reset','export'])if($(id))rail.append($(id));
  if(media)media.controls=false;
 }
 if(!workspace||!surface||!rail)return;
 // A surface, a clock, and one fixed-height transport: actual existing nodes.
 const root=(tool==='cliplock'?workspace.closest('.dock'):tool==='caplock'?$('playerDock'):null)||el('section','');
 if(!root.isConnected)workspace.before(root);
 root.classList.add('gs-player-shell');root.dataset.playerProfile=PLAYER_PROFILE.id;
 important(root,{position:'sticky',top:'0px','z-index':'20',order:'-10',margin:'0',padding:'0 max(16px, env(safe-area-inset-right)) 0 max(16px, env(safe-area-inset-left))',background:'#101924','border-radius':'0','box-sizing':'border-box'});
 let grip=tool==='caplock'?$('dockGrip'):null,drawer=tool==='caplock'?$('pickerDrawer'):null;
 grip=grip||el('button','');grip.type='button';grip.classList.add('gs-source-grip');grip.setAttribute('aria-controls',drawer?.id||'gsSourceDrawer');
 drawer=drawer||el('div','');if(!drawer.id)drawer.id='gsSourceDrawer';drawer.classList.add('gs-source-drawer');
 // Keep transferred native IDs connected while each editor is being mounted.
 root.append(grip,drawer);
 const identity=el('div','gs-player-identity');
 const names={cliplock:'Clipper',sxlock:'SxLock',caplock:'CapLock',aspectlock:'AspectLock',previewlock:'PreviewLock',framelock:'FrameLock',motionlock:'MotionLock',wavlock:'WavLock'};
 const syncIdentity=()=>{const version=document.title.match(/\bR\d+(?:\.\d+)*\b|\bv\d+(?:\.\d+)+\b/)?.[0]||'';identity.textContent=(tool==='cliplock'?($('toolTitle')?.textContent||names[tool]):names[tool])+' · GS-TOOL-'+tool.toUpperCase()+' · '+version;};syncIdentity();
 if(q('title'))new MutationObserver(syncIdentity).observe(q('title'),{childList:true,subtree:true,characterData:true});
 const stash=el('div','gs-original-controls');stash.hidden=true;
 const filename=el('div','gs-player-filename');filename.textContent='No file loaded';filename.setAttribute('aria-label','Source filename');
 const sourceLabels={cliplock:'#source',sxlock:'#videoName',caplock:'#bedName',aspectlock:'#baseChosen',previewlock:'#fileName',framelock:'#meta',wavlock:'#source'};
 const sourceLabel=q(sourceLabels[tool]);let chosenName='';
 const syncFilename=()=>{const loaded=!!media?.getAttribute('src'),label=sourceLabel?.textContent?.trim().split(' · ')[0];filename.textContent=loaded?(label||chosenName||'Video loaded'):'No file loaded';filename.title=filename.textContent;};
 if(sourceLabel)new MutationObserver(syncFilename).observe(sourceLabel,{childList:true,subtree:true,characterData:true});
 const sourceInput=$(['framelock','previewlock','wavlock'].includes(tool)?'file':'videoFile');sourceInput?.addEventListener('change',e=>{chosenName=e.target.files?.[0]?.name||chosenName;},true);
 if(media)for(const name of ['loadedmetadata','emptied','loadstart'])media.addEventListener(name,syncFilename);
 syncFilename();
 const put=node=>{if(node&&!drawer.contains(node)&&node!==root&&!node.contains(root))drawer.append(node);};
 const selectIntoDrawer=selector=>{for(const node of document.querySelectorAll(selector))put(node);};
 // Source controls use the same pull-down drawer as the established CapLock grip.
 if(tool==='cliplock'){
  selectIntoDrawer('.mode-switch,.top,#frameTools,#captionBackground');
  put($('sourceSelect')?.closest('details'));
  const exports=$('videoExport');if(exports){if($('videoDownloads'))q('.work').append($('videoDownloads'));put(exports);}
 }
 if(tool==='sxlock')selectIntoDrawer('#viewerSection,#sxLaunch,#sxVersion,.title-row,main>#toolIdentity,main>.small,main>#recoveryStatus');
 if(tool==='caplock')for(const id of ['bedLoad','railImport'])put($(id));
 if(tool==='aspectlock'){selectIntoDrawer('body>header,.asset-pickers');put($('overlaySeek')?.closest('.transport'));}
 if(tool==='previewlock'){
  const library=$('libraryBar')?.closest('section');if(library)put(library);for(const id of ['importPanel','settings','renameSection','connectionControl','viewerInfo','savedCopy'])put($(id));
  const top=$('top');if(top){const fields=[...top.children].filter(n=>n!==clock);for(const n of fields)put(n);important(top,{display:'none'});}
  const oldIdentity=q('body>p');if(oldIdentity)put(oldIdentity);
 }
 if(['framelock','motionlock','wavlock'].includes(tool)){selectIntoDrawer('main>h1,main>p');if(tool==='wavlock'){put($('approvedEffects'));put($('file')?.closest('section'));}if(tool==='motionlock')put($('loadBtn'));}
 // Move real, visible device selectors, retaining their IDs and original handlers.
 for(const input of document.querySelectorAll('input[type=file]')){
  if(drawer.contains(input)||input.closest('dialog,[inert]')||input.hidden||getComputedStyle(input).display==='none')continue;
  const label=input.closest('label');if(label){put(label);continue;}
  const previous=input.previousElementSibling;if(previous?.tagName==='LABEL')put(previous);put(input);
 }
 const nativeRange=tool==='previewlock'?$('seekBar'):['framelock','wavlock'].includes(tool)?null:$('seek');
 const nativeWidget=nativeRange?.tagName==='INPUT'?document.querySelector('.gs-precision[data-for="'+nativeRange.id+'"]'):null;
 const framePicture=tool==='framelock'?q('.gs-frame-picture'):null,frameProgress=framePicture?.querySelector('progress'),frameSeek=framePicture?.querySelector('.gs-precision');
 if(nativeRange)stash.append(nativeRange);if(nativeWidget)root.append(nativeWidget);
 const picture=el('div','gs-player-picture'),content=tool==='sxlock'?$('viewerContent'):el('div','gs-player-content');
 const oldSxPicture=tool==='sxlock'?$('viewerDock'):null;
 if(tool==='sxlock'){
  // Native source/recording/collapse hooks still address their original elements.
  for(const id of ['peak','collapseViewer'])if($(id))stash.append($(id));
  content.replaceChildren();picture.append(oldSxPicture);oldSxPicture.replaceChildren(content);
  important(oldSxPicture,{display:'flex',height:'100%',width:'100%',padding:'0','min-height':'0',overflow:'hidden','flex-direction':'column'});
 }
 else picture.append(content);
 content.classList.add('gs-player-content');important(content,{display:'flex','flex-direction':'column',height:'100%','min-height':'0',padding:'0',gap:'0'});
 if(clock)content.append(clock);content.append(surface);
 surface.classList.add('gs-player-surface');clock?.classList.add('gs-player-clock');
 const transportWrapper=tool==='sxlock'?rail.closest('.sticky'):rail;
 rail.classList.add('gs-rail-stack');if(transportWrapper!==rail)important(transportWrapper,{position:'static',margin:'0',padding:'0',width:PLAYER_PROFILE.rail+'px'});
 const right=transportWrapper||rail;right.classList.add('gs-player-rail');
 // Remove obsolete visual wrappers, not controls, media, or engine state.
 workspace.replaceChildren(picture,right);workspace.classList.add('gs-player-workspace');
 important(workspace,{display:'grid','grid-template-columns':'minmax(0,1fr) '+PLAYER_PROFILE.rail+'px',gap:'4px','align-items':'start',position:'static',margin:'0',padding:'0',height:'auto','min-height':'0','max-height':'none',order:'0'});
 important(picture,{'min-width':'0',margin:'0',padding:'0',overflow:'hidden'});
 const frameIds=(config.frames||[]).filter(id=>$(id)&&rail.contains($(id)));
 const paired=new Set();
 for(let i=0;i+1<frameIds.length;i+=2){const back=$(frameIds[i]),forward=$(frameIds[i+1]);if(back.parentElement===forward.parentElement&&back.parentElement!==rail&&back.parentElement.children.length===2)back.parentElement.classList.add('gs-frame-pair');else{const pair=el('div','gs-frame-pair');back.before(pair);pair.append(back,forward);}paired.add(back);paired.add(forward);}
 if(tool==='cliplock'){
  const order=['play','start'];for(let i=order.length-1;i>=0;i--)if($(order[i]))rail.prepend($(order[i]));
  const exact=el('details','gs-exact-marks');exact.id='exactMarks';const summary=el('summary','');summary.textContent='Exact IN / OUT';exact.append(summary);
  for(const [mark,field]of [['markIn','in'],['markOut','out']]){const label=el('label','');label.textContent=field.toUpperCase()+' frame ';label.append($(field));exact.append(label);rail.append($(mark));}
  drawer.append(exact);
  if($('back25')&&$('next25')){const bulk=el('div','gs-control-pair');bulk.append($('back25'),$('next25'));rail.querySelector('.gs-frame-pair').after(bulk);}
  const jump=el('div','gs-control-row gs-jump-row');jump.append($('jumpFrame'),$('goFrame'));const pair=rail.querySelector('.gs-control-pair')||rail.querySelector('.gs-frame-pair');pair.after(jump);
  for(const id of ['preview','addCut','saveBatch','cancelVideo'])if($(id))rail.append($(id));
  const name=q('.batch-add');if(name){name.classList.add('gs-under-player');for(const empty of [...name.children])if(!empty.contains($('cutName')))empty.remove();root.append(name);}
  q('.boundary-row')?.remove();
 }
 if(tool==='wavlock'){
  for(const [mark,field,label]of [['markIn','in','IN'],['markOut','out','OUT']]){const row=el('div','gs-control-row');$(mark).textContent=label;row.append($(mark),$(field));rail.append(row);}
  const pair=el('div','gs-control-pair');pair.append($('prev'),$('next'));rail.prepend(pair);if($('play'))rail.prepend($('play'));
  const sourceLine=$('source');if(sourceLine)put(sourceLine);$('export').textContent='Save WAV';
  const row=el('div','gs-control-row'),field=el('input',''),go=el('button','');field.type='number';field.min='0';field.step='.001';field.inputMode='decimal';field.value='0';field.setAttribute('aria-label','Go to seconds');go.type='button';go.textContent='Go';go.onclick=()=>{const n=Number(field.value);if(Number.isFinite(n)&&n>=0&&n<=media.duration){media.pause();media.currentTime=n;}};row.append(field,go);rail.append(row);
  surface.dataset.gsReadonlyTimeline='true';for(const name of ['click','pointerdown'])surface.addEventListener(name,e=>e.stopImmediatePropagation(),true);
 }
 // Native exact-entry widgets move intact; their commit handlers remain unchanged.
 const primaryRange=nativeRange;
 if(primaryRange?.tagName==='PROGRESS')content.append(primaryRange);
 else if(primaryRange){
  const widget=nativeWidget;
  if(widget){const progress=widget.querySelector('progress'),row=widget.querySelector('.gs-set-row'),error=widget.querySelector('.gs-set-error');if(progress)content.append(progress);if(row){row.classList.add('gs-control-row');widget.replaceChildren(row);rail.append(widget);}if(error){error.classList.add('gs-player-error');root.append(error);}stash.append(primaryRange);}
 }
 if(tool==='framelock'){
  const progress=frameProgress,seek=frameSeek;if(progress)content.append(progress);if(seek){const row=seek.querySelector('.gs-set-row');if(row){row.classList.add('gs-control-row');seek.replaceChildren(row);rail.append(seek);}}if($('meta'))put($('meta'));
 }
 // Right-side source buttons belong in the hidden drawer; editing controls stay put.
 const under=[];if(tool==='caplock')for(const id of ['focusBar','placementBar'])if($(id))under.push($(id));
 if(tool==='motionlock'){const status=q('.status');if(status&&!content.contains(status)){content.prepend(status);}const shuttle=q('.shuttle-wrap');if(shuttle)important(shuttle,{display:'none'});}
 const existingName=tool==='cliplock'?q('.batch-add'):null;
 root.replaceChildren(grip,drawer,identity,filename,workspace,...under,...(existingName?[existingName]:[]),stash,...root.querySelectorAll(':scope>.gs-player-error'));
 // Keep now-empty source wrappers from taking a row above or under the monitor.
 if(tool==='cliplock')q('#frameTools .jump')?.remove();
 if(tool==='aspectlock')important($('stage')?.parentElement,{padding:'0',margin:'0'});
 if(tool==='previewlock'){
  const header=workspace.closest('header');if(header&&header!==root)important(header,{position:'static',padding:'0',margin:'0'});
  const apps=q('.playerApps');if(apps)root.after(apps);
 }
 const pause=()=>media?.pause();
 function applyDrawer(open){important(drawer,{display:open?'block':'none',height:open?'auto':'0px','max-height':open?'45dvh':'0px',padding:open?'5px':'0px',visibility:open?'visible':'hidden',overflow:open?'auto':'hidden','pointer-events':open?'auto':'none'});grip.setAttribute('aria-expanded',String(open));grip.setAttribute('aria-label',open?'Hide file picker':'Show file picker');grip.textContent=open?'⌃':'⌄';}
 function setDrawer(open){root.classList.toggle('drawer-closed',!open);applyDrawer(open);if(open)pause();}
 new MutationObserver(()=>applyDrawer(!root.classList.contains('drawer-closed'))).observe(root,{attributes:true,attributeFilter:['class']});
 const scrollNode=tool==='cliplock'?q('.work'):document.scrollingElement;
 const scrollPosition=()=>tool==='cliplock'?(scrollNode?.scrollTop||0):window.scrollY;
 const scrollTo=value=>{if(tool==='cliplock'&&scrollNode)scrollNode.scrollTop=value;else window.scrollTo(0,value);};
 let drag=null,dragged=false;
 grip.addEventListener('pointerdown',e=>{e.stopImmediatePropagation();drag={y:e.clientY,scroll:scrollPosition()};dragged=false;grip.setPointerCapture(e.pointerId);},true);
 grip.addEventListener('pointermove',e=>{if(!drag)return;e.stopImmediatePropagation();const dy=e.clientY-drag.y;if(Math.abs(dy)>30){dragged=true;if(drag.scroll>0){scrollTo(Math.max(0,drag.scroll-dy));return;}setDrawer(dy>0);}},true);
 for(const name of ['pointerup','pointercancel'])grip.addEventListener(name,e=>{e.stopImmediatePropagation();drag=null;},true);
 grip.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(dragged){dragged=false;return;}setDrawer(root.classList.contains('drawer-closed'));},true);
 if(media){media.addEventListener('loadedmetadata',()=>setDrawer(false));media.addEventListener('loadstart',()=>{if(media.getAttribute('src'))setDrawer(false);});}
 setDrawer(false);
 if(media&&!surface.querySelector('.gs-empty-load,#bedLoader,#empty')){
  const load=el('button','gs-empty-load');load.type='button';load.textContent=tool==='wavlock'?'Load sound':tool==='aspectlock'?'Choose bed':'Load video';
  load.onclick=()=>{if(tool==='sxlock')$('sxPickVideo')?.click();else if(tool==='aspectlock')$('pickBase')?.click();else if(tool==='wavlock')$('file')?.click();else setDrawer(true);};surface.append(load);
  const show=()=>load.hidden=!!media.getAttribute('src');for(const name of ['loadstart','loadedmetadata','emptied'])media.addEventListener(name,show);show();
 }
 root.gsPlayer=Object.freeze({profile:PLAYER_PROFILE,setDrawer});
 // Lock the approved single-row geometry. A bigger picture never stretches buttons.
 function sizeControls(){
  important(rail,{display:'flex','flex-direction':'column','grid-template-rows':'none',gap:PLAYER_PROFILE.gap+'px',width:PLAYER_PROFILE.rail+'px',height:'auto','min-height':'0','max-height':'none',padding:'0',margin:'0',overflow:'visible'});
  for(const pair of rail.querySelectorAll('.gs-frame-pair,.gs-control-pair,.sx-frame'))important(pair,{display:'grid','grid-template-columns':'1fr 1fr',width:'100%',gap:'5px',height:'auto',margin:'0',padding:'0'});
  for(const group of rail.querySelectorAll('.compactBar,.transport,.buttons'))if(group!==rail&&!group.closest('.gs-control-row'))important(group,{display:'contents'});
  for(const b of rail.querySelectorAll('button')){
   const frame=paired.has(b)||b.classList.contains('gs-frame-button'),height=frame?PLAYER_PROFILE.frame:b.id==='liveRecord'?PLAYER_PROFILE.record:['liveStop','saveTake'].includes(b.id)?PLAYER_PROFILE.secondary:PLAYER_PROFILE.row;
   important(b,{height:height+'px','min-height':height+'px','max-height':height+'px',padding:frame?'0px':'2px','font-size':frame?PLAYER_PROFILE.frameGlyph+'px':'11px','line-height':frame?'1':'1.1',width:'100%','min-width':'0','max-width':'100%',margin:'0',flex:'none','white-space':'nowrap',overflow:'hidden','text-overflow':'ellipsis','border-radius':'5px'});
  }
  for(const row of rail.querySelectorAll('.gs-control-row'))important(row,{display:'flex',gap:'3px',height:PLAYER_PROFILE.row+'px','min-height':PLAYER_PROFILE.row+'px',padding:'0',margin:'0',width:'100%','align-items':'center'});
  for(const field of rail.querySelectorAll('input'))important(field,{'min-width':'0',width:'100%',height:PLAYER_PROFILE.row+'px','min-height':PLAYER_PROFILE.row+'px',padding:'2px','font-size':'11px',margin:'0','border-radius':'5px'});
  for(const b of rail.querySelectorAll('.gs-control-row button'))important(b,{width:'25px',flex:'0 0 25px'});
  if(tool==='wavlock')for(const id of ['markIn','markOut'])if($(id)&&rail.contains($(id)))important($(id),{width:'29px',flex:'0 0 29px'});
 }
 function sizePicture(){
  const height=Math.ceil(right.getBoundingClientRect().height);if(height<1)return;
  important(picture,{height:height+'px','min-height':'0','max-height':height+'px'});
  const clockHeight=clock?.getBoundingClientRect().height||0,progress=[...content.children].filter(n=>n.tagName==='PROGRESS').reduce((n,p)=>n+p.getBoundingClientRect().height+4,0),screenHeight=Math.max(50,height-clockHeight-progress);
  important(surface,{height:screenHeight+'px','min-height':'0','max-height':screenHeight+'px',width:'100%',margin:'0',padding:'0',flex:'none',overflow:'hidden',background:'#070c12'});
  if(tool==='aspectlock')important($('stage'),{height:'100%','min-height':'0','max-height':'100%',width:'auto','max-width':'100%','aspect-ratio':'9 / 16',margin:'auto'});
  for(const child of surface.querySelectorAll(':scope>video,:scope>canvas'))important(child,{width:'100%',height:'100%','max-height':'100%','object-fit':'contain'});
  for(const video of surface.querySelectorAll(':scope>video'))important(video,{position:'absolute',inset:'0px','min-width':'0','min-height':'0'});
 }
 sizeControls();sizePicture();new ResizeObserver(sizePicture).observe(right);
 let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;sizeControls();sizePicture();});}).observe(rail,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 window.addEventListener('resize',sizePicture);
}
