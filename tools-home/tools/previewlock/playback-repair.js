/* R28: exact-file first, catalog second. No credential or source-media changes. */
(()=>{
 let selection=0,selectedAsset=null,deliveryMap={},localURL='';
 const status=text=>$('playbackStatus').textContent=text;
 const controls=['play','stop','minus5','minus1','plus1','plus5'];
 const enable=on=>controls.forEach(id=>$(id).disabled=!on);
 const requested=()=>new URLSearchParams(location.search).get('open')||sessionStorage.getItem('previewlock_pending_open')||'';
 const safeName=name=>name&&!/[\\/\x00-\x1f]/.test(name)&&/\.mp4$/i.test(name);
 const target=name=>({name,path_display:'/Grill Sergeant/Timmy Motion Library/'+name});
 const fallback=name=>{const d=deliveryMap[name],a=$('savedCopy');a.hidden=!d?.savedCopy;if(d?.savedCopy)a.href=d.savedCopy;};
 fetch('deliveries.json?v=R28').then(r=>r.ok?r.json():{}).then(d=>{deliveryMap=d;fallback(requested()||selectedAsset?.name)}).catch(()=>{});
 const originalApi=api;
 api=(endpoint,opt={})=>originalApi(endpoint,{...opt,signal:opt.signal?AbortSignal.any([opt.signal,AbortSignal.timeout(65000)]):AbortSignal.timeout(65000)});
 playVideo=async()=>{if(!v.getAttribute('src'))return status('Choose a video first.');try{await v.play();status('')}catch(e){status(e.name==='NotAllowedError'?'Video ready — tap Play.':'Could not start playback. Tap Reload or Open saved video.')}};
 const showSource=(source,name)=>{v.src=source;v.load();$('fileName').textContent=name;enable(true);playVideo();};
 select=async(f)=>{
  selectedAsset=f;const turn=++selection;path=f.path_display;$('fileName').textContent=f.name;status('Loading video…');fallback(f.name);enable(false);$('download').disabled=true;
  try{const d=await api('/api/playback?path='+encodeURIComponent(f.path_display));if(turn!==selection)return;url=d.url;showSource(url,f.name);$('download').disabled=false;projectIds.add(f.path_display);saveProject();renderLibrary();}
  catch(e){if(turn!==selection)return;status('Video could not load. '+(e.message==='unauthorized'?'This browser needs your existing Dropbox connection.':'Try Reload; the original is saved.'));}
 };
 load=async()=>{
  const name=requested();fallback(name);
  if(!key){signal('offline');status(name?'This browser is not connected to Dropbox. Use Open saved video to watch this preview.':'Connect to Dropbox or preview a video from your device.');$('message').textContent='Dropbox connection is private to each browser.';return;}
  request=new AbortController();const controller=request;signal('busy');$('message').textContent='Loading library…';
  // Direct-open never waits for the recursive library or its thumbnail requests.
  if(safeName(name))await select(libraryFiles.find(f=>f.name.toLowerCase()===name.toLowerCase())||target(name));
  try{const d=await api('/api/assets',{signal:controller.signal});if(!key)return;libraryFiles=(d.entries||[]).filter(f=>f['.tag']==='file'&&/\.mp4$/i.test(f.name)&&!f.path_display.startsWith('/Grill Sergeant/PreviewLock Archive/'));
   for(const f of libraryFiles){if(/(?:ASPECTLOCK|_FLAT(?:TENED)?_|_PHASE[0-9]+_)/i.test(f.name)&&!projectIds.has(f.path_display)&&!JSON.parse(localStorage.getItem('previewlock_excluded_auto_v1')||'[]').includes(f.path_display))projectIds.add(f.path_display)}saveProject();
   connected=true;signal('online');renderLibrary();$('message').textContent='';
   if(name&&v.readyState>=1)sessionStorage.removeItem('previewlock_pending_open');
  }catch(e){if(e.name!=='AbortError'){$('message').textContent='Library unavailable; the selected video can still play. Tap Connect to retry.';if(!v.getAttribute('src'))signal('offline');}}
  finally{if(request===controller)request=null;}
 };
 $('retryPlayback').onclick=()=>{if(selectedAsset)select(selectedAsset);else load();};
 $('play').setAttribute('aria-label','Play or pause video');$('stop').setAttribute('aria-label','Pause video');
 for(const [id,label] of [['minus5','Back five frames'],['minus1','Back one frame'],['plus1','Forward one frame'],['plus5','Forward five frames']])$(id).setAttribute('aria-label',label);
 $('play').onclick=()=>v.paused?playVideo():v.pause();
 v.addEventListener('play',()=>{$('play').textContent='Ⅱ';status('')});v.addEventListener('pause',()=>{$('play').textContent='▶'});
 v.addEventListener('loadeddata',()=>{enable(true);if(v.paused)status('Video ready — tap Play.');else status('')});
 v.addEventListener('error',()=>{if(v.getAttribute('src'))status('Video playback failed. Tap Reload or Open saved video.');});
 // Device preview is local-only; it does not upload or replace a cloud original.
 const input=document.createElement('input');input.type='file';input.accept='video/mp4,video/webm';input.id='localPreview';input.setAttribute('aria-label','Preview video from device');
 const label=document.createElement('label');label.textContent='Preview from device';label.append(input);$('importPanel').append(label);
 input.onchange=()=>{const file=input.files?.[0];if(!file)return;++selection;if(localURL)URL.revokeObjectURL(localURL);localURL=URL.createObjectURL(file);selectedAsset=null;path='';url=localURL;fallback('');$('download').disabled=true;showSource(localURL,file.name);};
 enable(Boolean(v.getAttribute('src')));
 if(!key)load();
})();
