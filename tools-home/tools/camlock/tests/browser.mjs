import {stateAt,drawScene} from '../core.mjs';
import {Input,ALL_FORMATS,BlobSource,CanvasSink,EncodedPacketSink,AudioBufferSink} from '../../sxlock/vendor/mediabunny-1.62.1-gs1.mjs';
const iframe=document.getElementById('app'),results=document.getElementById('results'),rows=[];
const log=(name,data={})=>{rows.push({name,pass:true,...data});results.textContent=JSON.stringify({status:'running',checks:rows},null,2);};
const assert=(value,text)=>{if(!value)throw Error(text);};
const close=(a,b,e=.001)=>Math.abs(a-b)<e;
const wait=async(fn,timeout=15000)=>{const start=performance.now();while(!fn()){if(performance.now()-start>timeout)throw Error('Timed out: '+fn.toString().slice(0,120));await new Promise(r=>setTimeout(r,25));}};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
document.getElementById('run').onclick=async()=>{
 rows.length=0;document.getElementById('run').disabled=true;let inputs=[];
 try{
  localStorage.removeItem('gs-camlock-project-v1-qa');localStorage.removeItem('gs-camlock-project-v1-qa-player-docked');
  await new Promise(resolve=>{iframe.onload=resolve;iframe.src='../?qa=acceptance&run='+Date.now();});
  await wait(()=>iframe.contentWindow.CamLock);
  const w=iframe.contentWindow,d=w.document,app=w.CamLock,$=id=>d.getElementById(id),v=app.sourceVideo;
  const response=await fetch(new URLSearchParams(location.search).get('source')||'/camlock-fixture.mp4');assert(response.ok,'Fixture source unavailable');
  const source=new w.File([await response.blob()],'CamLock_Source_Fixture.mp4',{type:'video/mp4',lastModified:1});
  await app.loadSource(source);await wait(app.sourceReady);log('Real source loads',{duration:v.duration,width:v.videoWidth,height:v.videoHeight});
  async function field(id,value){const el=$(id);el.value=String(value);el.dispatchEvent(new w.Event('change',{bubbles:true}));await delay(0);}
  function pointer(type,id,x,y){const rect=$('viewport').getBoundingClientRect();$('viewport').dispatchEvent(new w.PointerEvent(type,{pointerId:id,pointerType:'touch',isPrimary:id===1,clientX:rect.left+x,clientY:rect.top+y,button:0,buttons:type==='pointerup'?0:1,bubbles:true,cancelable:true}));}
  const viewportTop=()=>$('viewport').getBoundingClientRect().top;
  assert(close(viewportTop(),0),'Player picture is not flush with the top');
  const grip=$('dockHandle');
  for(const [type,y]of [['pointerdown',10],['pointermove',65],['pointerup',65]])grip.dispatchEvent(new w.PointerEvent(type,{pointerId:501,pointerType:'touch',clientY:y,bubbles:true,cancelable:true}));grip.click();
  assert(!$('sourceDrawer').hidden&&$('dockPlayer').closest('#sourceDrawer')&&$('unlockPlayer').closest('#sourceDrawer'),'Pull-down did not reveal top docking controls');
  $('unlockPlayer').click();assert(w.getComputedStyle($('player')).position==='relative','Unlock did not release the player');
  $('dockPlayer').click();assert($('sourceDrawer').hidden&&close(viewportTop(),0),'Dock did not return the picture to the top');log('Player itself docks at y=0; top pull-down exposes Dock and Unlock');
  assert(!app.snapshot().settings.rotation.enabled&&app.snapshot().settings.rotation.snap,'Rotation/snap defaults incorrect');
  $('wizard').click();assert($('settingsCard').open&&$('wizardPrompt').textContent.includes('open'),'Wizard did not present opening question');assert($('action').disabled,'Wizard prematurely armed Action');
  const openingDefaults=JSON.stringify(app.snapshot().stage);assert(app.snapshot().stage.locked&&$('outputWidth').disabled&&$('opening').disabled,'Wizard opening defaults are not locked');
  pointer('pointerdown',601,40,40);pointer('pointermove',601,80,90);pointer('pointerup',601,80,90);assert(JSON.stringify(app.snapshot().stage)===openingDefaults,'Locked wizard let the stage stray');
  for(const [width,height]of [[320,640],[390,844],[430,844]]){iframe.style.width=width+'px';iframe.style.height=height+'px';await delay(30);const box=$('settingsCard').getBoundingClientRect(),next=$('wizardNext').getBoundingClientRect();assert(box.top>=0&&box.top<=20&&box.bottom<=height+1,'Wizard is not high and inside the screen');assert(next.top>=box.top&&next.bottom<=height+1,'Wizard Next is clipped');}
  iframe.style.width='390px';iframe.style.height='844px';await delay(30);
  assert($('sourceTiming').textContent.includes('Length 4.000s')&&$('wizardSourceTiming').textContent.includes('Remaining 4.000s'),'Source length/remaining missing');
  app.seek(1);await wait(()=>!v.seeking);assert($('wizardClock').textContent.includes('F25')&&$('wizardSourceTiming').textContent.includes('Elapsed 1.000s')&&$('wizardSourceTiming').textContent.includes('Remaining 3.000s'),'Wizard readout did not follow navigation');app.seek(0);await wait(()=>!v.seeking);
  log('Wizard opens high with locked defaults and live source length, elapsed, remaining, frame and time');
  $('wizardOpeningLock').click();assert(!app.snapshot().stage.locked&&!$('outputWidth').disabled,'Explicit Unlock opening did not enable composition');
  await field('outputWidth',180);await field('outputHeight',320);await field('opening',.4);await wait(()=>!v.seeking&&app.sourceReady());
  const before=app.snapshot().stage;pointer('pointerdown',101,40,40);pointer('pointermove',101,45,50);pointer('pointerup',101,45,50);
  assert(app.snapshot().stage.y>before.y,'Stage source did not follow setup drag');log('Stage setup drag operates independently');
  $('wizardNext').click();await delay(0);assert($('wizardPrompt').textContent.includes('effect'),'Wizard effect question missing');
  $('wizardEffect').value='combined';$('wizardEffect').dispatchEvent(new w.Event('change',{bubbles:true}));await delay(0);
  await field('zoomEnd',140);await field('zoomDuration',.4);await field('rotationDegrees',45);await field('rotationDuration',.2);
  assert(close(app.snapshot().settings.zoom.end,1.4),'Ending percent did not map to push multiplier');assert(app.snapshot().settings.rotation.enabled,'Rotation option did not turn rotation on');
  $('wizardNext').click();await delay(0);assert($('wizardPrompt').textContent.includes('long'),'Wizard duration question missing');await field('actionDuration',1.2);await field('speed',.5);
  $('wizardNext').click();await wait(()=>!$('settingsCard').open&&!v.seeking);assert(app.snapshot().stage.locked&&$('modeLabel').textContent.includes('HOT'),'Wizard did not arm the viewport');
  log('Wizard guides opening, effect and duration; only completion makes the screen hot');
  const completedWizard=app.snapshot();$('wizard').click();assert($('outputWidth').disabled&&app.snapshot().stage.locked,'Repeated wizard did not relock opening');
  $('wizardNext').click();await delay(0);$('wizardNext').click();await delay(0);$('trimEnabled').checked=true;$('trimEnabled').dispatchEvent(new w.Event('change',{bubbles:true}));await delay(0);await field('trimStart',.2);await field('trimEnd',2);
  $('closeSettings').click();assert(JSON.stringify(app.snapshot().stage)===JSON.stringify(completedWizard.stage)&&app.snapshot().trim===null,'Wizard cancel did not restore stage and output range');await wait(()=>!v.seeking);log('Wizard cancellation restores the opening and any tentative trim');
  d.querySelector('[data-section="magnification"]').click();assert($('settingsCard').open&&$('magnification').parentElement===$('cardBody'),'Push/Pull did not open in popup');
  const card=$('settingsCard').getBoundingClientRect();assert(card.top>=0&&card.bottom<=w.innerHeight+1,'Settings card is hidden below the player');assert($('zoomEnd').value==='140','Ending size is not shown as percent');
  $('settingsDone').click();log('Push/Pull card overlays the player with percent, seconds and plain speed choices');
  d.querySelector('[data-section="rotation"]').click();$('rotationEnabled').checked=false;$('rotationEnabled').dispatchEvent(new w.Event('change',{bubbles:true}));await delay(0);$('settingsDone').click();
  pointer('pointerdown',11,60,60);await wait(app.active);pointer('pointerdown',12,140,60);pointer('pointermove',12,60,140);assert(close(app.camera().r,0),'Second finger rotated while Rotation off');
  pointer('pointerup',12,60,140);pointer('pointerup',11,60,60);$('action').click();await wait(()=>!app.active());$('start').click();await wait(()=>!v.seeking);
  d.querySelector('[data-section="rotation"]').click();$('rotationEnabled').checked=true;$('rotationEnabled').dispatchEvent(new w.Event('change',{bubbles:true}));await delay(0);$('settingsDone').click();log('Rotation must be enabled before a second finger can rotate');
  d.querySelector('[data-section="direction"]').click();
  assert($('settingsCard').open&&$('direction').parentElement===$('cardBody'),'Direction settings are not in a popup card');
  assert($('touchSensitivity').value==='0.25','Quarter touch sensitivity is not the default');
  const pathBeforeControls=JSON.stringify(app.snapshot().path);await field('touchSensitivity',.25);await field('joystickSpeed',20);
  $('joystickEnabled').checked=true;$('joystickEnabled').dispatchEvent(new w.Event('change',{bubbles:true}));await delay(0);
  assert(JSON.stringify(app.snapshot().path)===pathBeforeControls,'Direction preferences changed an existing path');$('settingsDone').click();
  assert(!$('joystick').hidden,'Joystick switch did not show the control');
  d.querySelector('[data-section="magnification"]').click();await field('zoomEnd',100);$('settingsDone').click();
  d.querySelector('[data-section="rotation"]').click();$('rotationEnabled').checked=false;$('rotationEnabled').dispatchEvent(new w.Event('change',{bubbles:true}));await delay(0);$('settingsDone').click();
  $('start').click();await wait(()=>!v.seeking);pointer('pointerdown',71,30,30);await wait(app.active);const quarterBase=app.camera(),pictureWidth=$('viewport').getBoundingClientRect().width;
  pointer('pointermove',71,31,30);assert(close((app.camera().x-quarterBase.x)*pictureWidth,.25,.0001),'One touch pixel did not give a quarter pixel of camera travel');
  pointer('pointerup',71,31,30);app.pause();$('start').click();await wait(()=>!v.seeking);log('Quarter-pixel touch direction and preferences preserve existing trajectory');
  const stick=$('joystick');
  function stickPointer(type,id,x=0,y=0){const box=stick.getBoundingClientRect();stick.dispatchEvent(new w.PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:box.left+box.width/2+x,clientY:box.top+box.height/2+y,button:0,buttons:type==='pointerup'?0:1,bubbles:true,cancelable:true}));}
  stickPointer('pointerdown',81,0,0);await wait(app.active);const centered=app.camera(),centerTime=v.currentTime;
  await wait(()=>v.currentTime>centerTime+.1);assert(close(app.camera().x,centered.x),'Centered joystick drifted');assert($('action').disabled,'Editing enabled while holding joystick');
  stickPointer('pointermove',81,35,0);const joystickTime=v.currentTime;await wait(()=>v.currentTime>joystickTime+.16);
  assert(app.camera().x>centered.x+.01,'Joystick did not direct the camera');assert(close(app.camera().z,1)&&close(app.camera().r,0),'Joystick changed zoom or rotation');
  const beforeOtherFinger=app.camera();pointer('pointerdown',82,30,50);pointer('pointermove',82,80,90);pointer('pointerup',82,80,90);
  assert(close(app.camera().y,beforeOtherFinger.y),'Another viewport finger translated the joystick performance');
  stickPointer('pointerup',81,35,0);const joystickHeld=app.camera(),holdTime=v.currentTime;await wait(()=>v.currentTime>holdTime+.12);
  assert(app.active()&&close(app.camera().x,joystickHeld.x)&&close(app.camera().y,joystickHeld.y),'Joystick release stopped Action or drifted');
  assert(!$('action').disabled,'Joystick release did not restore Pause');
  stickPointer('pointerdown',83);assert(close(app.camera().x,joystickHeld.x),'Joystick reacquisition jumped');stickPointer('pointercancel',83);app.pause();
  const joystickProject=app.snapshot();
  log('Joystick starts Action; center, travel, release, cancellation and reacquisition are stable');
  $('start').click();await wait(()=>!v.seeking);stick.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));await wait(app.active);const keyBase=app.camera(),keyTime=v.currentTime;
  await wait(()=>v.currentTime>keyTime+.12);assert(app.camera().y>keyBase.y,'Keyboard joystick did not direct camera');
  stick.dispatchEvent(new w.KeyboardEvent('keyup',{key:'ArrowDown',bubbles:true,cancelable:true}));const keyHeld=app.camera(),keyReleaseTime=v.currentTime;await wait(()=>v.currentTime>keyReleaseTime+.1);assert(close(app.camera().y,keyHeld.y),'Key release left joystick moving');app.pause();log('Joystick supports keyboard direction without sticky movement');
  const remembered=app.snapshot().controls;assert(remembered.joystick&&close(remembered.joystickSpeed,.2)&&close(remembered.touchGain,.25),'Direction settings were not saved with the project');
  d.querySelector('[data-section="direction"]').click();$('joystickEnabled').checked=false;$('joystickEnabled').dispatchEvent(new w.Event('change',{bubbles:true}));await delay(0);$('settingsDone').click();assert(stick.hidden,'Joystick switch did not hide the control');
  d.querySelector('[data-section="magnification"]').click();await field('zoomEnd',140);$('settingsDone').click();
  d.querySelector('[data-section="rotation"]').click();$('rotationEnabled').checked=true;$('rotationEnabled').dispatchEvent(new w.Event('change',{bubbles:true}));await delay(0);$('settingsDone').click();$('start').click();await wait(()=>!v.seeking);
  for(const width of [320,390,430]){iframe.style.width=width+'px';await delay(30);assert(d.documentElement.scrollWidth<=d.documentElement.clientWidth+1,'Horizontal overflow at '+width);const box=$('viewport').getBoundingClientRect();assert(box.width>140,'Viewport too narrow');assert($('rail').getBoundingClientRect().width===76,'Rail differs from reference');log('Mobile layout '+width+'px',{viewportWidth:box.width,viewportHeight:box.height});}
  iframe.style.width='390px';await delay(30);
  pointer('pointerdown',1,60,60);await wait(app.active);assert($('action').textContent.includes('Pause'),'Action did not become Pause');assert(!$('recording').hidden,'Missing recording label');assert($('play').disabled,'Navigation not blocked');
  pointer('pointermove',1,65,90);await wait(()=>v.currentTime>=.5);const moved=app.camera();assert(moved.y>0,'First finger did not direct camera');
  pointer('pointerdown',2,140,90);const beforeSecond=app.camera();pointer('pointermove',2,220,90);const radial=app.camera();assert(close(radial.x,beforeSecond.x)&&close(radial.y,beforeSecond.y),'Secondary finger translated camera');
  pointer('pointermove',2,65,170);assert(app.camera().r>beforeSecond.r+70,'Second finger failed manual rotation');
  assert($('action').disabled,'Pause available while actively directing');pointer('pointerup',1,65,90);const promoted=app.camera();pointer('pointermove',2,75,170);assert(!close(app.camera().x,promoted.x)||!close(app.camera().y,promoted.y),'Remaining finger was not promoted');
  pointer('pointerup',2,75,170);const released=app.camera(),releaseTime=v.currentTime;await wait(()=>v.currentTime>=releaseTime+.13);assert(app.active(),'Finger release stopped Action');assert(close(app.camera().x,released.x)&&close(app.camera().y,released.y),'Release changed direction');
  pointer('pointerdown',3,130,190);const acquired=app.camera();assert(close(acquired.x,released.x)&&close(acquired.y,released.y),'Reacquisition jumped');pointer('pointerup',3,130,190);
  log('Touch Action, first/second finger roles, radial separation, promotion and no-jump reacquisition');
  await wait(()=>v.currentTime>=.95);assert(app.active(),'Shorter program stopped Action');nearZoom(app.camera().z,1.4);const finalProgrammed=app.camera().r;await delay(60);nearZoom(app.camera().r,finalProgrammed);
  log('Zoom and rotation hold while master Action continues');
  $('action').click();await wait(()=>!app.active());const saved=app.snapshot(),path=JSON.stringify(saved.path);assert(!$('play').disabled,'Pause did not unlock navigation');log('Pause unlocks navigation');
  app.seek(.6);await wait(()=>!v.seeking);assert(JSON.stringify(app.snapshot().path)===path,'Navigation deleted path');const inherited=stateAt(saved.path,v.currentTime),branchAt=v.currentTime;
  $('action').click();await wait(app.active);const joined=app.snapshot().path.at(-1);assert(close(joined.x,inherited.x)&&close(joined.y,inherited.y)&&close(joined.r,inherited.r),'Branch starts with discontinuity');
  const prefix=saved.path.filter(s=>s.t<branchAt);assert(JSON.stringify(app.snapshot().path.slice(0,prefix.length))===JSON.stringify(prefix),'Preserved prefix changed');
  pointer('pointerdown',4,70,90);pointer('pointermove',4,90,90);pointer('pointerup',4,90,90);await wait(()=>!app.active(),12000);
  assert(v.paused&&close(v.currentTime,1.6,.025),'Master Action did not pause at source endpoint');assert($('recording').hidden&&!$('viewport').classList.contains('recording'),'Recording indicators remained');log('Button Action, partial replacement, inherited boundary and automatic endpoint',{end:v.currentTime,samples:app.snapshot().path.length});
  const exact=app.snapshot().path;assert(exact.every((s,i)=>!i||s.t>exact[i-1].t),'Samples are not source-time ordered');
  $('reference').querySelector('button').click();$('gs-notes').value='CamLock browser acceptance';$('gs-notes').dispatchEvent(new w.Event('input',{bubbles:true}));$('gs-scribeMark').click();assert($('gs-notes').value.includes('F40'),'Scribe did not mark the source frame');
  $('gs-scribeClear').click();await wait(()=>$('gs-notes').value==='');$('gs-scribeHistory').click();await wait(()=>$('gs-scribeEntries').textContent.includes('CamLock browser acceptance'));$('gs-scribeClose').click();$('settingsDone').click();log('Original Scribe frame mark, recoverable Clear and History');
  const lockedStage=JSON.stringify(app.snapshot().stage);app.seek(.7);await wait(()=>!v.seeking);$('play').click();await wait(()=>!v.paused);await delay(80);assert(v.playbackRate===1,'Review uses performance speed');$('play').click();await wait(()=>v.paused);log('Review returns to normal speed and original audio level');
  $('reverse').click();await delay(140);$('reverse').click();assert(v.currentTime<.9,'Reverse did not navigate');assert(JSON.stringify(app.snapshot().stage)===lockedStage,'Camera gestures mutated locked stage');
  d.querySelector('[data-section="save"]').click();$('render').click();await wait(()=>!$('export').disabled,60000);const render=app.rendered();assert(render?.blob.size>0,'No rendered video');log('Offline MP4 render uses saved path without re-performance',render.report);
  const output=new Input({formats:ALL_FORMATS,source:new BlobSource(new Blob([await render.blob.arrayBuffer()],{type:render.blob.type}))});inputs.push(output);const track=await output.getPrimaryVideoTrack(),audio=await output.getPrimaryAudioTrack();assert(audio,'Original audio was lost');
  const packets=[];for await(const packet of new EncodedPacketSink(track).packets())packets.push(packet);assert(packets.length===100,'Whole-source render lost frames');assert(close(await track.computeDuration(),4,.005),'Whole-source render was shortened to Action');assert(render.report.camlock.start===0&&!render.report.camlock.trimmed,'Default render is implicitly trimmed');log('Whole source renders at normal speed despite nonzero Action opening and short performance',{frames:packets.length,duration:await track.computeDuration(),audioDuration:await audio.computeDuration()});
  const original=new Input({formats:ALL_FORMATS,source:new BlobSource(new Blob([await source.arrayBuffer()],{type:source.type}))});inputs.push(original);const originalVideo=await original.getPrimaryVideoTrack();const outSink=new CanvasSink(track,{poolSize:1}),sourceSink=new CanvasSink(originalVideo,{poolSize:1});
  for(const t of [0,.92,3.96]){
   const decoded=await outSink.getCanvas(t+.000001),sourceFrame=await sourceSink.getCanvas(t+.000001),expected=new OffscreenCanvas(180,320);
   drawScene(expected.getContext('2d'),sourceFrame.canvas,app.snapshot().stage,stateAt(app.snapshot().path,t),180,320);
   const actualData=decoded.canvas.getContext('2d').getImageData(0,0,180,320).data,expectedData=expected.getContext('2d').getImageData(0,0,180,320).data;
   let sum=0;for(let i=0;i<actualData.length;i+=4)for(let c=0;c<3;c++)sum+=Math.abs(actualData[i+c]-expectedData[i+c]);const mean=sum/(180*320*3);
   assert(mean<12,'Rendered picture differs from performed composition at '+t+': '+mean);log('Rendered pixels match saved composition; no UI overlay at '+t+'s',{meanChannelError:mean});
  }
  // Whole-source rendering keeps tones at their original .5-.8 and 1.5-1.8 source times.
  const values=[];for await(const item of new AudioBufferSink(audio).buffers()){const samples=item.buffer.getChannelData(0);for(let i=0;i<samples.length;i++)values.push([item.timestamp+i/item.buffer.sampleRate,samples[i]]);}
  const rms=(lo,hi)=>{const selected=values.filter(([t])=>t>=lo&&t<hi);return Math.sqrt(selected.reduce((sum,[,v])=>sum+v*v,0)/selected.length);};
  const on=rms(.57,.7),off=rms(1,1.2);assert(on>.02&&off<.005,'Whole-source audio shifted to Action opening');log('Whole-source audio stays synchronized before and after camera recording',{toneRms:on,silentRms:off});
  d.querySelector('[data-section="duration"]').click();assert(!$('trimEnabled').checked&&$('trimStart').disabled&&$('trimEnd').disabled,'Trimming was enabled implicitly');
  $('trimEnabled').checked=true;$('trimEnabled').dispatchEvent(new w.Event('change',{bubbles:true}));await delay(0);await field('trimStart',.4);await field('trimEnd',1.6);
  const trimmedProject=app.snapshot();assert(JSON.stringify(trimmedProject.path)===JSON.stringify(exact),'Trimming deleted camera instructions');$('settingsDone').click();
  const trimmed=await app.render({file:source,project:trimmedProject,format:'mp4'}),trimmedInput=new Input({formats:ALL_FORMATS,source:new BlobSource(new Blob([await trimmed.blob.arrayBuffer()],{type:trimmed.blob.type}))});inputs.push(trimmedInput);
  const trimmedTrack=await trimmedInput.getPrimaryVideoTrack(),trimPackets=[];for await(const packet of new EncodedPacketSink(trimmedTrack).packets())trimPackets.push(packet);
  assert(trimPackets.length===30&&close(await trimmedTrack.computeDuration(),1.2,.005),'Explicit trim did not select 30 frames / 1.2 seconds');
  const trimValues=[];for await(const item of new AudioBufferSink(await trimmedInput.getPrimaryAudioTrack()).buffers()){const samples=item.buffer.getChannelData(0);for(let i=0;i<samples.length;i++)trimValues.push([item.timestamp+i/item.buffer.sampleRate,samples[i]]);}
  const trimRms=(lo,hi)=>{const selected=trimValues.filter(([t])=>t>=lo&&t<hi);return Math.sqrt(selected.reduce((sum,[,value])=>sum+value*value,0)/selected.length);};assert(trimRms(.17,.3)>.02&&trimRms(.6,.8)<.005,'Trimmed audio lost source synchronization');
  d.querySelector('[data-section="duration"]').click();$('clearTrim').click();await delay(0);assert(app.snapshot().trim===null&&JSON.stringify(app.snapshot().path)===JSON.stringify(exact),'Use entire source did not preserve path and remove trim');$('settingsDone').click();log('Explicit trim renders the chosen interval with aligned audio; clearing it restores the whole source');
  // Verify intentional empty space with a separately rendered path, using the same original.
  const outside=app.snapshot();outside.path=[{t:.4,x:5,y:5,z:.5,r:120},{t:.56,x:5,y:5,z:.5,r:120}];outside.audio.volume=0;outside.trim={start:.4,end:.56};
  const black=await app.render({file:source,project:outside,format:'webm'});const blackInput=new Input({formats:ALL_FORMATS,source:new BlobSource(new Blob([await black.blob.arrayBuffer()],{type:black.blob.type}))});inputs.push(blackInput);
  const blackFrame=await new CanvasSink(await blackInput.getPrimaryVideoTrack()).getCanvas(0);const blackPixels=blackFrame.canvas.getContext('2d').getImageData(0,0,180,320).data;assert(blackPixels.every((v,i)=>i%4===3||v<4),'Camera outside source was corrected/cropped');log('Completely outside source renders intentional black; WebM works');
  assert(JSON.stringify(app.snapshot().path)===JSON.stringify(exact),'Rendering changed raw path');
  const joystickRender=await app.render({file:source,project:joystickProject,format:'mp4'});
  const joystickInput=new Input({formats:ALL_FORMATS,source:new BlobSource(new Blob([await joystickRender.blob.arrayBuffer()],{type:joystickRender.blob.type}))});inputs.push(joystickInput);
  const joystickRenderTime=.6,joystickFrame=await new CanvasSink(await joystickInput.getPrimaryVideoTrack()).getCanvas(joystickRenderTime),joystickSource=await sourceSink.getCanvas(joystickFrame.timestamp+.000001),joystickExpected=new OffscreenCanvas(180,320);
  drawScene(joystickExpected.getContext('2d'),joystickSource.canvas,joystickProject.stage,stateAt(joystickProject.path,joystickFrame.timestamp),180,320);
  const jp=joystickFrame.canvas.getContext('2d').getImageData(0,0,180,320).data,je=joystickExpected.getContext('2d').getImageData(0,0,180,320).data;
  let joystickError=0;for(let i=0;i<jp.length;i+=4)for(let c=0;c<3;c++)joystickError+=Math.abs(jp[i+c]-je[i+c]);joystickError/=180*320*3;
  assert(joystickError<12,'Joystick render differs from recorded path or includes control overlay');log('Joystick performance renders from its exact saved path with no joystick overlay',{meanChannelError:joystickError,frames:joystickRender.report.outputFrames});
  const report={status:'passed',checks:rows,limitations:['Simulated touch in 320/390/430px iframe, not physical Android or iOS.','Authenticated Scribe cloud synchronization not exercised.']};results.textContent=JSON.stringify(report,null,2);window.camlockAcceptance=report;
  document.getElementById('getReport').hidden=false;document.getElementById('getReport').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));a.download='CamLock_Browser_Acceptance_V1_3.json';a.click();};
 }catch(e){const report={status:'failed',checks:rows,error:e.stack||e.message};window.camlockAcceptance=report;results.textContent=JSON.stringify(report,null,2);console.error(e);}
 finally{for(const input of inputs)input.dispose();document.getElementById('run').disabled=false;}
};
function nearZoom(a,b){assert(close(a,b,.02),a+' != '+b);}
