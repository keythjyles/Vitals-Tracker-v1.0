'use strict';
(()=>{
const $=id=>document.getElementById(id),video=$('video'),KEY='sxlock-project-v1',SR=48000;
const definitions=[
['rimshot','Drums','Rimshot','snare',.22],['badum','Drums','Ba-dum-tss','badum',1.1],['cymbal','Drums','Cymbal crash','cymbal',2],['hat','Drums','Closed hi-hat','hat',.12],['wood','Drums','Woodblock','wood',.14],['timpani','Drums','Timpani bump','timpani',.65],
['sad','Failure','Sad trombone · wah-wah','sad',2.3],['wah','Failure','Short wah','wah',.65],['buzzer','Failure','Wrong-answer buzzer','buzzer',.6],['failbell','Failure','Losing bell','failbell',1.1],['down','Failure','Descending whistle','down',.7],['deflate','Failure','Deflating balloon','deflate',.8],
['scratch','Surprise','Record scratch','scratch',.45],['sting','Surprise','Dramatic sting','sting',.8],['boing','Surprise','Boing','boing',.7],['pop','Surprise','Pop','pop',.09],['spring','Surprise','Spring wobble','spring',1],['brake','Surprise','Screech stop','brake',.5],
['crow','Nature','Crow-style caw','crow',.65],['cricket','Nature','Cricket chirps','cricket',1.6],['owl','Nature','Owl-style hoot','owl',1.2],['frog','Nature','Frog-style croak','frog',.55],['duck','Nature','Duck-style quack','duck',.45],['wind','Nature','Lonely wind','wind',2.5],
['ding','Punctuation','Single ding','ding',1],['bell','Punctuation','Small bell','bell',1.4],['triangle','Punctuation','Triangle ting','triangle',1.6],['up','Punctuation','Rising slide whistle','up',.6],['tada','Punctuation','Tiny ta-da','tada',1.2],['plop','Punctuation','Water plop','plop',.22],['knock','Punctuation','Two knocks','knock',.6],['tick','Punctuation','Clock tick-tock','tick',1.2]
];
const retained=new Set(['cricket','up','down']);
const sounds=new Map(definitions.map(([id,category,name,type,duration])=>[id,{id,category:retained.has(id)?'Kept sounds':category,name,type,duration,builtin:true,hidden:!retained.has(id)}]));
let clips=[],ctx,master,bedGain,analyser,sourceNode,videoFile=null,videoURL=null,active=[],auditions=[],recording=false,recorder=null,cancelled=false,recordDest=null,exported=null,exportURL=null,drawHandle=0,scheduleToken=0,dirtySave=null,lock=null,draft=null,auditionGain=null,libraryReady,projectReady=false,exportBusy=false,auditionToken=0,audioPump=null,cacheClock=0;
const scheduled=new Set(),compressed=new Map(),PCM_BUDGET=24*1024*1024,COMPRESSED_BUDGET=8*1024*1024,LOOKAHEAD=8;
let cleanupExport=null,exportPhase=null;
const savedCustom=new Set(),savedVideos=new Set(),savedRecordings=new Set();let videoRef=null,recoveryQueue=Promise.resolve(),recoveryRevision=0,recoveryPending=0,restoredPlayhead=0;
const health={version:"R41",errors:[]};try{health.errors=JSON.parse(localStorage.getItem(KEY+"-health")||"null")?.errors?.slice(-12)||[]}catch{}
let sourceDuration=0,sourceReady=Promise.resolve(),sourceLoadToken=0;
const num=(v,min=0,max=Infinity)=>Math.max(min,Math.min(max,Number(v)||0));
const stamp=t=>`${Math.floor(t/60)}:${(t%60).toFixed(3).padStart(6,'0')}`;
const message=t=>$('status').textContent=t;
const uid=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
async function audioContext(){if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)({sampleRate:SR});master=ctx.createGain();analyser=ctx.createAnalyser();analyser.fftSize=512;master.connect(analyser);master.connect(ctx.destination);bedGain=ctx.createGain();bedGain.connect(master);sourceNode=ctx.createMediaElementSource(video);sourceNode.connect(bedGain);updateBed()}await ctx.resume();return ctx}
function releaseNode(n){n.onended=null;try{n.disconnect()}catch{}try{n._gain?.disconnect()}catch{}try{n.buffer=null}catch{}n._gain=null;n._clip=null;for(const list of [active,auditions]){const i=list.indexOf(n);if(i>=0)list.splice(i,1)}}
function stopNodes(list){for(const n of [...list]){try{n.stop()}catch{}releaseNode(n)}list.length=0}
let currentAuditionId=null;
function stopAuditions(){currentAuditionId=null;auditionToken++;stopNodes(auditions);auditionGain=null;if($('libraryNowPlaying'))$('libraryNowPlaying').textContent='Preview stopped.'}
function stopEffects(){scheduleToken++;clearTimeout(audioPump);audioPump=null;scheduled.clear();stopNodes(active)}
function trimDecoded(except){const entries=[...sounds.values()].filter(s=>s.buffer);let total=entries.reduce((n,s)=>n+s.buffer.length*s.buffer.numberOfChannels*4,0);for(const item of entries.sort((a,b)=>(a._lastUse||0)-(b._lastUse||0))){if(total<=PCM_BUDGET)break;if(item.id===except||item.loading)continue;total-=item.buffer.length*item.buffer.numberOfChannels*4;item.buffer=null}}
function rememberBytes(key,bytes){compressed.delete(key);compressed.set(key,bytes);let total=[...compressed.values()].reduce((n,a)=>n+a.byteLength,0);for(const [id,b] of compressed){if(total<=COMPRESSED_BUDGET)break;if(id===key)continue;total-=b.byteLength;compressed.delete(id)}}
async function recordedBytes(sound){const key=sound.sha256||sound.id;if(compressed.has(key)){const bytes=compressed.get(key);rememberBytes(key,bytes);return bytes.buffer.slice(0)}let cached;try{cached=await readRecording(sound)}catch{}let bytes;if(!cached&&sound.origin==='scrubber'){const blob=await window.GSApprovedEffects.blob(sound);bytes=new Uint8Array(await blob.arrayBuffer());try{await cacheRecording(sound,to64(bytes))}catch{}rememberBytes(key,bytes);return bytes.buffer.slice(0)}if(cached)bytes=from64(cached);else{let soundUrl=sound.url;if(soundUrl.startsWith('dropbox:')){const key=localStorage.getItem('gs_previewlock_key')||'';if(!key)throw Error('Connect PreviewLock on this browser to load this sound.');const lookup=await fetch('https://gs-previewlock-api.onrender.com/api/playback?path='+encodeURIComponent(soundUrl.slice(8)),{headers:{Authorization:'Bearer '+key}});if(!lookup.ok)throw Error('Bee sound lookup failed: '+lookup.status);soundUrl=(await lookup.json()).url}const response=await fetch(soundUrl);if(!response.ok)throw Error('Could not load '+sound.name+'. Check your connection.');bytes=new Uint8Array(await response.arrayBuffer());try{await cacheRecording(sound,to64(bytes))}catch{}}rememberBytes(key,bytes);return bytes.buffer.slice(0)}
async function prepareWindow(at=0){const ids=[...new Set(clips.filter(c=>c.enabled&&c.volume>0&&c.start<=at+LOOKAHEAD&&c.start+c.duration>at).map(c=>c.soundId))];for(const id of ids)await buffer(id,ctx)}
async function prepareExportFiles(){for(const id of new Set(clips.filter(c=>c.enabled).map(c=>c.soundId))){if(cancelled)throw Error('Export cancelled.');const sound=sounds.get(id);if(sound?.recording)await recordedBytes(sound)}}
function seedNoise(seed){let x=seed;return()=>{x=(1664525*x+1013904223)>>>0;return x/2147483648-1}}
function synth(sound,ac){const b=ac.createBuffer(1,Math.ceil(sound.duration*SR),SR),d=b.getChannelData(0),noise=seedNoise(781+sound.id.length*37);let low=0,last=0;const wave=(f,t)=>Math.sin(2*Math.PI*f*t),env=(t,decay=10)=>t<0?0:Math.exp(-t*decay)*Math.min(1,t*700);
for(let i=0;i<d.length;i++){const t=i/SR,n=noise();low+=.025*(n-low);const high=n-last;last=n;let y=0;
switch(sound.type){
case 'snare':y=(high*.45+wave(170,t)*.4)*env(t,28);break;
case 'badum':{const q=t<.16?t:t<.36?t-.18:t-.38;y=t<.36?(wave(t<.16?150:105,q)*.8+n*.18)*env(q,24):high*.35*env(q,7);break}
case 'cymbal':y=(high*.28+[319,443,601,857,1139].reduce((v,f)=>v+Math.sign(wave(f,t))*.035,0))*env(t,2.8);break;
case 'hat':y=high*.3*env(t,46);break;
case 'wood':y=(wave(780,t)+wave(1200,t)*.3)*.5*env(t,38);break;
case 'timpani':y=(wave(75,t)+wave(115,t)*.3)*.65*env(t,9);break;
case 'sad':{const j=Math.min(3,Math.floor(t/.5)),q=t-j*.5,f=[233,220,196,146.83][j],e=Math.min(1,q/.035)*Math.min(1,(.5-q)/.07);y=[1,2,3,4,5].reduce((v,h)=>v+wave(f*h,t)*(1/h),0)*.22*Math.max(0,e)*(j===3?Math.max(0,1-(t-1.5)/.8):1);break}
case 'wah':{const f=185-60*t/sound.duration;y=(wave(f,t)+wave(f*2,t)*.4+wave(f*3,t)*.2)*Math.sin(Math.PI*t/sound.duration)*.45;break}
case 'buzzer':y=(Math.sign(wave(100,t))*.35+Math.sign(wave(150,t))*.15)*Math.min(1,t*80)*Math.min(1,(sound.duration-t)*30);break;
case 'failbell':y=(wave(420-100*t,t)+wave(620-160*t,t)*.3)*.4*env(t,4);break;
case 'down':y=wave(1600*t-800*t*t,1)*Math.sin(Math.PI*t/.7)*.45;break;
case 'deflate':y=(high*.13+wave(350-130*t+30*wave(14,t),t)*.3)*Math.sin(Math.PI*t/.8);break;
case 'scratch':y=(n*.23+wave(650+450*wave(6,t),t)*.4)*Math.sin(Math.PI*t/.45);break;
case 'sting':y=(wave(146.83,t)+wave(155.56,t)+wave(220,t))*.18*env(t,5);break;
case 'boing':case 'spring':y=wave(170+100*Math.exp(-5*t)*wave(12,t),t)*.6*env(t,5);break;
case 'pop':y=wave(900-6000*t,t)*.7*env(t,60);break;
case 'brake':y=(wave(1500+220*wave(23,t),t)*.3+high*.12)*Math.sin(Math.PI*t/.5);break;
case 'crow':{const e=Math.pow(Math.max(0,Math.sin(Math.PI*t/.65)),1.7);y=(wave(570+55*wave(19,t),t)*.3+wave(1140,t)*.12+n*.14)*e;break}
case 'cricket':{const q=t%.32;y=wave(4200,t)*Math.max(0,Math.sin(2*Math.PI*24*t))*.35*(q<.16?1:0);break}
case 'owl':y=(wave(390,t)+wave(780,t)*.12)*.48*Math.pow(Math.max(0,Math.sin(Math.PI*(t%.6)/.6)),3);break;
case 'frog':y=(wave(110+35*wave(26,t),t)+wave(220,t)*.4)*.4*Math.sin(Math.PI*t/.55);break;
case 'duck':y=(Math.sign(wave(330-180*t,t))*.15+wave(660-300*t,t)*.2+n*.04)*Math.sin(Math.PI*t/.45);break;
case 'wind':y=low*.9*Math.sin(Math.PI*t/2.5);break;
case 'ding':case 'bell':case 'triangle':{const f=sound.type==='triangle'?1900:sound.type==='bell'?980:1320;y=(wave(f,t)*.5+wave(f*2.76,t)*.14+wave(f*4.1,t)*.06)*env(t,4);break}
case 'up':y=wave(450*t+850*t*t,1)*.45*Math.sin(Math.PI*t/.6);break;
case 'tada':{const q=t<.3?t:t-.32,f=t<.3?392:523.25;y=(wave(f,t)+wave(f*1.25,t)*.5+wave(f*1.5,t)*.5)*.25*Math.max(0,Math.min(1,q*45))*Math.min(1,(1.2-t)*5);break}
case 'plop':y=wave(700*Math.exp(-14*t),t)*.7*env(t,18);break;
case 'knock':{const q=t<.25?t:t-.28;y=(wave(220,q)+low*2)*.7*(q>=0?env(q,40):0);break}
case 'tick':{const q=t%.5;y=wave(t<.5?1300:1050,q)*.65*env(q,120);break}
}d[i]=Math.max(-.8,Math.min(.8,y||0))}return b}
async function buffer(id,ac){const sound=sounds.get(id);if(!sound)throw Error('Sound missing: '+id);sound._lastUse=++cacheClock;if(sound.buffer)return sound.buffer;if(sound.loading)return sound.loading;sound.loading=(async()=>{let decoded;if(sound.recording)decoded=await ac.decodeAudioData(await recordedBytes(sound));else if(sound.builtin)decoded=synth(sound,ac);else if(sound.data)decoded=await ac.decodeAudioData(from64(sound.data).buffer);else throw Error('Reload recording '+sound.name);sound.buffer=decoded;trimDecoded(id);return decoded})();try{return await sound.loading}finally{sound.loading=null;trimDecoded(id)}}
async function loadLibrary(){const response=await fetch('library.json?v=1.7');if(!response.ok)throw Error('Recorded library could not load. Reload when connected.');const manifest=await response.json();for(const sound of manifest.sounds){if(!/^rec-[a-z0-9-]+$/.test(sound.id)||!/^sounds\/[a-z0-9-]+\.mp3$/.test(sound.url))continue;sounds.set(sound.id,{...sound,builtin:true,recording:true})}sounds.set('rec-bee-swarm-buzz-10s',{id:'rec-bee-swarm-buzz-10s',name:'Bee Swarm Buzz · 10s',category:'Nature',duration:10,url:'dropbox:/Grill Sergeant/Animation Lab/GS_EP4/GS_SX_Bee_Swarm_Buzz_10S_v01.wav',builtin:true,recording:true});$('libraryInfo').textContent=manifest.sounds.length+' hosted sounds · 1 connected bee recording';const credits=$('credits');for(const sound of manifest.sounds){const p=document.createElement('p'),a=document.createElement('a');a.href=sound.source;a.target='_blank';a.rel='noopener';a.textContent=sound.name+' — '+sound.author;p.append(a,document.createTextNode(' · '+(sound.license||'License not specified')));credits.append(p)}}
// Discover actual uploaded recordings from the public repository folder on each load.
// No hardcoded per-file manifest edits are required. The directory must contain real files.
async function discoverEffectDirectory(){
 const endpoint='https://api.github.com/repos/keythjyles/Vitals-Tracker-v1.0/contents/tools-home/tools/sxlock/sounds/incoming';
 try{
  const response=await fetch(endpoint,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
  if(response.status===404)return 0;
  if(!response.ok)throw Error('Directory lookup HTTP '+response.status);
  const entries=await response.json();if(!Array.isArray(entries))return 0;
  let added=0;
  for(const file of entries){
   if(file.type!=='file'||!/^[-_a-zA-Z0-9.]+\.(wav|mp3|m4a)$/i.test(file.name)||!file.download_url)continue;
   const id='rec-dir-'+file.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
   if(sounds.has(id))continue;
   sounds.set(id,{id,name:file.name.replace(/\.[^.]+$/,'').replace(/_/g,' '),category:'Imported recordings',author:'GS production library',source:file.html_url,license:'User-provided / verify per recording',url:file.download_url,sha256:file.sha||id,builtin:true,recording:true});
   added++;
  }
  return added;
 }catch(e){console.warn('SxLock directory discovery unavailable',e);return 0}
}
async function readRecording(s){const d=await db();try{return await new Promise((resolve,reject)=>{const r=d.transaction('recordings').objectStore('recordings').get(s.sha256);r.onsuccess=()=>resolve(r.result?.data);r.onerror=()=>reject(r.error)})}finally{d.close()}}
async function cacheRecording(s,data){const d=await db();try{await new Promise((resolve,reject)=>{const tx=d.transaction('recordings','readwrite');tx.objectStore('recordings').put({id:s.sha256,data});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}finally{d.close()}}
function from64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
function to64(a){let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s)}
async function audition(id,volume=65,loop=false){if(currentAuditionId===id&&auditions.length){stopAuditions();message('Preview paused: '+(sounds.get(id)?.name||id));return false;}stopAuditions();currentAuditionId=id;const token=auditionToken,ac=await audioContext(),b=await buffer(id,ac);if(token!==auditionToken||exportBusy)return false;const n=ac.createBufferSource(),g=ac.createGain();n.buffer=b;n._gain=g;g.gain.value=num(volume,0,100)/100;n.loop=loop;n.connect(g).connect(ac.destination);auditions.push(n);auditionGain=g;n.onended=()=>{if(auditionGain===g)auditionGain=null;if(currentAuditionId===id)currentAuditionId=null;releaseNode(n);if($('libraryNowPlaying'))$('libraryNowPlaying').textContent='Preview finished.'};n.start();if(!loop)n.stop(ac.currentTime+b.duration);message('Audition: '+sounds.get(id).name);return true}
function clipWindow(c,b,at=0,end=Infinity){
 const sample=x=>Math.round(x*SR),offset=sample(c.offset),region=sample(b.duration)-offset;
 if(region<=0)return null;
 const start=sample(c.start),length=Math.min(sample(c.duration),c.loop?Infinity:region,Number.isFinite(end)?sample(end)-start:Infinity);
 const elapsed=Math.max(0,sample(at)-start);if(length<=elapsed||c.volume<=0)return null;
 return {when:Math.max(0,start-sample(at))/SR,offset:(offset+(c.loop?elapsed%region:elapsed))/SR,
  remaining:(length-elapsed)/SR,loopStart:offset/SR,loopEnd:sample(b.duration)/SR};
}
function placeSource(ac,c,b,destination,at=0,anchor=0,end=Infinity){const w=clipWindow(c,b,at,end);if(!w)return null;const n=ac.createBufferSource(),g=ac.createGain();n.buffer=b;n._gain=g;n.loop=!!c.loop;if(c.loop){n.loopStart=w.loopStart;n.loopEnd=w.loopEnd}g.gain.value=c.volume/100*busLevel(c);n._clip=c;n.connect(g).connect(destination);n.onended=()=>releaseNode(n);n.start(anchor+w.when,w.offset);n.stop(anchor+w.when+w.remaining);return n}
async function schedule(){stopEffects();const token=scheduleToken;if(!ctx||activeCamera||!mixPlaying()||video.seeking)return;async function pump(){if(token!==scheduleToken||!mixPlaying()||video.seeking)return;const at=currentTime(),pending=clips.filter(c=>c.enabled&&c.volume>0&&!scheduled.has(c.id)&&c.start<=at+LOOKAHEAD&&c.start+c.duration>at).sort((a,b)=>a.start-b.start);for(const c of pending){const b=await buffer(c.soundId,ctx);if(token!==scheduleToken||!mixPlaying()||video.seeking)return;const n=placeSource(ctx,c,b,master,currentTime(),ctx.currentTime,duration());scheduled.add(c.id);if(n)active.push(n)}if(token===scheduleToken&&mixPlaying())audioPump=setTimeout(()=>pump().catch(e=>{recordIssue('playback',e);message(e.message);pauseForEdit();if(exportBusy){cancelled=true;if(recorder?.state==='recording')recorder.stop()}}),1000)}await pump()}
function snapshot(portable=false){return {schema:'SxLock-1.0',version:'1.8',sourceFps:num($('sourceFps').value,1,120),video:videoFile?.name||$('videoName').dataset.expected||null,videoRef,playheadSeconds:videoFile?currentTime():restoredPlayhead,videoVolume:num($('bed').value,0,100),mixer:{effects:num($('effectsBus').value,0,100),voice:num($('voiceBus').value,0,100)},toolbox:toolboxState(),filename:$('filename').value,recordings:[...sounds.values()].filter(s=>s.recording&&(clips.some(c=>c.soundId===s.id)||toolbox?.sounds.has(s.id))).map(({buffer,loading,_lastUse,...s})=>s),notes:$('notes').value,export:{fps:num($('fps').value,1,60),size:$('size').value},clips:clips.map(c=>({...c})),sounds:[...sounds.values()].filter(s=>!s.builtin).map(s=>({id:s.id,name:s.name,category:'My sounds',duration:s.duration,builtin:false,origin:s.origin||'import',mimeType:s.mimeType||null,capture:s.capture||null,...(portable?{data:s.data}:{})}))}}
function recoveryStatus(text,failed=false){$('recoveryStatus').textContent=text;$('recoveryStatus').classList.toggle('save-warning',failed)}
function flushProject(){clearTimeout(dirtySave);if(!projectReady||!sxSessionActive)return recoveryQueue;const state=snapshot();state.savedAt=Date.now();const rev=++recoveryRevision,source=videoFile,sourceId=videoRef,linked=new Map(toolbox?.files()||[]),custom=[...sounds.values()].filter(s=>!s.builtin).map(customRecord);try{const next=JSON.stringify(state),previous=localStorage.getItem(KEY);if(previous&&previous!==next)localStorage.setItem(KEY+'-previous',previous);localStorage.setItem(KEY,next)}catch(e){recordIssue('metadata-autosave',e)}recoveryPending++;recoveryStatus('Saving project and assets…');recoveryQueue=recoveryQueue.catch(()=>{}).then(()=>persistRecovery(state,source,sourceId,custom,linked)).then(()=>{if(rev===recoveryRevision)recoveryStatus(state.video?'Saved locally · video and project assets':'Saved locally · audio and project assets')}).catch(e=>{recordIssue('asset-autosave',e);if(rev===recoveryRevision)recoveryStatus('Recovery incomplete: '+e.message+' Save a project backup and keep original media.',true)}).finally(()=>{recoveryPending--});return recoveryQueue}
function saveLocal(){return flushProject()}
async function persistRecovery(state,source,sourceId,custom,linked){
 if(state.video&&(!source||!sourceId))throw Error('Select '+state.video+' once to retain the video.');
 for(const sound of custom)if(!sound.data)throw Error('Audio missing: '+(sounds.get(sound.id)?.name||sound.id)+'.');
 const recorded=[];for(const sound of state.recordings){const key=sound.sha256;if(!key)throw Error('Recording identity missing.');if(!savedRecordings.has(key))recorded.push({id:key,data:to64(new Uint8Array(await recordedBytes(sound)))})}
 const pending=custom.filter(s=>!savedCustom.has(s.id)),saveVideo=source&&sourceId&&!savedVideos.has(sourceId),d=await db();
 try{await new Promise((resolve,reject)=>{const tx=d.transaction(['projects','videos','sounds','recordings'],'readwrite');if(saveVideo)tx.objectStore('videos').put({id:sourceId,blob:source,name:source.name,type:source.type,lastModified:source.lastModified,size:source.size});for(const sound of pending)tx.objectStore('sounds').put(sound);for(const sound of recorded)tx.objectStore('recordings').put(sound);for(const [id,file]of linked)if(!savedVideos.has('toolbox-'+id))tx.objectStore('videos').put({id:'toolbox-'+id,blob:file});tx.objectStore('projects').put({id:'current',state});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Browser storage failed.'));tx.onabort=()=>reject(tx.error||Error('Browser storage is full or unavailable.'))});if(saveVideo)savedVideos.add(sourceId);for(const id of linked.keys())savedVideos.add('toolbox-'+id);pending.forEach(s=>savedCustom.add(s.id));recorded.forEach(s=>savedRecordings.add(s.id))}finally{d.close()}
}
async function readStored(store,id){const d=await db();try{return await new Promise((resolve,reject)=>{const r=d.transaction(store).objectStore(store).get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}finally{d.close()}}
async function restoreAssets(state){
 const missingFiles=[];
 for(const file of state.toolbox?.files||[]){
  if(typeof file?.id!=='string')continue;
  const row=await readStored('videos','toolbox-'+file.id);
  if(row?.blob&&row.blob.size===file.size){
   toolbox.restoreFile(file.id,new File([row.blob],file.name,{type:file.type,lastModified:file.lastModified}));
   savedVideos.add('toolbox-'+file.id);
  }else missingFiles.push(file);
 }
 toolbox.restoreMissingFiles(missingFiles);visualLayer?.reconnect();selectLatestVideoRecording(state.toolbox?.lastCameraId);
 refreshToolbox();

 for(const sound of state.recordings||[]){const row=await readStored('recordings',sound.sha256);if(row?.data)savedRecordings.add(sound.sha256);else{const data=to64(new Uint8Array(await recordedBytes(sound)));await cacheRecording(sound,data);savedRecordings.add(sound.sha256)}}
 await restoreCustom();selectLatestRecording(state.videoRef);

const missing=[...sounds.values()].filter(s=>!s.builtin&&!s.hidden&&!s.data);if(missing.length)throw Error('Reload missing audio: '+missing.map(s=>s.name).join(', '));
 if(state.video){if(!state.videoRef)throw Error('Select '+state.video+' once to enable complete recovery.');const row=await readStored('videos',state.videoRef);if(!row?.blob)throw Error('Reload the original video: '+state.video);if(row.name!==state.video||row.blob.size!==row.size)throw Error('Stored video does not match this project.');savedVideos.add(row.id);await loadVideo(new File([row.blob],row.name,{type:row.type||row.blob.type,lastModified:row.lastModified}),{restoring:true,ref:row.id});}
}
function recordIssue(stage,error){health.errors.push({time:new Date().toISOString(),stage,message:String(error?.message||error).slice(0,500)});health.errors=health.errors.slice(-12);try{localStorage.setItem(KEY+'-health',JSON.stringify(health))}catch{}}
function savePhase(phase){exportPhase=phase;try{if(phase)localStorage.setItem(KEY+'-export',JSON.stringify({phase,time:new Date().toISOString()}));else localStorage.removeItem(KEY+'-export')}catch{}}
async function runExport(kind,job){if(liveTake||activeCamera)return message('Stop the recording before exporting.');if(exportBusy)return message('An export is already running.');exportBusy=true;cancelled=false;flushProject();savePhase('Preparing '+kind);setBusy(true);try{await libraryReady;flushProject();await job()}catch(e){recordIssue(kind,e);message(e.message||String(e))}finally{try{cleanupExport?.()}catch(e){recordIssue('cleanup',e)}cleanupExport=null;savePhase(null);exportBusy=false;setBusy(false);trimDecoded();}}
async function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open('SxLock-media',3);let blocked=false;r.onupgradeneeded=()=>{for(const name of ['sounds','recordings','videos','projects'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,{keyPath:'id'})};r.onsuccess=()=>{if(blocked){r.result.close();return}r.result.onversionchange=()=>r.result.close();resolve(r.result)};r.onerror=()=>reject(r.error);r.onblocked=()=>{blocked=true;reject(Error('Close older SxLock tabs, then reload to update project storage.'))}})}
function customMetadata(s){return {id:s.id,name:s.name,category:'My sounds',duration:s.duration,builtin:false,origin:s.origin||'import',mimeType:s.mimeType||null,capture:s.capture||null}}
function customRecord(s){return {id:s.id,data:s.data,metadata:customMetadata(s)}}
async function saveCustom(){const pending=[...sounds.values()].filter(s=>!s.builtin&&s.data&&!savedCustom.has(s.id));if(!pending.length)return;const d=await db();try{await new Promise((res,rej)=>{const tx=d.transaction('sounds','readwrite'),store=tx.objectStore('sounds');for(const sound of pending)store.put(customRecord(sound));tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||Error('Audio storage failed.'))});pending.forEach(s=>savedCustom.add(s.id))}finally{d.close()}}
// The library survives a clean timeline, project switches, and older incomplete snapshots.
let recoveredScribes=[];
async function restoreCustomLibrary(states=[]){
 const d=await db();let rows,projects;
 try{[rows,projects]=await Promise.all(['sounds','projects'].map(store=>new Promise((resolve,reject)=>{const q=d.transaction(store).objectStore(store).getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})))}finally{d.close()}
 const metadata=new Map();
 const savedStates=[...projects.map(p=>p.state),...states].filter(Boolean).sort((a,b)=>(a.savedAt||0)-(b.savedAt||0));
 recoveredScribes=savedStates.map(({notes,video,savedAt})=>({notes,video,savedAt}));
 for(const state of savedStates)for(const sound of state.sounds||[])if(typeof sound.id==='string')metadata.set(sound.id,sound);
 for(const row of rows){
  if(typeof row.id!=='string'||typeof row.data!=='string'||!row.data)continue;
  const meta=row.metadata||metadata.get(row.id)||{id:row.id,name:'Recovered recording · '+row.id,duration:0};
  sounds.set(row.id,{...customMetadata({...meta,id:row.id}),data:row.data,buffer:null});
  // Enrich legacy rows on their next save, preserving their original audio bytes.
  if(row.metadata)savedCustom.add(row.id);
 }
 await saveCustom();
 selectLatestRecording();
 return rows.length;
}
async function restoreCustom(){for(const sound of sounds.values()){if(sound.builtin)continue;if(sound.data)continue;const row=await readStored('sounds',sound.id);if(row?.data){sound.data=row.data;savedCustom.add(sound.id)}}}
function restore(data){if(data.schema!=='SxLock-1.0')throw Error('This is not an SxLock project');if(!Array.isArray(data.clips)||data.clips.length>500)throw Error('Invalid insertion list');for(const panel of document.querySelectorAll('main .work-area, #scribeActions'))if(!panel.closest('#sxDockedSection'))panel.open=false;document.dispatchEvent(new Event('sxlock-before-scribe-replace'));pauseForEdit();if(videoURL)URL.revokeObjectURL(videoURL);videoURL=null;videoFile=null;tailTime=null;sourceFinished=false;sourceDuration=0;sourceLoadToken++;sourceReady=Promise.resolve();lastTakeId=null;selectedClipId=null;restoreToolbox(data.toolbox);videoRef=data.videoRef||null;restoredPlayhead=num(data.playheadSeconds);video.removeAttribute('src');video.load();video.hidden=true;$('audioOnly').hidden=false;delete $('videoName').dataset.expected;for(const [id,s]of sounds)if(!s.builtin&&s.hidden&&!s.data)sounds.delete(id);for(const s of data.recordings||[]){
 if(typeof s.id!=='string'||sounds.has(s.id))continue;
 const hosted=/^rec-[a-z0-9-]+$/.test(s.id)&&/^sounds\/[a-z0-9-]+\.mp3$/.test(s.url);
 const approved=s.origin==='scrubber'&&s.id==='scrubber-'+s.scrubberSourceId&&/^[a-f0-9]{64}$/.test(s.sha256||'');
 if(hosted||approved)sounds.set(s.id,{...s,builtin:true,recording:true,hidden:approved,buffer:null});
}for(const c of data.clips)if(!sounds.has(c.soundId))sounds.set(c.soundId,{id:c.soundId,name:'Unavailable sound · '+c.soundId,category:'Unavailable',hidden:true,builtin:false});for(const s of data.sounds||[])if(typeof s.id==='string'&&!sounds.get(s.id)?.builtin)sounds.set(s.id,{...sounds.get(s.id),...s,category:'My sounds',builtin:false,buffer:null});clips=data.clips.filter(c=>sounds.has(c.soundId)).map(c=>({id:typeof c.id==='string'?c.id:uid(),soundId:c.soundId,start:num(c.start),offset:num(c.offset),duration:num(c.duration,.001,3600),volume:num(c.volume,0,100),enabled:c.enabled!==false,loop:!!c.loop,...(c.append===true?{append:true}:{})}));$('sourceFps').value=String(data.sourceFps||25);$('notes').value=String(data.notes||'');$('bed').value=num(data.videoVolume??100,0,100);$('effectsBus').value=num(data.mixer?.effects??100,0,100);$('voiceBus').value=num(data.mixer?.voice??100,0,100);$('filename').value=String(data.filename||'SxLock_mix_v01');if(data.export){$('fps').value=String(data.export.fps||25);$('size').value=data.export.size||'original'}if(data.video&&!videoFile){$('videoName').textContent='Restoring video: '+data.video;$('videoName').dataset.expected=data.video}if(!data.video)$('videoName').textContent='Audio project · no video';document.dispatchEvent(new Event('sxlock-scribe-restored'));renderCategories();renderLibrary();renderClips();updateBed();updateMixer();updateTransport();}
function updateBed(){if(bedGain)bedGain.gain.value=activeCamera?0:num($('bed').value,0,100)/100;$('bedValue').textContent=$('bed').value+'%'}
function renderCategories(){for(const id of ['category','sheetCategory']){const sel=$(id),old=sel.value;sel.replaceChildren();for(const c of ['all',...[...new Set([...sounds.values()].filter(s=>!s.hidden).map(s=>s.category))].sort((a,b)=>a.localeCompare(b))])sel.add(new Option(c==='all'?'All sounds':c,c));if([...sel.options].some(o=>o.value===old))sel.value=old}}
let libraryView='all';
const favoriteSounds=new Set((()=>{try{return JSON.parse(localStorage.getItem('sxlock-favorites-v1')||'[]')}catch{return []}})());
const soundNamesKey='sxlock-sound-names-v1';
function readSoundNames(){try{const value=JSON.parse(localStorage.getItem(soundNamesKey)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}}
const soundNames=Object.assign(Object.create(null),readSoundNames());
function displaySoundName(sound){return Object.hasOwn(soundNames,sound.id)&&typeof soundNames[sound.id]==='string'?soundNames[sound.id]:sound.name}
function applySoundNames(){for(const sound of sounds.values())sound.name=displaySoundName(sound)}

async function renameSound(id,value){
 const sound=sounds.get(id);
 if(!sound||recording||exportBusy)return;
 const proposed=value??window.prompt('Sound name',sound.name);
 if(proposed===null)return;
 let name=proposed.trim();
 if(!name||name.length>170||/[\\/<>:"|?*\x00-\x1f]/.test(name))throw Error('Enter a sound name without slashes or control characters.');
 const extension=sound.name.match(/\.[a-z0-9]{2,5}$/i)?.[0];
 if(extension&&!name.toLowerCase().endsWith(extension.toLowerCase()))name+=extension;
 if(name===sound.name)return;
 const previous=sound.name,oldAlias=Object.hasOwn(soundNames,id)?soundNames[id]:null;
 localStorage.setItem(soundNamesKey,JSON.stringify({...readSoundNames(),[id]:name}));
 soundNames[id]=name;
 sound.name=name;
 try{
  if(!sound.builtin&&sound.data){savedCustom.delete(id);await saveCustom()}
 }catch(error){
  sound.name=previous;
  const names=readSoundNames();
  if(oldAlias){names[id]=oldAlias;soundNames[id]=oldAlias}
  else{delete names[id];delete soundNames[id]}
  localStorage.setItem(soundNamesKey,JSON.stringify(names));
  throw error;
 }
 if(draft?.soundId===id&&$('effectSheet').open){
  $('selectedName').textContent=name;$('selectedName').setAttribute('aria-label','Rename '+name);
  $('sheetStatus').textContent='Name saved.';
 }
 if(currentAuditionId===id)$('libraryNowPlaying').textContent='Playing: '+name;
 if($('toolboxSheet').open)$('toolboxStatus').textContent='Name saved.';
 renderLibrary();renderClips();refreshToolbox();flushProject();
}
window.addEventListener('storage',event=>{
 if(event.key!==soundNamesKey)return;
 Object.assign(soundNames,readSoundNames());
 applySoundNames();
 if(draft?.soundId&&$('effectSheet').open){
  const name=sounds.get(draft.soundId)?.name;
  if(name){$('selectedName').textContent=name;$('selectedName').setAttribute('aria-label','Rename '+name)}
 }
 renderLibrary();renderClips();refreshToolbox();
});

function soundNameButton(sound){
 const label=document.createElement('button');
 label.type='button';label.className='sx-sound-name';label.textContent=sound.name;
 label.title='Tap to rename';label.setAttribute('aria-label','Rename '+sound.name);
 label.disabled=recording||exportBusy;
 label.onclick=guard(()=>renameSound(sound.id));
 return label;
}

function matchesSound(s,cat,q){const text=[s.name,s.category,...(s.tags||[])].join(' ').toLowerCase();return !s.hidden&&(cat==='all'||s.category===cat)&&(!q||q.split(/\s+/).every(word=>text.includes(word)))&&(libraryView!=='favorites'||favoriteSounds.has(s.id))&&(libraryView!=='new'||s.addedIn==='1.7'||s.origin==='scrubber')}
function soundButtons(div,cat,q,choose){
 div.replaceChildren();
 for(const s of [...sounds.values()].sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base',numeric:true}))){
  if(!matchesSound(s,cat,q))continue;
  const row=document.createElement('div'),name=document.createElement('div'),meta=document.createElement('small');
  row.className='sound-library-row';name.className='sound-label';meta.textContent=(s.duration?s.duration.toFixed(1)+'s · ':'')+(s.recording?(s.license==='CC-BY-3.0'?'Credit required':'Recording'):'Synthesized');name.append(soundNameButton(s),meta);
  const play=document.createElement('button');play.textContent='▶ Play';play.setAttribute('aria-label','Preview '+s.name);play.disabled=recording||exportBusy;play.onclick=guard(async()=>{$('libraryNowPlaying').textContent='Loading: '+s.name;const playing=await audition(s.id);$('libraryNowPlaying').textContent=(playing?'Playing: ':'Paused: ')+s.name});
  const use=document.createElement('button');use.textContent='Use';use.setAttribute('aria-label','Place '+s.name);use.disabled=recording||exportBusy;use.onclick=()=>choose(s.id);
  const star=document.createElement('button');star.textContent=favoriteSounds.has(s.id)?'★':'☆';star.setAttribute('aria-label','Favorite '+s.name);star.setAttribute('aria-pressed',String(favoriteSounds.has(s.id)));star.onclick=()=>{if(favoriteSounds.has(s.id))favoriteSounds.delete(s.id);else favoriteSounds.add(s.id);try{localStorage.setItem('sxlock-favorites-v1',JSON.stringify([...favoriteSounds]))}catch{}renderLibrary()};
  row.append(name,play,use,star);div.append(row);
 }
 if(!div.children.length)div.textContent='No matching sounds.';
}
function renderLibrary(){
 applySoundNames();
 const host=$('library'),state=new Map([...host.querySelectorAll('details')].map(d=>[d.dataset.category,d.open])),cat=$('category').value,q=$('search').value.trim().toLowerCase();host.replaceChildren();
 const categories=[...new Set([...sounds.values()].filter(s=>matchesSound(s,cat,q)).map(s=>s.category))].sort((a,b)=>a.localeCompare(b));
 for(const category of categories){const group=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('div');group.className='sound-group';group.dataset.category=category;group.open=!!q||cat!=='all'||libraryView!=='all'||state.get(category)===true||(!state.has(category)&&category==='Approved effects');summary.textContent=category+' · '+[...sounds.values()].filter(s=>matchesSound(s,category,q)).length;list.className='sound-buttons';soundButtons(list,category,q,id=>openSheet(id));const collapse=document.createElement('button');collapse.type='button';collapse.className='sx-collapse-category';collapse.textContent='▲ Collapse '+category;collapse.onclick=()=>{group.open=false;group.scrollIntoView({block:'nearest',behavior:'smooth'})};list.append(collapse);group.append(summary,list);host.append(group)}
 if(!categories.length)host.textContent=libraryView==='favorites'?'Tap ☆ beside any sound to keep it here.':'No matching sounds.';
 soundButtons($('sheetLibrary'),$('sheetCategory').value,$('sheetSearch').value.trim().toLowerCase(),id=>chooseSound(id));renderRecordingList();
 for(const button of document.querySelectorAll('[data-library-view]'))button.setAttribute('aria-pressed',String(button.dataset.libraryView===libraryView));
}
function busLevel(c){return num($(sounds.get(c.soundId)?.origin==='microphone'?'voiceBus':'effectsBus').value,0,100)/100}
function updateMixer(){for(const id of ['effectsBus','voiceBus'])$(id+'Value').textContent=$(id).value+'%';for(const n of active)if(n._gain&&n._clip)n._gain.gain.value=n._clip.volume/100*busLevel(n._clip)}
function renderRecordingList(){const div=$('recordingList');div.replaceChildren();const own=[...sounds.values()].filter(s=>!s.builtin&&!s.hidden).sort((a,b)=>a.name.localeCompare(b.name));if(!own.length){div.textContent='No imported recordings or live takes.';return}for(const sound of own){const row=document.createElement('div'),name=soundNameButton(sound),button=document.createElement('button');row.className='recording-row';button.textContent='Delete forever';button.className='danger';button.disabled=recording;button.setAttribute('aria-label','Delete forever '+sound.name);button.onclick=guard(()=>deleteRecording(sound.id));row.append(name,button);div.append(row)}}
async function deleteRecording(id){if(recording||exportBusy||liveTake)return;const sound=sounds.get(id);if(!sound||sound.builtin)return;const uses=clips.filter(c=>c.soundId===id).length;if(!window.confirm('Delete forever: '+sound.name+'?\n\nThis removes this browser’s stored recording and '+uses+' insertion(s) from this project. It cannot be undone here. Original files and previously downloaded backups are unchanged.'))return;pauseForEdit();setBusy(true);try{await recoveryQueue;await saveCustom();const d=await db();try{await new Promise((resolve,reject)=>{const tx=d.transaction('sounds','readwrite');tx.objectStore('sounds').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Deletion cancelled.'))})}finally{d.close()}clips=clips.filter(c=>c.soundId!==id);sounds.delete(id);savedCustom.delete(id);compressed.delete(id);toolbox?.sounds.delete(id);if(lastTakeId===id)selectLatestRecording(videoRef);renderCategories();renderLibrary();renderClips();flushProject();try{localStorage.setItem(KEY+'-previous',JSON.stringify(snapshot()))}catch{}message('Deleted '+sound.name+' from this browser and this project.')}finally{setBusy(false)}}
function frameTime(t){const fps=num($('sourceFps').value,1,120);return Math.round(Math.max(0,Number(t)||0)*fps)/fps;}
async function insert(id,settings={}){if(recording||liveTake||activeCamera)return;const ac=await audioContext(),b=await buffer(id,ac);const c={id:uid(),soundId:id,start:currentTime(),offset:0,duration:b.duration,volume:65,enabled:true,loop:false,...settings};c.start=frameTime(c.start);
 if(settings.append===true)c.start=duration()||c.start;
 clips.push(c);selectedClipId=c.id;pinSound(id);renderClips();if(mixPlaying())schedule();message('Inserted '+sounds.get(id).name+' at '+stamp(c.start));return c}
function renderClips(){const div=$('clips');document.getElementById('insertionSection')?.classList.toggle('sx-no-clips',clips.length===0);div.replaceChildren();$('count').textContent=clips.length;$('empty').hidden=clips.length>0;for(const c of clips){const row=document.createElement('div');row.className='clip-row';const edit=document.createElement('button');edit.className='clip-open';edit.dataset.clipId=c.id;edit.disabled=recording;const title=document.createElement('span');title.textContent=sounds.get(c.soundId)?.name||'Missing sound';const detail=document.createElement('small');detail.textContent=stamp(c.start)+' · '+c.volume+'% · '+(c.loop?'Loop ':'Once ')+c.duration.toFixed(2)+'s'+(c.enabled?'':' · muted');edit.append(title,detail);edit.onclick=()=>openSheet(c.soundId,c.id);row.append(edit);for(const [label,aria,fn]of [['⧉','Duplicate '+title.textContent,()=>{clips.push({...c,id:uid()});renderClips();saveLocal();schedule()}],['✕','Remove '+title.textContent,()=>{clips=clips.filter(x=>x.id!==c.id);renderClips();saveLocal();schedule()}]]){const button=document.createElement('button');button.className='clip-action';button.textContent=label;button.setAttribute('aria-label',aria);button.disabled=recording;button.onclick=fn;row.append(button)}div.append(row)}updateInsertionNavigation()}
let tailTime=null,tailAnchor=0,tailPlaying=false,sourceFinished=false;
function currentTime(){
 if(!videoFile)return video.currentTime||0;
 if(tailPlaying)return Math.min(duration(),ctx.currentTime-tailAnchor);
 return Math.min(duration(),tailTime??(video.ended||sourceFinished?sourceEnd():Math.min(video.currentTime||0,sourceEnd())));
}
function mixPlaying(){return tailPlaying||Boolean(videoFile&&!video.paused&&!video.ended&&!sourceFinished);}
function stopTail(){
 if(tailPlaying)tailTime=currentTime();
 tailPlaying=false;
}
function seekProject(target){
 const time=num(target,0,duration());
 stopTail();
 sourceFinished=time>=sourceEnd();
 tailTime=time>sourceEnd()?time:null;
 const mediaTime=Math.min(time,sourceEnd());
 lastView='';
 if(video.currentTime===mediaTime)return Promise.resolve();
 return new Promise(resolve=>{
  const done=()=>{clearTimeout(timer);video.removeEventListener('seeked',done);resolve();};
  const timer=setTimeout(done,1000);
  video.addEventListener('seeked',done,{once:true});
  video.currentTime=mediaTime;
  if(!video.seeking)done();
 });
}
async function playTail(){
 const ac=await audioContext();
 tailAnchor=ac.currentTime-(tailTime??sourceEnd());
 tailPlaying=true;
 updateTransport();
 await schedule();
}

let playRequest=0,playingRequest=-1;
function pauseForEdit(){playRequest++;stopTail();video.pause();stopEffects();stopAuditions();updateTransport();}
function frameStep(delta){if(recording||liveTake||!videoFile||!(duration()>0))return;pauseForEdit();const fps=num($('sourceFps').value,1,120),frame=Math.round(currentTime()*fps)+delta,maxFrame=Math.max(0,Math.ceil(duration()*fps)-1);seekProject(Math.max(0,Math.min(maxFrame,frame))/fps);if(draft){draft.start=currentTime();$('effectStart').value=draft.start.toFixed(3)}}
function openSheet(id=null,clipId=null){if(recording||liveTake)return;setLibraryOnly(false);pauseForEdit();const existing=clips.find(c=>c.id===clipId);draft=existing?{...existing,editId:clipId}:{id:uid(),soundId:null,start:currentTime(),offset:0,duration:1,volume:65,enabled:true,loop:false};if(existing){selectedClipId=existing.id;updateInsertionNavigation();if(videoFile&&duration()>0)seekProject(existing.start);}$('sheetTitle').textContent=existing?'Edit effect':'Add effect';$('sheetStatus').textContent='';$('sheetSearch').value='';$('sheetCategory').value='all';$('sheetBrowse').hidden=false;$('sheetEditor').hidden=true;if(!$('effectSheet').open)$('effectSheet').showModal();renderLibrary();if(id)chooseSound(id,!!existing)}
let chooseToken=0;
async function chooseSound(id,preserve=false){const token=++chooseToken;if(!draft)return;const sound=sounds.get(id);if(!sound)return;$('sheetStatus').textContent='Loading recording…';try{const ac=await audioContext(),b=await buffer(id,ac);if(!draft||token!==chooseToken)return;draft.soundId=id;if(!preserve){draft.offset=0;draft.duration=b.duration;draft.loop=false}$('selectedName').textContent=sound.name;$('selectedName').setAttribute('aria-label','Rename '+sound.name);showClassification(sound);$('selectedSource').textContent=sound.recording?'Recording · '+(sound.author||'User library')+' · '+(sound.license||'Verify license'):sound.hidden?'Legacy synthesized effect · kept for this project':'Your original '+sound.name;$('effectVolume').value=draft.volume;$('effectVolumeValue').textContent=draft.volume+'%';$('effectStart').value=draft.start.toFixed(3);$('effectDuration').value=draft.duration.toFixed(3);$('effectLoop').checked=draft.loop;$('effectEnabled').checked=draft.enabled;$('effectOffset').value=draft.offset.toFixed(3);$('sheetBrowse').hidden=true;$('sheetEditor').hidden=false;$('applyEffect').textContent=draft.editId?'Apply changes':'Add at this time';$('sheetStatus').textContent=''}catch(e){$('sheetStatus').textContent=e.message;message(e.message)}}
async function applyEffect(){if(!draft?.soundId)return;const ac=await audioContext(),b=await buffer(draft.soundId,ac);const value={soundId:draft.soundId,start:frameTime($('effectStart').value),offset:num($('effectOffset').value),duration:num($('effectDuration').value,.001,3600),volume:num($('effectVolume').value,0,100),enabled:$('effectEnabled').checked,loop:$('effectLoop').checked};if(value.offset>=b.duration)throw Error('Source IN must be before the end of the recording.');if(videoFile){
 const end=duration();
 if(Number($('effectStart').value)>end+.0005)throw Error('Choose a frame within the current timeline or at its end.');
 if(Math.abs(Number($('effectStart').value)-end)<.00051)value.append=true;
 if(value.append)value.start=end;
}if(!value.loop)value.duration=Math.min(value.duration,b.duration-value.offset);if(draft.editId){const c=clips.find(c=>c.id===draft.editId);if(c)Object.assign(c,value,{append:Boolean(value.append||c.append&&value.start>=sourceEnd())});renderClips();saveLocal()}else await insert(value.soundId,value);$('effectSheet').close();message('Saved '+sounds.get(value.soundId).name+' at '+stamp(value.start)+(value.loop?' · looping':''))}
function setLibraryOnly(enabled){document.body.classList.toggle('library-only',enabled);$('libraryOnly').textContent=enabled?'Show editor':'Library only';$('libraryOnly').setAttribute('aria-pressed',String(enabled));}
function usedCredits(){return [...new Set(clips.map(c=>sounds.get(c.soundId)).filter(s=>s?.attribution).map(s=>s.attribution))].join('\n\n')||'No attribution-required sounds are placed in this project.'}
function wireSheet(){$('libraryOnly').onclick=()=>setLibraryOnly(!document.body.classList.contains('library-only'));$('copySoundCredits').onclick=()=>copy(usedCredits());setLibraryOnly(new URLSearchParams(location.search).get('library')==='1');for(const button of document.querySelectorAll('[data-library-view]'))button.onclick=()=>{libraryView=button.dataset.libraryView;renderLibrary()};for(const button of document.querySelectorAll('[data-stop-preview]'))button.onclick=()=>{stopAuditions();$('libraryNowPlaying').textContent='Preview stopped.'};const sheet=$('effectSheet');$('selectedName').onclick=guard(async()=>{try{if(draft?.soundId)await renameSound(draft.soundId)}catch(error){$('sheetStatus').textContent=error.message}});$('closeSheet').onclick=()=>sheet.close();sheet.addEventListener('close',()=>{chooseToken++;draft=null;stopAuditions();auditionGain=null});sheet.addEventListener('click',e=>{if(e.target===sheet){const r=sheet.getBoundingClientRect();if(e.clientY<r.top||e.clientX<r.left||e.clientX>r.right)sheet.close()}});$('addEffect').onclick=()=>openSheet();$('sheetBack').onclick=()=>frameStep(-1);$('sheetForward').onclick=()=>frameStep(1);$('sheetCategory').onchange=renderLibrary;$('sheetSearch').oninput=renderLibrary;$('changeSound').onclick=()=>{$('sheetBrowse').hidden=false;$('sheetEditor').hidden=true;stopAuditions()};$('effectVolume').oninput=()=>{$('effectVolumeValue').textContent=$('effectVolume').value+'%';if(draft)draft.volume=num($('effectVolume').value,0,100);if(auditionGain)auditionGain.gain.value=num($('effectVolume').value,0,100)/100};$('effectLoop').onchange=()=>{if(!draft)return;stopAuditions();const b=sounds.get(draft.soundId)?.buffer,start=num($('effectStart').value);$('effectDuration').value=($('effectLoop').checked?Math.max(.001,videoFile?duration()-start:10):Math.max(.001,(b?.duration||1)-num($('effectOffset').value))).toFixed(3)};$('hearSelected').onclick=guard(async()=>{if(draft?.soundId)await audition(draft.soundId,$('effectVolume').value,$('effectLoop').checked)});$('stopAudition').onclick=()=>stopAuditions();$('applyEffect').onclick=guard(async()=>{try{await applyEffect()}catch(e){$('sheetStatus').textContent=e.message;throw e}});$('effectStart').onchange=()=>{if(videoFile&&!recording){pauseForEdit();seekProject($('effectStart').value)}};
video.addEventListener('contextmenu',e=>{e.preventDefault();if(e.button===2&&e.pointerType!=='touch'&&!e.sourceCapabilities?.firesTouchEvents&&!$('effectSheet').open)openSheet()});
video.addEventListener('keydown',e=>{if(['m','M','ContextMenu'].includes(e.key)){e.preventDefault();openSheet()}});}
function filename(ext){return ($('filename').value||'SxLock_mix_v01').replace(/\.[a-z0-9]{2,5}$/i,'').replace(/[^a-zA-Z0-9_-]/g,'_')+'.'+ext}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000)}
function finishExport(blob,ext){if(exportURL)URL.revokeObjectURL(exportURL);exportURL=URL.createObjectURL(blob);exported=new File([blob],filename(ext),{type:blob.type});$('exportName').textContent=exported.name+' · '+(blob.size/1048576).toFixed(1)+' MB';$('result').hidden=false;$('download').textContent='Save';$('share').disabled=!(navigator.canShare&&navigator.canShare({files:[exported]}));$('progress').value=1;message('Export ready. Download or share the actual file. Original unchanged.')}
async function copy(text){try{await navigator.clipboard.writeText(text);message('Copied.')}catch{$('copyFallback').hidden=false;$('copyFallback').open=true;$('copyText').value=text;$('copyText').focus();$('copyText').select();message('Text selected. Use Copy.')}}
function handoff(){return 'Continue this tools workflow. Preserve the original video and locked audio.\n\nHUMAN NOTES\n'+$('notes').value+'\n\nSOUND CREDITS\n'+usedCredits()+'\n\nTOOL STATE\n'+JSON.stringify(snapshot(),null,2)}
async function loadVideo(file,options={}){
 if(!file||recording&&!options.restoring)return;
 document.dispatchEvent(new Event('sxlock-before-scribe-replace'));
 pauseForEdit();setBusy(true);
 const token=++sourceLoadToken;tailTime=null;sourceFinished=false;sourceDuration=0;lastView='';
 if(!options.restoring){restoredPlayhead=0;selectedClipId=null;lastTakeId=null;if(videoFile)restoreToolbox();renderClips();$('notes').value='';$('bed').value=100;updateBed();$('filename').value='SxLock_mix_v01'}
 if(videoURL)URL.revokeObjectURL(videoURL);
 videoFile=file;videoRef=options.ref||'video-'+uid();videoURL=URL.createObjectURL(file);
 const metadataReady=new Promise((resolve,reject)=>{
  const clean=()=>{clearTimeout(timer);video.removeEventListener('loadedmetadata',loaded);video.removeEventListener('error',failed)};
  const loaded=()=>{clean();resolve()},failed=()=>{clean();reject(Error('This browser cannot read the selected video.'))};
  const timer=setTimeout(()=>{clean();reject(Error('Video metadata did not load.'))},30000);
  video.addEventListener('loadedmetadata',loaded);video.addEventListener('error',failed);
 });
 video.src=videoURL;video.hidden=false;$('audioOnly').hidden=true;video.load();
 $('videoName').textContent=file.name;$('videoName').dataset.expected=file.name;
 if($('filename').value==='SxLock_mix_v01')$('filename').value=file.name.replace(/\.[^.]+$/,'')+'_SFX_v01';
 message('Reading video timing…');
 sourceReady=(async()=>{
  const timing=(async()=>{
   const m=await import('./vendor/mediabunny-1.62.1-gs1.mjs');
   const input=new m.Input({formats:m.ALL_FORMATS,source:new m.BlobSource(file)});
   try{const track=await input.getPrimaryVideoTrack();if(!track)throw Error('No video track found.');return await track.computeDuration()}finally{input.dispose()}
  })().catch(e=>{recordIssue('source-duration',e);return 0});
  const [,actual]=await Promise.all([metadataReady,timing]);
  if(token!==sourceLoadToken)return;
  sourceDuration=Number.isFinite(actual)&&actual>0?actual:(Number.isFinite(video.duration)&&video.duration>0?video.duration:0);
  if(!sourceDuration)throw Error('Could not read this video’s duration. Playback has not started.');
  if(restoredPlayhead>0){seekProject(restoredPlayhead);restoredPlayhead=0}
  lastView='';
 })();
 try{await sourceReady;if(token!==sourceLoadToken)return;if(!options.restoring){await saveLocal();message('Video loaded. Original soundtrack stays at '+$('bed').value+'%.')}}finally{if(token===sourceLoadToken&&projectReady)setBusy(false)}
}
function audioTail(){
 return clips.reduce((end,clip)=>clip.append&&clip.enabled?Math.max(end,clip.start+clip.duration):end,0);
}
function sourceEnd(){return sourceDuration||(Number.isFinite(video.duration)&&video.duration>0?video.duration:0);}
function duration(){return videoFile?Math.max(sourceEnd(),audioTail(),visualLayer?.outlet()||0):Math.max(1,...clips.map(c=>c.start+c.duration));}
let lastDraw=0,lastView='',meterSamples;
function draw(now=0){drawHandle=requestAnimationFrame(draw);if(document.hidden||now-lastDraw<100)return;lastDraw=now;
 if(mixPlaying()&&!tailPlaying&&video.currentTime>=sourceEnd()-.0005)finishSourcePlayback(true);
 visualLayer?.sync();if(tailPlaying&&currentTime()>=duration()){stopTail();stopEffects();updateTransport();saveLocal();}const key=[currentTime(),mixPlaying(),clips.map(c=>[c.start,c.duration,c.enabled]).join(';'),$('sourceFps').value,duration()].join('|');if(key===lastView)return;lastView=key;const t=currentTime(),d=duration();$('clock').textContent=stamp(t)+' / '+stamp(d)+' · F'+Math.round(t*num($('sourceFps').value,1,120));$('sheetClock').textContent=stamp(t);$('seek').max=d>0?d:1;$('seek').value=d>0?Math.min(t,d):0;$('seek').disabled=recording||!videoFile||!(d>0);const c=$('timeline'),g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);g.fillStyle='#9db1c7';g.font='22px system-ui';for(let i=0;i<=5;i++){const x=i/5*w;g.fillText(stamp(i/5*d),Math.min(w-100,x+3),24);g.fillRect(x,32,1,h-32)}clips.forEach((s,i)=>{g.fillStyle=s.enabled?'#e8c482':'#58718a';g.fillRect(s.start/(d||1)*w,42+(i%5)*28,Math.max(3,s.duration/(d||1)*w),20)});g.fillStyle='white';g.fillRect(t/(d||1)*w,30,3,h-30);if(analyser&&mixPlaying()){const a=meterSamples||(meterSamples=new Float32Array(analyser.fftSize));analyser.getFloatTimeDomainData(a);let peak=0;for(const value of a)peak=Math.max(peak,Math.abs(value));$('peak').textContent=peak>1?'Mix is clipping. Lower an overlapping insertion or original soundtrack.':''}}
function setBusy(on){recording=on;for(const el of document.querySelectorAll('button,input,select')){if(el.hasAttribute('data-scribe-control')||['cancel','copyNotes','copyProject','chat','copyDiagnostics','infoButton','closeInfo'].includes(el.id))continue;el.disabled=on}if(!on){$('share').disabled=!exported||!(navigator.canShare&&navigator.canShare({files:[exported]}));$('format').disabled=!$('format').options.length}$('cancel').disabled=!on;renderLibrary();renderClips();updateLiveControls()}
async function videoExport(){
 if(!videoFile)throw Error('Load a video first.');
 pauseForEdit();
 await prepareExportFiles();
 const ac=await audioContext(),engine=await import('./export-engine.mjs?v=40');
 const selected=clips.filter(c=>c.enabled&&c.volume>0&&busLevel(c)>0).map(c=>({...c}));
 const fps=num($('fps').value,1,60),tail=duration();
 const extension=tail>sourceEnd()?{durationFrames:Math.ceil((tail-.000002)*fps)}:null;
 $('progress').hidden=false;$('progress').value=0;
 const visual=await visualLayer?.prepareFrameRender(fps,$('size').value,tail);
 let result;
 try{result=await engine.exportVideo({file:videoFile,fps,extension,visual,size:$('size').value,
  format:$('format').value.startsWith('video/webm')?'webm':'mp4',soundtrackGain:num($('bed').value,0,100)/100,
  // Use the bundled AAC encoder with known priming for mixed MP4s.
  hasEffects:selected.length>0,useSoftwareAac:true,cancelled:()=>cancelled,
  onPhase:phase=>{savePhase(phase);message(phase+'…');},onProgress:value=>{$('progress').value=value;},
  placeEffects:async(offline,at,end)=>{for(const c of selected){
   if(c.start>=end||c.start+c.duration<=at)continue;
   const b=await buffer(c.soundId,ac);if(cancelled)throw Error('Export cancelled.');
   placeSource(offline,c,b,offline.destination,at,0,end);
  }trimDecoded();}
 });}finally{await visual?.close();}
 health.lastExport=result.report;
 finishExport(result.blob,result.blob.type==='video/mp4'?'mp4':'webm');return result;
}

function wav(buffer){const ch=buffer.numberOfChannels,n=buffer.length,sr=buffer.sampleRate,data=new ArrayBuffer(44+n*ch*2),v=new DataView(data);let p=0;const str=s=>{for(const c of s)v.setUint8(p++,c.charCodeAt(0))},u16=x=>{v.setUint16(p,x,true);p+=2},u32=x=>{v.setUint32(p,x,true);p+=4};str('RIFF');u32(data.byteLength-8);str('WAVEfmt ');u32(16);u16(1);u16(ch);u32(sr);u32(sr*ch*2);u16(ch*2);u16(16);str('data');u32(n*ch*2);for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const x=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));v.setInt16(p,x<0?x*32768:x*32767,true);p+=2}return new Blob([data],{type:'audio/wav'})}
function pcm16(buffer){const channels=buffer.numberOfChannels,out=new Uint8Array(buffer.length*channels*2),view=new DataView(out.buffer),data=Array.from({length:channels},(_,c)=>buffer.getChannelData(c));let p=0;for(let i=0;i<buffer.length;i++)for(let c=0;c<channels;c++){const sample=data[c][i];if(!Number.isFinite(sample)||Math.abs(sample)>1)throw Error('Mix exceeds full scale. Lower overlapping volumes. No normalization was applied.');view.setInt16(p,sample<0?sample*32768:sample*32767,true);p+=2}return out}
function wavHeader(frames,channels=2){const header=new ArrayBuffer(44),v=new DataView(header);let p=0;const str=s=>{for(const c of s)v.setUint8(p++,c.charCodeAt(0))},u16=x=>{v.setUint16(p,x,true);p+=2},u32=x=>{v.setUint32(p,x,true);p+=4};str('RIFF');u32(36+frames*channels*2);str('WAVEfmt ');u32(16);u16(1);u16(channels);u32(SR);u32(SR*channels*2);u16(channels*2);u16(16);str('data');u32(frames*channels*2);return header}
async function wavExport(effectsOnly){const dur=duration();if(!effectsOnly&&!videoFile)throw Error('Load the original video first.');if(dur>1800)throw Error('WAV exports are limited to 30 minutes.');const ac=await audioContext();pauseForEdit();await prepareExportFiles();let original=null;if(!effectsOnly){const estimate=videoFile.size*2+dur*SR*2*4;if(estimate>256*1024*1024)throw Error('This soundtrack is too large for safe phone WAV decoding. Use finished video export.');savePhase('Decoding original soundtrack');try{original=await ac.decodeAudioData(await videoFile.arrayBuffer())}catch{throw Error('This browser cannot decode the video soundtrack for WAV. Use video export or effects-only WAV.')}}const frames=Math.ceil(dur*SR),chunkFrames=8*SR,parts=[wavHeader(frames)];$('progress').hidden=false;try{for(let first=0;first<frames;first+=chunkFrames){if(cancelled)throw Error('Export cancelled. Saved placements are preserved.');savePhase('Rendering WAV');const length=Math.min(chunkFrames,frames-first),at=first/SR,end=(first+length)/SR;let offline=new OfflineAudioContext(2,length,SR);if(original&&at<original.duration){const n=offline.createBufferSource(),g=offline.createGain();n.buffer=original;g.gain.value=num($('bed').value,0,100)/100;n.connect(g).connect(offline.destination);n.start(0,at,Math.min(length/SR,original.duration-at))}for(const c of clips){if(!c.enabled||c.start>=end||c.start+c.duration<=at)continue;const b=await buffer(c.soundId,ac);placeSource(offline,c,b,offline.destination,at,0,end)}let rendered=await offline.startRendering();parts.push(pcm16(rendered));rendered=null;offline=null;$('progress').value=(first+length)/frames;message('Rendering WAV · '+Math.round((first+length)/frames*100)+'%');await new Promise(r=>setTimeout(r,0));trimDecoded()}if(cancelled)throw Error('Export cancelled. Saved placements are preserved.');finishExport(new Blob(parts,{type:'audio/wav'}),'wav')}finally{original=null;parts.length=0}}
const guard=fn=>async(...args)=>{try{await fn(...args)}catch(e){recordIssue('action',e);message(e.message||String(e))}};
let selectedClipId=null;
let visualLayer,camera,activeCamera=false,lastVideoTakeId=null,videoRecordingSettingsId=null;
const toolboxReady=Promise.all([import('./toolbox.mjs?v=41'),import('./visual-placement.mjs?v=40'),import('./camera-recorder.mjs?v=40')]).then(([{setupToolbox},{setupVisualPlacement},{setupCameraRecorder}])=>{
 visualLayer=setupVisualPlacement({
  stage:$('video').parentElement,video,playhead:currentTime,duration,playing:mixPlaying,
  fps:()=>num($('sourceFps').value,1,120),edit:seekProject,changed:()=>{refreshToolbox();flushProject();},
  fileById:id=>toolbox?.files().get(id),
 });
  camera=setupCameraRecorder({
  video,clock:currentTime,sourceEnd,ready:()=>Boolean(videoFile&&video.readyState>=2&&currentTime()<sourceEnd()-.04),
  play:async()=>{await audioContext();bedGain.gain.value=0;stopEffects();await video.play();},
  stopBed:pauseForEdit,
  changed:on=>{activeCamera=on;updateBed();updateLiveControls();},
  finish:async(blob,start,time)=>{
   const type=blob.type.includes('mp4')?'mp4':'webm';
   const title=(videoFile?.name||'Video').replace(/\.[^.]+$/,'').replace(/[^\p{L}\p{N}_-]+/gu,'_').slice(0,70)||'Video';
   const file=new File([blob],title+'_Cam_'+time.replace(/[:.]/g,'-')+'.'+type,{type:blob.type});
   const id=uid();toolbox.restoreFile(id,file,{camera:true});lastVideoTakeId=id;lastTakeId=null;
   await flushProject();
   try{await visualLayer.place(id,file,'overlay',start);}
   finally{refreshToolbox();message('Raw camera recording saved in Toolbox.');}
  },
 });
 return setupToolbox({visual:visualLayer, soundNameButton,
 openSound:id=>openSheet(id),previewSound:id=>audition(id),editRecording:openRecordingSettings,editVideoRecording:openVideoRecordingSettings,
 importAudio:importAudioFile,getSound:id=>sounds.get(id),useCount:id=>clips.filter(clip=>clip.soundId===id).length,
 persist:()=>{sxActivate();return flushProject();},pause:pauseForEdit,stopPreview:stopAuditions,busy:()=>recording||activeCamera||Boolean(liveTake),
 });
});
let toolbox;
const toolboxState=()=>({...toolbox?.state()||{sounds:[],files:[]},
 visual:visualLayer?.placements().map(item=>({...item}))||[],lastCameraId:lastVideoTakeId,
});
const restoreToolbox=data=>{lastVideoTakeId=null;toolbox?.restoreSoundIds(data?.sounds,data?.cameraIds);visualLayer?.restore(data?.visual);};
const refreshToolbox=()=>toolbox?.render();
function pinSound(id){
 if(!sounds.has(id))return;
 toolbox.sounds.add(id);sxActivate();flushProject();refreshToolbox();
}
function updateInsertionNavigation(){
 const ordered=[...clips].sort((a,b)=>a.start-b.start);
 const index=ordered.findIndex(clip=>clip.id===selectedClipId);
 const blocked=recording||Boolean(liveTake)||!ordered.length;
 $('previousInsertion').disabled=blocked||(index===0);
 $('nextInsertion').disabled=blocked||(index===ordered.length-1);
 for(const row of $('clips').querySelectorAll('[data-clip-id]')){
  if(row.dataset.clipId===selectedClipId)row.setAttribute('aria-current','true');
  else row.removeAttribute('aria-current');
  row.disabled=recording||Boolean(liveTake);
 }
}
function navigateInsertion(direction){
 const ordered=[...clips].sort((a,b)=>a.start-b.start);
 const index=ordered.findIndex(clip=>clip.id===selectedClipId);
 const clip=ordered[index<0?(direction===1?0:ordered.length-1):index+direction];
 if(clip)openSheet(clip.soundId,clip.id);
}
$('previousInsertion').onclick=()=>navigateInsertion(-1);
$('nextInsertion').onclick=()=>navigateInsertion(1);

async function importAudioFile(file){
 if(file.size>64*1024*1024)throw Error('Import a recording below 64 MB.');
 const data=new Uint8Array(await file.arrayBuffer());
 const ac=await audioContext(),decoded=await ac.decodeAudioData(data.slice().buffer);
 const id='custom-'+uid();
 sounds.set(id,{id,name:file.name,category:'My sounds',duration:decoded.duration,builtin:false,
  mimeType:file.type,origin:'import',data:to64(data),buffer:decoded,_lastUse:++cacheClock});
 try{await saveCustom();}catch(error){sounds.delete(id);throw error;}
 trimDecoded(id);renderCategories();renderLibrary();
 return id;
}
$('cameraRecord').onclick=guard(async()=>{
 if(!camera||activeCamera||liveTake||recording)return;
 if($('toolboxSheet').open)$('toolboxSheet').close();
 pauseForEdit();await camera.open();
});
function selectLatestVideoRecording(savedId){
 if(savedId&&toolbox.files().has(savedId)){lastVideoTakeId=savedId;return;}
 lastVideoTakeId=[...toolbox.files()].filter(([,file])=>/_Cam_/.test(file.name)).sort((a,b)=>b[1].lastModified-a[1].lastModified)[0]?.[0]||null;
}
function openVideoRecordingSettings(id){
 const file=toolbox?.files().get(id);
 if(!file||recording||activeCamera||liveTake)return;
 pauseForEdit();
 recordingSettingsId=null;videoRecordingSettingsId=id;
 $('recordingName').value=file.name;
 $('recordingStatus').textContent='';
 $('recordingInfo').textContent='Camera overlay · '+new Date(file.lastModified).toLocaleString();
 $('recordingPlacement').hidden=true;
 $('recordingOpacity').hidden=!visualLayer.placements().some(item=>item.fileId===id);
 $('recordingSheet').showModal();
}
$('recordingOpacity').onclick=guard(async()=>{
 const item=visualLayer.placements().find(p=>p.fileId===videoRecordingSettingsId);
 if(item)visualLayer.update(item.id);
});
function openRecordingSettings(id){
 const sound=sounds.get(id);
 if(!sound?.data||liveTake||recording)return;
 pauseForEdit();
 recordingSettingsId=id;videoRecordingSettingsId=null;
 $('recordingOpacity').hidden=true;$('recordingPlacement').hidden=false;
 $('recordingName').value=sound.name;
 $('recordingInfo').textContent=[sound.capture?.sourceVideo,sound.capture?.recordedAt&&new Date(sound.capture.recordedAt).toLocaleString(),sound.duration?Number(sound.duration).toFixed(2)+' s':null].filter(Boolean).join(' · ');
 $('recordingStatus').textContent='';
 const placement=clips.find(clip=>clip.soundId===id);
 $('recordingPlacement').textContent=placement?'Edit placement':'Place recording';
 $('recordingSheet').showModal();
}
$('recordingDownload').onclick=()=>{
 if(videoRecordingSettingsId){
  const file=toolbox.files().get(videoRecordingSettingsId);
  if(file)download(file,file.name);
  return;
 }
 const sound=sounds.get(recordingSettingsId);
 if(sound?.data)download(new Blob([from64(sound.data)],{type:sound.mimeType||'application/octet-stream'}),sound.name);
};
$('recordingPlacement').onclick=()=>{
 const sound=sounds.get(recordingSettingsId);
 if(!sound)return;
 $('recordingSheet').close();
 openSheet(sound.id,clips.find(clip=>clip.soundId===sound.id)?.id);
};
$('recordingRename').onclick=guard(async()=>{
 const sound=sounds.get(recordingSettingsId),file=toolbox?.files().get(videoRecordingSettingsId);
 const field=$('recordingName'),status=$('recordingStatus'),button=$('recordingRename'),current=sound||file;
 if(!current)return;
 const ext=current.name.match(/\.[a-z0-9]+$/i)?.[0]||'';
 const base=field.value.trim();
 if(!base||/[\\/<>:"|?*\x00-\x1f]/.test(base)){status.textContent='Enter a filename without slashes or symbols.';return;}
 const name=ext&&!base.toLowerCase().endsWith(ext.toLowerCase())?base+ext:base;
 if(name===current.name)return;
 if(file){
  toolbox.renameFile(videoRecordingSettingsId,name);
  visualLayer.renameFile(videoRecordingSettingsId,name);
  await flushProject();
  field.value=name;status.textContent='Name saved.';refreshToolbox();
  return;
 }
 button.disabled=true;
 try{
  await renameSound(sound.id,name);
  field.value=sound.name;status.textContent='Name saved.';
 }catch(error){status.textContent=error.message;}
 finally{button.disabled=false;}
});

let discovery=null;
const discoverySheet=$('discoverySheet'),scrubberFrame=$('scrubberFrame'),pendingSelection=new Set();
function launchDiscovery(button){
 if(!toolbox||recording||liveTake||activeCamera)return;
 const query=button.closest('#effectSheet')?$('sheetSearch').value:button.closest('#soundSection')?$('search').value:'';
 const returnTo=button.closest('#effectSheet,#toolboxSheet');
 const draftWasOpen=returnTo?.id==='effectSheet';
 pauseForEdit();
 if(returnTo&&!draftWasOpen)returnTo.close();
 discovery={token:uid(),returnTo,draftWasOpen};
 pendingSelection.clear();
 $('discoveryStatus').textContent='';
 const path=new URL('../sound-scrubber/',location.href);
 path.searchParams.set('picker',discovery.token);
 if(query.trim())path.searchParams.set('q',query.trim());
 scrubberFrame.src=path.href;
 discoverySheet.showModal();
}
for(const button of document.querySelectorAll('.sx-discover'))button.onclick=()=>launchDiscovery(button);
discoverySheet.addEventListener('cancel',event=>{
 if(!pendingSelection.size)return;
 event.preventDefault();
 $('discoveryStatus').textContent='Saving selected sound…';
});
discoverySheet.querySelector('form').addEventListener('submit',event=>{
 if(!pendingSelection.size)return;
 event.preventDefault();
 $('discoveryStatus').textContent='Saving selected sound…';
});
discoverySheet.addEventListener('close',()=>{
 const item=discovery;
 discovery=null;
 pendingSelection.clear();
 scrubberFrame.removeAttribute('src');
 if(!item)return;
 if(item.picked){
  if(item.draftWasOpen&&$('effectSheet').open)$('effectSheet').close();
  toolbox.open();
 }else if(item.returnTo?.id==='toolboxSheet')toolbox.open();
});
window.addEventListener('message',event=>{
 const data=event.data;
 if(!discovery||event.origin!==location.origin||event.source!==scrubberFrame.contentWindow
  ||data?.protocol!=='gs-sound-scrubber-picker'||data.token!==discovery.token||typeof data.id!=='string')return;
 if(data.state==='start'){
  pendingSelection.add(data.id);
  $('discoveryStatus').textContent='Saving selected sound…';
  return;
 }
 pendingSelection.delete(data.id);
 if(data.state==='error'){
  $('discoveryStatus').textContent='The selected sound still needs approval. It remains in Sound Scrubber.';
  return;
 }
 if(data.state!=='approved')return;
 const approved=window.GSApprovedEffects?.list()||[];
 const sound=approved.find(entry=>entry.sourceId===data.id);
 if(!sound)return;
 syncApprovedEffects(approved);
 discovery.picked=true;
 pinSound(sound.id);
 $('discoveryStatus').textContent=sound.name+' added to Toolbox.';
});



let sxSessionActive=false;
function sxActivate(){sxSessionActive=true;document.body.classList.remove('sx-empty');}
document.body.classList.add('sx-empty');
$('sxPickVideo').onclick=()=>$('videoFile').click();
$('sxPickProject').onclick=()=>$('loadProject').click();
$('pickAudioFiles').onclick=()=>$('audioFiles').click();
$('videoFile').onchange=guard(async()=>{const f=$('videoFile').files[0];if(!f)return;await libraryReady;if(!sxSessionActive){clips=[];renderClips();$('bed').value=100;$('effectsBus').value=100;$('voiceBus').value=100;updateBed();updateMixer();}sxActivate();await loadVideo(f);renderClips();flushProject();});$('audioFiles').onchange=guard(async event=>{
 const files=[...event.target.files];
 event.target.value='';
 if(!files.length)return;
 await libraryReady;
 for(const file of files)await importAudioFile(file);
 renderCategories();renderLibrary();await saveLocal();
 message('Imported recordings ready. Saved in My sounds.');
});
$('play').onclick=guard(async()=>{
 if(!videoFile)throw Error('Load a video first.');
 if(liveTake?.state==='requesting'||liveTake?.state==='saving')return;
 if(mixPlaying()){pauseForEdit();saveLocal();return;}
 const request=++playRequest,ready=sourceReady;
 await ready;await audioContext();
 if(request!==playRequest)return;
 stopAuditions();
 if(currentTime()>=duration()-.0005){await seekProject(0);}
 if(request!==playRequest)return;
 const at=currentTime();
 await prepareWindow(at);
 if(request!==playRequest)return;
 playingRequest=request;
 if(at>=sourceEnd()-.0005&&duration()>sourceEnd())await playTail();
 else await video.play();
});
$('restart').onclick=()=>{pauseForEdit();if(videoFile)seekProject(0);};
$('back').onclick=()=>frameStep(-1);$('forward').onclick=()=>frameStep(1);$('seek').oninput=()=>{if(!recording&&!liveTake){pauseForEdit();seekProject($('seek').value);saveLocal();}};$('timeline').onpointerdown=e=>{if(recording||!videoFile)return;const r=e.currentTarget.getBoundingClientRect();seekProject((e.clientX-r.left)/r.width*duration())};
function updateTransport(){
 const playing=mixPlaying();
 $('play').textContent=playing?'Ⅱ Pause':'▶ Start';
 $('play').setAttribute('aria-label',playing?'Pause':'Start');
}
video.addEventListener('play',updateTransport);
video.addEventListener('pause',()=>{updateTransport();if(liveTake?.withVideo&&liveTake.state==='recording')stopLiveTake();});video.addEventListener('play',guard(schedule));video.addEventListener('pause',stopEffects);video.addEventListener('seeking',()=>{
 if(!tailPlaying&&video.currentTime<sourceEnd()-.0005)sourceFinished=false;
 stopEffects();
});video.addEventListener('seeked',guard(schedule));video.addEventListener('seeked',()=>{if(!recording)saveLocal()});video.addEventListener('pause',()=>{if(!recording)saveLocal()});const finishSourcePlayback=guard(async pausePicture=>{
 if(sourceFinished)return;
 sourceFinished=true;
 if(pausePicture)video.pause();
 stopEffects();
 if(liveTake?.withVideo)stopLiveTake();
 if(duration()>sourceEnd()&&ctx&&!activeCamera&&playRequest===playingRequest)await playTail();
 updateTransport();saveLocal();
});
video.addEventListener('ended',()=>finishSourcePlayback(false));$('bed').oninput=()=>{updateBed();saveLocal()};for(const id of ['effectsBus','voiceBus'])$(id).oninput=()=>{updateMixer();saveLocal()};$('infoButton').onclick=()=>$('infoSheet').showModal();$('closeInfo').onclick=()=>$('infoSheet').close();for(const el of document.querySelectorAll('details[id]'))el.addEventListener('toggle',saveLocal);$('notes').oninput=saveLocal;$('filename').oninput=saveLocal;$('fps').onchange=saveLocal;$('size').onchange=saveLocal;$('sourceFps').onchange=saveLocal;$('category').onchange=renderLibrary;$('search').oninput=renderLibrary;
$('copyNotes').onclick=()=>copy($('notes').value);$('copyProject').onclick=()=>copy(handoff());$('chat').onclick=()=>{copy(handoff());window.open('https://chatgpt.com/','_blank','noopener,noreferrer')};$('saveProject').onclick=()=>{download(new Blob([JSON.stringify(snapshot(true),null,2)],{type:'application/json'}),filename('json'));flushProject();message('Project settings and audio backup downloaded. Video is retained on this browser; keep its original for another device.')};$('loadProject').onchange=guard(async()=>{await libraryReady;const f=$('loadProject').files[0];if(!f)return;const data=JSON.parse(await f.text());await recoveryQueue;sxActivate();projectReady=false;setBusy(true);try{restore(data);await restoreAssets(data);message('Project and stored assets restored.')}catch(e){recoveryStatus('Recovery incomplete: '+e.message,true);message(e.message)}finally{projectReady=true;setBusy(false);await saveLocal()}});$('exportVideo').onclick=()=>runExport('video',videoExport);$('cancel').onclick=()=>{cancelled=true;if(recorder?.state==='recording')recorder.stop()};$('exportWav').onclick=()=>runExport('mixed WAV',()=>wavExport(false));$('exportFx').onclick=()=>runExport('effects WAV',()=>wavExport(true));$('download').onclick=()=>{if(!exported)return;download(exported,exported.name);$('download').textContent='Resave';};$('share').onclick=guard(async()=>{if(exported)await navigator.share({files:[exported],title:exported.name})});

// Microphone audio is captured directly into its own mixer layer.
let liveTake=null,lastTakeId=null,recordingSettingsId=null;
function selectLatestRecording(ref=null){
 const last=[...sounds.values()].filter(sound=>sound.origin==='microphone'&&sound.data
  &&(ref?sound.capture?.sourceRef===ref||toolbox?.sounds.has(sound.id):!sound.capture?.sourceRef))
  .sort((a,b)=>String(b.capture?.recordedAt||'').localeCompare(String(a.capture?.recordedAt||'')))[0];
 lastTakeId=last?.id||null;
}
function updateLiveControls(){
 const button=$('liveRecord'),hot=liveTake?.state==='recording';
 button.disabled=recording||exportBusy||activeCamera||Boolean(liveTake&&liveTake.state!=='recording');
 button.classList.toggle('hot',hot);
 button.textContent=hot?'■ Rec':'● Rec';
 button.title=hot?'Finish voice recording':'Record voice';
 button.setAttribute('aria-pressed',String(hot));
 button.setAttribute('aria-label',button.title);
 $('saveTake').disabled=recording||!(lastTakeId||lastVideoTakeId&&toolbox?.files().has(lastVideoTakeId))||Boolean(liveTake)||activeCamera||exportBusy;
 $('liveIndicator').hidden=!hot;
 for(const id of ['sxPickVideo','sxPickProject','videoFile','loadProject','soundProjects','openToolbox','addEffect','back','forward','restart','toolboxAdd','toolboxFiles','cameraRecord']){
  $(id).disabled=recording||activeCamera||Boolean(liveTake);
 }
 for(const button of document.querySelectorAll('.sx-discover'))button.disabled=recording||Boolean(liveTake);
 updateInsertionNavigation();
}
function stopLiveTake(){
 const t=liveTake;
 if(!t)return;
 t.cancelled=true;
 if(t.recorder?.state==='recording')t.recorder.stop();
}
function releaseLiveTake(t){
 clearInterval(t.timer);
 t.stream?.getTracks().forEach(track=>track.stop());
 if(liveTake===t)liveTake=null;
 updateLiveControls();
}
async function startLiveTake(){
 if(liveTake||activeCamera||recording||exportBusy)return;
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Live recording needs a supported browser on HTTPS.');
 await libraryReady;
 if(liveTake||activeCamera||recording||exportBusy)return;
 const t={state:'requesting',chunks:[],bytes:0,cancelled:false};
 liveTake=t;
 updateLiveControls();message('Allow microphone access to record your voice.');
 try{
  t.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
  if(t.cancelled||document.hidden){releaseLiveTake(t);return message('Recording cancelled.');}
  await audioContext();
  if(t.cancelled){releaseLiveTake(t);return;}
  t.sourceRef=videoRef;
  t.sourceName=videoFile?.name||null;
  t.withVideo=Boolean(videoFile&&video.readyState>=2&&currentTime()<sourceEnd()-.0005);
  t.fps=num($('sourceFps').value,1,120);
  const mimeType=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported(type));
  t.recorder=new MediaRecorder(t.stream,mimeType?{mimeType,audioBitsPerSecond:128000}:undefined);
  t.recorder.ondataavailable=event=>{
   if(event.data?.size){t.chunks.push(event.data);t.bytes+=event.data.size;if(t.bytes>32*1024*1024)stopLiveTake();}
  };
  t.recorder.onerror=event=>{recordIssue('live-record',event.error||event);t.error='Microphone recording interrupted.';stopLiveTake();};
  t.recorder.onstop=()=>finishLiveTake(t).catch(error=>{recordIssue('save-live-take',error);releaseLiveTake(t);message(error.message);});
  t.recorder.onstart=()=>{
   if(t.cancelled){t.recorder.stop();return;}
   t.start=t.withVideo?Math.min(sourceEnd(),currentTime()):0;
   t.startedAt=new Date().toISOString();
   t.clock=performance.now();
   t.state='recording';
   updateLiveControls();$('liveElapsed').textContent='0:00';
   t.timer=setInterval(()=>{
    const elapsed=(performance.now()-t.clock)/1000;
    $('liveElapsed').textContent=stamp(elapsed);
    if(elapsed>=600)stopLiveTake();
   },200);
   message('Recording. Tap Rec to finish.');
   if(t.withVideo&&video.paused)video.play().catch(error=>{
    t.error='Playback could not start. The raw take is available in Toolbox.';
    t.withVideo=false;recordIssue('record-playback',error);stopLiveTake();
   });
  };
  t.stream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{t.error='Microphone disconnected.';stopLiveTake();},{once:true}));
  t.recorder.start(1000);
 }catch(error){releaseLiveTake(t);throw Error(error.name==='NotAllowedError'?'Microphone permission was declined. Tap Rec to try again.':error.message);}
}
async function finishLiveTake(t){
 if(t.state==='saving')return;
 t.state='saving';clearInterval(t.timer);t.stream?.getTracks().forEach(track=>track.stop());updateLiveControls();
 const blob=new Blob(t.chunks,{type:t.recorder.mimeType||'audio/webm'});t.chunks=[];
 if(!blob.size||!t.startedAt){releaseLiveTake(t);return message(t.error||'No microphone audio captured.');}
 const extension=blob.type.includes('mp4')?'m4a':blob.type.includes('ogg')?'ogg':'webm';
 const title=(t.sourceName||'Voice').replace(/\.[^.]+$/,'').replace(/[^\p{L}\p{N}_-]+/gu,'_').slice(0,70)||'Voice';
 const name=title+'_Rec_'+t.startedAt.replace(/[:.]/g,'-')+'.'+extension;
 const data=new Uint8Array(await blob.arrayBuffer()),id='custom-'+uid();
 let decoded=null;
 try{decoded=await ctx.decodeAudioData(data.slice().buffer);}catch(error){recordIssue('decode-live-take',error);}
 const length=decoded?.duration||Math.max(0,(performance.now()-t.clock)/1000);
 const capture={recordedAt:t.startedAt,mode:t.withVideo?'video-sync':'standalone',sourceVideo:t.sourceName,sourceRef:t.sourceRef,
  startSeconds:t.withVideo?t.start:null,endSeconds:t.withVideo?t.start+length:null,recordedDurationSeconds:length,
  startFrame:t.withVideo?Math.round(t.start*t.fps):null,sourceFps:t.withVideo?t.fps:null,microphoneOnly:true};
 sounds.set(id,{id,name,category:'My sounds',duration:length,builtin:false,origin:'microphone',mimeType:blob.type,
  capture,data:to64(data),buffer:decoded,_lastUse:++cacheClock});
 lastTakeId=id;lastVideoTakeId=null;toolbox.sounds.add(id);sxActivate();
 let saveError;
 try{await saveCustom();}catch(error){saveError=error;recordIssue('save-live-audio',error);}
 const placed=Boolean(decoded&&t.withVideo&&t.sourceRef===videoRef&&length>=.05&&t.start<sourceEnd());
 if(placed)clips.push({id:uid(),soundId:id,start:t.start,offset:0,duration:Math.min(length,sourceEnd()-t.start),volume:100,enabled:true,loop:false});
 releaseLiveTake(t);renderCategories();renderLibrary();renderClips();refreshToolbox();flushProject();trimDecoded(id);
 message(saveError?'Browser storage failed. Use Save Rec to download the raw audio.':(t.error?t.error+' ':'')+
  (placed?'Recording saved in Toolbox and placed at '+stamp(t.start)+'.':'Raw recording saved in Toolbox.'));
}
$('liveRecord').onclick=guard(async()=>liveTake?stopLiveTake():startLiveTake());
$('saveTake').onclick=()=>lastTakeId?openRecordingSettings(lastTakeId):openVideoRecordingSettings(lastVideoTakeId);
/* Bed transport is independent of microphone recorder. */
updateLiveControls();
function updateViewerDock(){const controls=document.querySelector('.sticky');document.documentElement.style.setProperty('--transport-height',Math.ceil(controls.getBoundingClientRect().height)+'px');}
$('viewerSection').addEventListener('toggle',updateViewerDock);window.addEventListener('resize',updateViewerDock);if(window.ResizeObserver)new ResizeObserver(()=>requestAnimationFrame(updateViewerDock)).observe(document.querySelector('.sticky'));updateViewerDock();

for(const [type,label]of [['video/mp4','MP4 · original picture / AAC'],['video/webm','WebM · timestamped export']])$('format').add(new Option(label,type));
window.addEventListener('pagehide',()=>{stopLiveTake();stopAuditions();flushProject()});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopLiveTake();stopAuditions();flushProject()}});window.addEventListener('beforeunload',e=>{if(liveTake||activeCamera||recoveryPending){e.preventDefault();e.returnValue=''}});window.addEventListener('error',e=>recordIssue('window',e.error||e.message));window.addEventListener('unhandledrejection',e=>recordIssue('promise',e.reason));$('copyDiagnostics').onclick=()=>copy(JSON.stringify({version:health.version,currentPhase:exportPhase,clips:clips.length,libraryRecordings:[...sounds.values()].filter(s=>s.recording).length,decodedBytes:[...sounds.values()].reduce((n,s)=>n+(s.buffer?s.buffer.length*s.buffer.numberOfChannels*4:0),0),...health},null,2));wireSheet();renderCategories();renderLibrary();renderClips();updateBed();updateMixer();draw();setBusy(true);recoveryStatus('Restoring project and assets…');libraryReady=(async()=>{let state=null;try{toolbox=await toolboxReady;await loadLibrary();const discovered=await discoverEffectDirectory();if(discovered)$('libraryInfo').textContent+=' · '+discovered+' directory recordings'}catch(e){recordIssue('library',e);$('libraryInfo').textContent=e.message}try{let local=null,stored=null;try{local=JSON.parse(localStorage.getItem(KEY)||'null')}catch{try{local=JSON.parse(localStorage.getItem(KEY+'-previous')||'null')}catch{}}try{stored=(await readStored('projects','current'))?.state}catch(e){recordIssue('read-project',e)}state=local&&(!stored||(local.savedAt||0)>=(stored.savedAt||0))?local:stored;let previous=null;try{previous=JSON.parse(localStorage.getItem(KEY+'-previous')||'null')}catch{}await restoreCustomLibrary([local,stored,previous]);
 if(stored?.toolbox){
  restore(stored);
  await restoreAssets(stored);
  sxActivate();
  recoveryStatus('Restored last project from this browser');
  message('Project and stored assets restored.');
 }else{
  recoveryStatus(state?'Previous project preserved · open a project file to resume':'Clean slate · choose video or project');
  message('Choose a video to start clean, or open a saved project.');
 }
 }catch(e){recordIssue('restore-assets',e);recoveryStatus('Recovery incomplete: '+e.message,true);message(e.message)}finally{projectReady=true;setBusy(false);renderCategories();renderLibrary();renderClips();updateViewerDock()}try{if(localStorage.getItem(KEY+'-export')){message('Previous export was interrupted. Project recovery has finished.');savePhase(null)}}catch{}})();window.toolsHubState=()=>snapshot();window.SxLock={currentTime,snapshot,sounds,synth,wav,insert,restore,audioContext,buffer,duration,clipWindow,placeSource,frameStep,openSheet,runExport,pcm16,wavHeader,trimDecoded,prepareWindow,ready:libraryReady,recoveredScribes:()=>recoveredScribes,diagnostics:()=>({exportBusy,active:active.length,auditions:auditions.length,decodedBytes:[...sounds.values()].reduce((n,s)=>n+(s.buffer?s.buffer.length*s.buffer.numberOfChannels*4:0),0),errors:health.errors})};
// Trusted Jokelet Library handoff: receive the actual rendered file, preserving the prior project.
const JOKELET_ORIGINS=new Set(['https://jokelab-tone-workbench.briskpear.chatgpt.site','https://keythjyles.github.io']);
let handoffBusy=false;const receivedHandoffs=new Set();
window.addEventListener('message',async event=>{
 if(!JOKELET_ORIGINS.has(event.origin)||!event.source||event.source!==window.opener)return;
 const data=event.data;if(!data||typeof data.id!=='string'||data.id.length>100)return;
 const reply=(type,extra={})=>event.source.postMessage({type,id:data.id,...extra},event.origin);
 if(data.type==='GS_JOKELET_PING'){await libraryReady;reply('SXLOCK_JOKELET_READY',{protocol:1});return;}
 if(data.type!=='GS_JOKELET_VIDEO'||handoffBusy||receivedHandoffs.has(data.id))return;
 if(!(data.video instanceof Blob)||!data.video.type.startsWith('video/')||data.video.size<1||data.video.size>450*1024*1024||data.plan?.schema!=='GS-Assembly-1.0'||data.plan.review?.satisfied!==true){reply('SXLOCK_JOKELET_ERROR',{error:'Invalid or unreviewed assembly.'});return;}
 handoffBusy=true;let previous=null;
 try{
  await libraryReady;if(exportBusy||liveTake||recording)throw Error('Finish the current SxLock recording or export first.');
  pauseForEdit();await flushProject();await recoveryQueue;previous=snapshot(true);
  const backupId='before-jokelet-'+uid(),database=await db();
  try{await new Promise((resolve,reject)=>{const tx=database.transaction('projects','readwrite');tx.objectStore('projects').put({id:backupId,state:previous,savedAt:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Previous project could not be saved.'));});}finally{database.close();}
  setBusy(true);projectReady=false;
  clips=[];renderClips();$('bed').value=100;updateBed();$('sourceFps').value=String(data.plan.target?.fps||25);$('fps').value=String(data.plan.target?.fps||25);$('filename').value=String(data.name||'Jokelet_assembly').replace(/\.[^.]+$/,'')+'_SFX_v01';$('notes').value='Jokelet assembly handoff\n'+JSON.stringify(data.plan,null,2);
  const file=new File([data.video],String(data.name||'Jokelet_assembly.webm').slice(0,150),{type:data.video.type});
  sxActivate();await loadVideo(file,{restoring:true});await new Promise((resolve,reject)=>{if(video.readyState>=1)return resolve();const timer=setTimeout(()=>reject(Error('Rendered video did not load.')),30000);video.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve();},{once:true});video.addEventListener('error',()=>{clearTimeout(timer);reject(Error('This browser cannot read the rendered video.'));},{once:true});});
  projectReady=true;await flushProject();await recoveryQueue;const storedVideo=await readStored('videos',videoRef);if(!storedVideo?.blob||storedVideo.blob.size!==file.size)throw Error('Video opened but could not be retained. Download the video and free browser storage before retrying.');receivedHandoffs.add(data.id);$('viewerSection').open=true;updateViewerDock();
  let box=$('jokeletHandoff');if(!box){box=document.createElement('div');box.id='jokeletHandoff';box.className='savebox';$('status').after(box);}box.replaceChildren();const note=document.createElement('p');note.textContent='Jokelet assembly opened. Previous project and original media preserved.';const backup=document.createElement('button');backup.textContent='Download previous project';backup.onclick=()=>download(new Blob([JSON.stringify(previous,null,2)],{type:'application/json'}),'SxLock_before_jokelet_'+backupId+'.json');box.append(note,backup);
  message('Assembly video ready for sound effects. Original soundtrack at 100%; no previous insertions applied.');reply('SXLOCK_JOKELET_LOADED',{name:file.name,duration:video.duration});
 }catch(error){if(previous){try{restore(previous);await restoreAssets(previous);}catch(restoreError){recordIssue('jokelet-rollback',restoreError);}}recordIssue('jokelet-handoff',error);message('Jokelet handoff: '+error.message);reply('SXLOCK_JOKELET_ERROR',{error:error.message});}
 finally{projectReady=true;handoffBusy=false;setBusy(false);}
});

async function openCloudSource(){
 const params=new URLSearchParams(location.search),asset=params.get('asset');
 if(!asset)return;
 if(!/^[A-Za-z0-9_. ()-]+\.(mp4|webm|mov)$/i.test(asset))throw Error('Invalid source filename.');
 const requestId=asset+'|'+(params.get('session')||'default');
 if(localStorage.getItem(KEY+'-cloud-open')===requestId&&videoFile?.name===asset)return;
 if(exportBusy||liveTake||recording)throw Error('Finish the current recording or export before opening a source.');
 message('Loading source video…');
 const key=localStorage.getItem('gs_previewlock_key')||'';
 if(!key)throw Error('Open connected PreviewLock on this browser first, then reopen this SxLock link.');
 const lookup=await fetch('https://gs-previewlock-api.onrender.com/api/playback?path='+encodeURIComponent('/Grill Sergeant/Animation Lab/GS_EP4/'+asset),{headers:{Authorization:'Bearer '+key}});
 if(!lookup.ok)throw Error('Source lookup failed: '+lookup.status);
 const media=await lookup.json(),response=await fetch(media.url);
 if(!response.ok)throw Error('Source download failed: '+response.status);
 const blob=await response.blob();
 if(!blob.size)throw Error('Source video is empty.');
 await flushProject();await recoveryQueue;
 const previous=snapshot(true),database=await db(),backupId='before-cloud-'+uid();
 try{await new Promise((resolve,reject)=>{const tx=database.transaction('projects','readwrite');tx.objectStore('projects').put({id:backupId,state:previous,savedAt:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Backup failed.'));});}finally{database.close();}
 setBusy(true);
 try{
  stopEffects();stopAuditions();restoredPlayhead=0;
  sxActivate();await loadVideo(new File([blob],asset,{type:blob.type||'video/mp4'}));
  await new Promise((resolve,reject)=>{if(video.readyState>=1)return resolve();const timer=setTimeout(()=>reject(Error('Source metadata did not load.')),30000);video.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve()},{once:true});video.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Source video cannot be decoded.'))},{once:true});});
  clips=[];$('bed').value=100;$('effectsBus').value=100;$('voiceBus').value=100;updateBed();updateMixer();renderClips();
  $('sourceFps').value='25';$('fps').value='25';video.currentTime=0;
  $('notes').value='Clean source handoff. Source soundtrack at 100%; zero effect or voice insertions. Previous project backed up as '+backupId;
  $('viewerDock').classList.remove('collapsed');$('viewerDock').hidden=false;
  await flushProject();await recoveryQueue;
  localStorage.setItem(KEY+'-cloud-open',requestId);updateViewerDock();
  message('Clean source ready · original audio 100% · 0 effects · 0 voice insertions.');window.scrollTo({top:0,behavior:'instant'});
 }catch(e){restore(previous);await restoreAssets(previous);throw e}
 finally{setBusy(false)}
}

// Owner-approved acquisition is a live library update, never a timeline insertion.
function approvalCredit(sound){
 const license=String(sound.license||'');
 return /(?:\bCC[ -]BY\b|\battribution\b)/i.test(license)
  ?[sound.name+(sound.author?' by '+sound.author:''),sound.source,license,sound.licenseURL].filter(Boolean).join(' · '):'';
}
function syncApprovedEffects(entries){
 const ids=new Set(entries.map(v=>v.id));let changed=false;
 for(const [id,sound]of sounds){if(sound.origin!=='scrubber'||ids.has(id))continue;if(clips.some(c=>c.soundId===id)||toolbox?.sounds.has(id)){if(!sound.hidden){sound.hidden=true;changed=true}}else{sounds.delete(id);changed=true}}
 for(const v of entries){
  const old=sounds.get(v.id),sha=v.sha256||v.id;
  const metadata={id:v.id,name:displaySoundName(v),category:v.category||'Other sounds',subcategory:v.subcategory||'',classification:v.classification,origin:'scrubber',scrubberSourceId:v.sourceId,sourceId:v.sourceId,cloudAssetId:v.cloudAssetId||null,storageProvider:v.storageProvider||null,cloudPath:v.cloudReceipts?.dropbox?.path||null,cloudReceipts:v.cloudReceipts||{},storedBytes:v.storedBytes,sha256:sha,duration:Number(v.duration)||old?.duration||0,source:v.source||'',author:v.author||'',license:v.license||'User approved; source metadata retained',licenseURL:v.licenseURL||'',attribution:approvalCredit(v),tags:[...(v.tags||[]),...(v.aliases||[]),v.subcategory||'','approved','scrubber'],builtin:true,recording:true,hidden:false,addedIn:'scrubber'};
  const signature=JSON.stringify(metadata);
  if(old?._approvalSignature===signature)continue;
  const same=old&&old.sha256===sha;
  sounds.set(v.id,{...old,...metadata,_approvalSignature:signature,...(!same?{buffer:null,loading:null}:{})});changed=true;
 }
 if(changed){renderCategories();renderLibrary();renderClips();refreshToolbox();}
 const info=$('libraryInfo');if(info){info.dataset.baseInfo=info.dataset.baseInfo||info.textContent.replace(/ · \d+ approved effects$/,'');info.textContent=info.dataset.baseInfo+' · '+entries.length+' approved effects';}
}
libraryReady.then(()=>window.GSApprovedEffects?.subscribe(syncApprovedEffects));


function showClassification(sound){
 let box=$('soundClassification');if(!box){box=document.createElement('details');box.id='soundClassification';const summary=document.createElement('summary');summary.textContent='Category & search tags';box.append(summary);for(const [id,label]of [['soundCategory','Category'],['soundSubcategory','Subcategory'],['soundTags','Tags, separated by commas']]){const wrap=document.createElement('label'),input=document.createElement('input');input.id=id;input.type='text';input.maxLength=id==='soundTags'?1600:80;wrap.textContent=label;wrap.append(input);box.append(wrap)}const save=document.createElement('button');save.type='button';save.textContent='Save category';save.onclick=async()=>{const id=box.dataset.sourceId;save.disabled=true;try{await window.GSApprovedEffects.updateClassification(id,{category:$('soundCategory').value,subcategory:$('soundSubcategory').value,tags:$('soundTags').value.split(','),aliases:sounds.get('scrubber-'+id)?.classification?.aliases||[]});$('sheetStatus').textContent='Category saved.'}catch(e){$('sheetStatus').textContent=e.message}finally{save.disabled=false}};box.append(save);$('selectedSource').after(box)}
 box.hidden=sound.origin!=='scrubber';box.open=false;if(box.hidden)return;box.dataset.sourceId=sound.sourceId;$('soundCategory').value=sound.category;$('soundSubcategory').value=sound.subcategory||'';$('soundTags').value=(sound.classification?.tags||sound.tags||[]).join(', ');
}

window.SxLock.cloudReady=libraryReady.then(openCloudSource).catch(e=>{recordIssue('cloud-source',e);message(e.message)});


async function installProductionBridge(adapter,assetBlob){
 const [{createProjectPicker},P,{saveProductionStage}]=await Promise.all([import('../studio/project-picker.mjs?v=6-stages'),import('../../shared/production-stages.mjs?v=1'),import('../../shared/production-client.mjs?v=1')]);
 let current=null,opening=false;
 const api=async(path,options={})=>{const key=localStorage.getItem('gs_previewlock_key');if(!key)throw Error('Use the existing PreviewLock connection in this browser.');const r=await fetch('https://gs-previewlock-api.onrender.com'+path,{...options,headers:{Authorization:'Bearer '+key,...options.headers},signal:AbortSignal.timeout(65000)}),d=await r.json();if(!r.ok)throw Error(d.error||'Project request failed.');return d;};
 async function open(record){
  if(opening)throw Error('A project is already opening.');opening=true;let previous;
  try{await libraryReady;await recoveryQueue;if(exportBusy||recording||liveTake)throw Error('Finish the current recording or export first.');message('Opening saved captioned joke…');pauseForEdit();await flushProject();previous=snapshot(true);const database=await db();try{await new Promise((resolve,reject)=>{const tx=database.transaction('projects','readwrite');tx.objectStore('projects').put({id:'before-stage-'+uid(),state:previous,savedAt:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}finally{database.close();}
   const d=await api('/api/joke-project?id='+encodeURIComponent(record.id)),p=d.project,bed=P.stageAsset(p,'captioned');if(!bed)throw Error('This joke has no current video ready for SX. Show all files to use other media.');
   const saved=p.studio?.modules?.sound?.session,session=saved?.bed?.id===bed.id?saved:{bed,state:null};await adapter.open({project:p,session:{...session,bed}});current={id:p.id,bed};$('soundNext').hidden=false;$('soundStageName').textContent=p.title+' · Ready for SX';message(p.title+' · captioned video opened · original soundtrack retained.');
  }catch(e){if(previous){try{restore(previous);await restoreAssets(previous);}catch(error){recordIssue('stage-rollback',error);}}throw e;}finally{opening=false;}
 }
 adapter.productionOpened=(p,bed)=>{if(!bed||P.stageAsset(p,'captioned')?.id!==bed.id)return;current={id:p.id,bed};$('soundNext').hidden=false;$('soundStageName').textContent=p.title+' · Ready for SX';};
 if(adapter.currentProduction)adapter.productionOpened(adapter.currentProduction.p,adapter.currentProduction.bed);
 const picker=createProjectPicker({api,module:'sound',hasProject:()=>true,onPause:pauseForEdit,onOpenProject:open,onLocal:()=>$('loadProject').click(),onUseAsset:async(p,a)=>{if(p&&P.stageAsset(p,'captioned')?.id===a.id)return open(p);const b=await assetBlob(a);sxActivate();await loadVideo(new File([b],a.name,{type:b.type||'video/mp4'}));current=null;$('soundNext').hidden=true;}});
 $('sxPickProject').onclick=()=>picker.open().catch(e=>message(e.message));
 $('soundProjects').onclick=()=>picker.open().catch(e=>message(e.message));
 $('soundNext').onclick=()=>runExport('jokelet stage',async()=>{
  if(!current)throw Error('Open a ready-for-SX project first.');
  const p=(await api('/api/joke-project?id='+encodeURIComponent(current.id))).project;
  if(!videoFile||videoFile.name!==current.bed.name||videoFile.size!==current.bed.size)throw Error('The source changed. Reopen this joke’s stage project before advancing.');
  const session=await adapter.checkpoint({project:p}),fresh=await api('/api/joke-project?id='+encodeURIComponent(p.id));
  let d=await api('/api/joke-project/studio?id='+encodeURIComponent(p.id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rev:fresh.rev,module:'sound',moduleRevision:fresh.project.studio?.modules?.sound?.revision||0,nextPhase:'review',requestId:crypto.randomUUID(),session})});
  const result=await videoExport();if(cancelled)throw Error('Export cancelled.');if(result.blob.size>40*1024*1024)throw Error('The jokelet exceeds the existing 40 MB project-file limit. Its sound project is saved.');
  const version=1+(d.project.production?.records||[]).filter(r=>r.stage==='jokelet').length,name=P.stageFilename(d.project.title,'jokelet',version);
  d=await api('/api/joke-project/asset?id='+encodeURIComponent(p.id)+'&role=stage&name='+encodeURIComponent(name),{method:'POST',headers:{'content-type':'application/octet-stream'},body:result.blob});
  d=await saveProductionStage(api,p.id,d.asset,'jokelet',{recipe:P.soundRecipe(session),report:result.report});
  exported=new File([result.blob],d.record.fileName,{type:'application/octet-stream'});$('download').textContent='Save';$('share').disabled=!(navigator.canShare&&navigator.canShare({files:[exported]}));$('exportName').textContent=d.record.fileName+' · Ready for music / outro';$('soundStageName').textContent=p.title+' · Ready for music / outro';message('Jokelet saved with its editable sound pass. Music / outro remains the next stage. Drive backup is pending.');
 });
 const params=new URLSearchParams(location.search);if(params.get('production'))open({id:params.get('production')}).catch(e=>{recordIssue('production-open',e);message(e.message);});
}

import('../studio/adapter.mjs?v=1').then(({installAdapter,assetBlob,storeAsset})=>import('../studio/core.mjs?v=1').then(({moduleSession,preferredBed})=>{
 let studioBed=null,studioSoundRefs={},studioToolboxRefs={};const adapterNotify=(p,bed)=>soundAdapter.productionOpened?.(p,bed);
 const soundAdapter={
  busy:()=>exportBusy||recording||activeCamera||!!liveTake,
  pause:pauseForEdit,
  async open({project:p,session}){
   await libraryReady;await recoveryQueue;pauseForEdit();
   const state=structuredClone(session?.state||{schema:'SxLock-1.0',version:'1.8',sourceFps:25,clips:[],sounds:[],recordings:[],notes:'',filename:p.title+'_sound_v01',videoVolume:100,mixer:{effects:100,voice:100}});
   const stages=await import('../../shared/production-stages.mjs?v=1');studioBed=stages.stageAsset(p,'captioned')||(p.studio?.bedAssetId?preferredBed(p):null)||session?.bed||preferredBed(p);studioSoundRefs=session?.soundRefs||{};studioToolboxRefs=session?.toolboxRefs||{};
   for(const a of state.sounds||[]){const ref=studioSoundRefs[a.id];if(ref){a.data=to64(new Uint8Array(await (await assetBlob(ref)).arrayBuffer()));}}
   for(const a of state.recordings||[]){const ref=studioSoundRefs[a.id];if(ref)sounds.set(a.id,{...a,url:'dropbox:'+ref.path,origin:'studio',studioOriginalOrigin:a.origin||'recording',builtin:true,recording:true,buffer:null});}
   projectReady=false;setBusy(true);
   try{sxActivate();restore(state);
    const missing=[];
    for(const file of state.toolbox?.files||[]){
     const ref=studioToolboxRefs[file.id];
     if(ref){
      const blob=await assetBlob(ref);
      toolbox.restoreFile(file.id,new File([blob],file.name,{type:file.type,lastModified:file.lastModified}));
     }else missing.push(file);
    }
    toolbox.restoreMissingFiles(missing);
    visualLayer.reconnect();selectLatestVideoRecording(state.toolbox?.lastCameraId);
    if(studioBed){const b=await assetBlob(studioBed);await loadVideo(new File([b],studioBed.name,{type:b.type||'video/mp4'}),{restoring:true});await sourceReady;seekProject(state.playheadSeconds||0);}selectLatestRecording(state.videoRef);renderClips();updateMixer();pauseForEdit();}
   finally{projectReady=true;setBusy(false);updateViewerDock();}
   soundAdapter.currentProduction={p,bed:studioBed};adapterNotify(p,studioBed);message(p.title+' · sound pass restored · original soundtrack preserved');
  },
  async checkpoint({project:p}){
   pauseForEdit();await flushProject();await recoveryQueue;
   if(videoFile&&(!studioBed||studioBed.name!==videoFile.name||studioBed.size!==videoFile.size)){studioBed=(await storeAsset(p.id,videoFile,videoFile.name,'bed')).asset;}
   const state=snapshot(true),used=new Set([...state.clips.map(c=>c.soundId),...state.toolbox.sounds]);state.sounds=state.sounds.filter(s=>used.has(s.id));state.recordings=state.recordings.filter(s=>used.has(s.id));
   for(const a of state.recordings){if(!studioSoundRefs[a.id]){const live=sounds.get(a.id),bytes=await recordedBytes(live),name=(a.name||a.id).replace(/[\\/<>:"|?*\x00-\x1f]/g,'_')+( /\.[a-z0-9]{2,5}$/i.test(a.name||'')?'':'.mp3');studioSoundRefs[a.id]=(await storeAsset(p.id,new Blob([bytes],{type:a.mimeType||'audio/mpeg'}),name,'sound')).asset;}}
   for(const a of state.recordings)delete a.data;
   for(const a of state.sounds){if(a.data&&!studioSoundRefs[a.id]){const bytes=from64(a.data),name=(a.name||a.id).replace(/[\\/<>:"|?*\x00-\x1f]/g,'_');studioSoundRefs[a.id]=(await storeAsset(p.id,new Blob([bytes],{type:a.mimeType||'audio/wav'}),name,'sound')).asset;}delete a.data;}
   for(const file of state.toolbox.files){
    const blob=toolbox.files().get(file.id);
    if(!blob||studioToolboxRefs[file.id])continue;
    const role=blob.type.startsWith('image/')?'image':blob.type.startsWith('video/')?'animation':'review';
    studioToolboxRefs[file.id]=(await storeAsset(p.id,blob,file.name,role)).asset;
   }
   const toolboxRefs=Object.fromEntries(state.toolbox.files.map(file=>[file.id,studioToolboxRefs[file.id]]).filter(([,asset])=>asset));
   state.video=studioBed?.name||null;
   return moduleSession('sound',p.id,{state,bed:studioBed,soundRefs:studioSoundRefs,toolboxRefs});
  }
 };installAdapter('sound',soundAdapter);
 installProductionBridge(soundAdapter,assetBlob).catch(e=>{recordIssue('production-bridge',e);message(e.message);});
}));

})();

