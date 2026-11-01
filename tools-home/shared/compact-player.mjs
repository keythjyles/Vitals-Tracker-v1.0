/** Shared UI adapter; never stores or rewrites media or native edit records. */
export const COMPACT_PLAYER_VERSION='1';
export function explicitValue(value,min,max){const n=Number(value);if(String(value).trim()===''||!Number.isFinite(n)||n<min||n>max)throw Error('Enter a value from '+min+' to '+max+'.');return n;}
export function hapticClick(device=globalThis.navigator){try{return device?.vibrate?.(12)??false;}catch{return false;}}
if(typeof document!=='undefined'){
 const tool=location.pathname.match(/\/tools\/([^/]+)/)?.[1]||'';
 document.body.classList.add('gs-compact');document.body.dataset.gsTool=tool;
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./compact-player.css?v=1',import.meta.url).href;document.head.append(css);
 const configs={
  cliplock:{workspace:'.player-workspace',stage:'.picture',rail:'.transport',clock:'#clock',video:'#video',frames:['back','next']},
  caplock:{workspace:'.workspace',stage:'#viewport',rail:'.rail',clock:'.readout',video:'#video',frames:['prev','next','sheetBack','sheetForward'],ranges:{seek:'frame'}},
  aspectlock:{workspace:'.stageWorkspace',stage:'.stageWrap',rail:'#stageNav',clock:'#position',video:'#bv',frames:['backFrame','forwardFrame','sheetBack','sheetForward'],ranges:{seek:'normalized',overlaySeek:'normalized'},otherVideo:{overlaySeek:'#ov'}},
  sxlock:{workspace:'#editorDock',stage:'.viewer',rail:'#sxSideControls',clock:'#clock',video:'#video',frames:['back','forward','sheetBack','sheetForward'],ranges:{seek:'seconds'}},
  previewlock:{workspace:'.stageWorkspace',stage:'#viewerShell',rail:'#previewControls',clock:'#clock',video:'#player',frames:['minus1','plus1'],ranges:{seekBar:'normalized'}},
  motionlock:{workspace:'.player-row',stage:'.stage',rail:'.gs-motion-controls',clock:'.status',video:'#sourceVideo',frames:['prev','next'],ranges:{seek:'normalized'}},
  framelock:{workspace:'.gs-viewer',stage:'.gs-frame-picture',rail:'.gs-frame-transport',clock:'#position',video:'#video',frames:['back','forward']},
  wavlock:{frames:[]}
 };
 const config=configs[tool]||{frames:[]};
 if(tool==='framelock'&&$('#review-workspace')&&$('#video')){
  const section=$('#review-workspace'),workspace=document.createElement('div'),picture=document.createElement('div'),rail=section.querySelector('.transport');workspace.className='gs-viewer';picture.className='gs-frame-picture';rail.classList.add('gs-frame-transport');section.prepend(workspace);picture.append($('#position'),$('#video'),$('#meta'));workspace.append(picture,rail);
 }
 if(tool==='motionlock'&&$('.player-row')){
  const workspace=$('.player-row'),rail=document.createElement('div'),controls=workspace.parentElement.querySelector('.buttons');rail.className='gs-motion-controls';if(controls)rail.append(controls);for(const r of [...workspace.children].filter(n=>n.classList.contains('rail')))rail.append(r);workspace.append(rail);
  const shuttle=$('#shuttleKnob');if(shuttle){shuttle.tabIndex=-1;shuttle.setAttribute('aria-hidden','true');}
 }
 if(tool==='aspectlock'&&$('#position')&&$('.stageWorkspace'))$('.stageWorkspace').before($('#position'));
 if(tool==='motionlock'&&$('.status')&&$('.player-row'))$('.player-row').before($('.status'));
 for(const [key,cls]of [['workspace','gs-viewer'],['stage','gs-stage'],['rail','gs-rail'],['clock','gs-clock']])if(config[key])$(config[key])?.classList.add(cls);
 const nativeVideo=config.video?$(config.video):null;
 if(nativeVideo&&['framelock','motionlock'].includes(tool)){
  const stage=$(config.stage),input=$('input[type=file]');if(stage&&input){const load=document.createElement('button');load.type='button';load.className='gs-empty-load';load.textContent='Load video';load.onclick=()=>input.click();stage.append(load);const show=()=>load.hidden=!!nativeVideo.getAttribute('src');for(const name of ['loadedmetadata','emptied','loadstart'])nativeVideo.addEventListener(name,show);show();}
 }
 if(tool==='aspectlock')for(const [playId,pauseId,mediaId,title]of [['play','pause','bv','Bed'],['playOverlay','pauseOverlay','ov','Animation']]){
  const play=$('#'+playId),pause=$('#'+pauseId),media=$('#'+mediaId);if(!play||!pause||!media)continue;pause.hidden=true;
  document.addEventListener('click',e=>{if(e.target.closest('#'+playId)&&!media.paused){e.preventDefault();e.stopImmediatePropagation();pause.click();}},true);
  const label=()=>play.textContent=(media.paused?'▶ ':'Ⅱ ')+title;media.addEventListener('play',label);media.addEventListener('pause',label);label();
 }
 for(const id of config.frames){const button=$('#'+id);if(!button)continue;const backward=/back|prev|minus/i.test(id);button.classList.add('gs-frame-button');button.textContent=backward?'−':'+';if(!button.getAttribute('aria-label'))button.setAttribute('aria-label',backward?'Previous frame':'Next frame');button.title=backward?'Back one frame':'Forward one frame';}
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(e.isTrusted&&b?.classList.contains('gs-frame-button')&&!b.disabled&&tool!=='cliplock')hapticClick();},true);
 // End-of-source Play cannot silently restart a precision workspace.
 if(nativeVideo){document.addEventListener('click',e=>{if(e.target.closest('#play,#playPause')&&nativeVideo.ended&&nativeVideo.paused){e.preventDefault();e.stopImmediatePropagation();}},true);}
 const adapters=new Map();
 function protectRange(range){
  if(adapters.has(range)||range.closest('[inert]'))return;
  const mode=config.ranges?.[range.id]||'setting',temporal=mode!=='setting',media=$(config.otherVideo?.[range.id]||config.video||'video'),name=range.getAttribute('aria-label')||range.labels?.[0]?.textContent?.trim()||range.id||'Value';
  const wrapper=document.createElement('span');wrapper.className='gs-precision';wrapper.dataset.for=range.id;
  const progress=document.createElement('progress');progress.className='gs-progress';progress.max=1;progress.value=0;progress.setAttribute('aria-label',name+' (read-only)');
  const box=document.createElement(temporal?'details':'span');if(temporal){const summary=document.createElement('summary');summary.textContent=mode==='frame'?'Go to frame':'Go to time';box.append(summary);wrapper.append(progress);}
  const row=document.createElement('span'),field=document.createElement('input'),apply=document.createElement('button'),error=document.createElement('span');row.className='gs-set-row';field.type='number';field.inputMode=mode==='frame'?'numeric':'decimal';field.setAttribute('aria-label',temporal?(mode==='frame'?'Go to frame':'Go to seconds'):name+' exact value');apply.type='button';apply.textContent=temporal?'Go':'Set';apply.setAttribute('aria-label',(temporal?'Go to ':'Set ')+(mode==='frame'?'frame':temporal?'time':name));error.className='gs-set-error';error.setAttribute('role','status');row.append(field,apply);box.append(row,error);wrapper.append(box);
  range.dataset.gsProtectedRange='true';range.tabIndex=-1;range.setAttribute('aria-hidden','true');range.after(wrapper);
  const limits=()=>mode==='normalized'?{min:0,max:Number.isFinite(media?.duration)?media.duration:0}:{min:Number(range.min||0),max:Number(range.max||100)};
  const display=()=>mode==='normalized'?Number(range.value)/Number(range.max||1000)*(Number.isFinite(media?.duration)?media.duration:0):Number(range.value);
  function sync(){const {min,max}=limits();const value=display();field.min=String(min);field.max=String(max);field.step=mode==='frame'?'1':mode==='normalized'?'0.001':range.step||'any';field.disabled=range.disabled||mode==='normalized'&&max<=0;apply.disabled=field.disabled;if(document.activeElement!==field)field.value=String(Number(value.toFixed(3)));progress.value=max>min?(value-min)/(max-min):0;wrapper.hidden=range.hidden;}
  function commit(){try{if(range.disabled)return;const {min,max}=limits(),n=explicitValue(field.value,min,max);if(mode==='frame'&&!Number.isInteger(n))throw Error('Enter a whole frame number.');if(temporal)media?.pause();range.value=String(mode==='normalized'?n/max*Number(range.max||1000):n);range.dispatchEvent(new Event('input',{bubbles:true}));range.dispatchEvent(new Event('change',{bubbles:true}));error.textContent='';if(temporal)box.open=false;sync();}catch(e){error.textContent=e.message;}}
  apply.addEventListener('click',commit);field.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit();}});adapters.set(range,sync);sync();
 }
 function scan(){for(const range of $$('input[type=range]'))protectRange(range);}
 // Painted timelines remain useful as maps. Use their item list or explicit Go field.
 for(const canvas of $$('canvas[role=slider]'+(tool==='sxlock'?',canvas#timeline':''))){canvas.dataset.gsReadonlyTimeline='true';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',(canvas.getAttribute('aria-label')||'Timeline').replace(/ · seek paused|; tap to seek/g,'')+' (read-only)');canvas.tabIndex=-1;for(const name of ['pointerdown','mousedown','touchstart','click','keydown'])canvas.addEventListener(name,e=>{e.stopImmediatePropagation();if(name==='click'||name==='keydown')e.preventDefault();},true);}
 scan();let last=0;
 function refresh(time){if(time-last>120){for(const [range,sync]of adapters)if(range.isConnected)sync();last=time;}requestAnimationFrame(refresh);}requestAnimationFrame(refresh);
 new MutationObserver(()=>scan()).observe(document.body,{subtree:true,childList:true});
 // Native media controls contain draggable seek bars. Keep review clips deliberate too.
 function protectNativeVideos(){for(const video of $$('video[controls]')){
  video.controls=false;const controls=document.createElement('div'),play=document.createElement('button'),progress=document.createElement('progress');controls.className='gs-inline-video-controls';play.type='button';play.textContent='Play';play.setAttribute('aria-label','Play or pause preview');progress.className='gs-progress gs-inline-video-progress';progress.max=1;progress.value=0;progress.setAttribute('aria-label','Preview position (read-only)');controls.append(play);video.after(progress,controls);play.onclick=()=>{if(video.paused){if(!video.ended)video.play().catch(()=>{});}else video.pause();};video.addEventListener('play',()=>play.textContent='Pause');video.addEventListener('pause',()=>play.textContent='Play');video.addEventListener('timeupdate',()=>{progress.value=video.duration>0?video.currentTime/video.duration:0;});
 }}
 if(tool==='framelock'&&nativeVideo){nativeVideo.controls=false;const progress=document.createElement('progress');progress.className='gs-progress';progress.max=1;progress.value=0;nativeVideo.after(progress);nativeVideo.addEventListener('timeupdate',()=>progress.value=nativeVideo.duration>0?nativeVideo.currentTime/nativeVideo.duration:0);const seek=document.createElement('details'),summary=document.createElement('summary'),row=document.createElement('div'),input=document.createElement('input'),go=document.createElement('button');seek.className='gs-precision';summary.textContent='Go to frame';row.className='gs-set-row';input.type='number';input.inputMode='numeric';input.min='0';input.value='0';input.setAttribute('aria-label','Go to frame');go.textContent='Go';go.type='button';row.append(input,go);seek.append(summary,row);progress.after(seek);go.onclick=()=>{const state=window.toolsHubState?.(),fps=state?.fps,n=Number(input.value);if(fps&&Number.isInteger(n)&&n>=0&&n<Math.ceil(nativeVideo.duration*fps)){nativeVideo.pause();nativeVideo.currentTime=n/fps;seek.open=false;}};}
 protectNativeVideos();new MutationObserver(protectNativeVideos).observe(document.body,{subtree:true,childList:true});
}
