const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');

async function saveFrameLockCut(page,name){
 await page.getByRole('button',{name:'Trim and save',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Save As',exact:true});
 await dialog.waitFor();
 assert.match(await page.locator('#trimSaveRange').textContent(),/30 frames · [\d.]+ s/);
 await page.locator('#trimFormat').selectOption('webm');
 await page.locator('#trimName').fill(name);
 let requested=0;
 const observe=()=>requested++;
 page.on('download',observe);
 await dialog.getByRole('button',{name:'Prepare trim',exact:true}).click();
 const ready=page.getByRole('dialog',{name:'Trim ready',exact:true});
 await ready.waitFor();
 assert.equal(requested,0,'preparing the cut waits for a Download tap');
 const pending=page.waitForEvent('download');
 await ready.getByRole('link',{name:'Download',exact:true}).click();
 const download=await pending;
 page.off('download',observe);
 assert.equal(download.suggestedFilename(),name+'.webm');
 return download;
}

async function checkFrameLock(page){
 const temp=mkdtempSync(join(tmpdir(),'framelock-'));
 try{
  const source=join(temp,'portrait.mp4');
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=162x288:rate=30:duration=2',
   '-f','lavfi','-i','sine=frequency=600:sample_rate=48000:duration=2',
   '-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',source]);
  const picture=page.locator('.gs-player-picture');
  const emptyHeight=(await picture.boundingBox()).height;
  await page.locator('#file').setInputFiles(source);
  await page.waitForFunction(()=>{
   const video=document.querySelector('#video');
   return video.readyState>=2&&video.videoHeight>video.videoWidth;
  });
  const loaded=await picture.boundingBox();
  const rail=await page.locator('.gs-player-rail').boundingBox();
  assert.equal(loaded.height,emptyHeight,'loading portrait video does not stretch the player');
  assert.equal(loaded.y,rail.y,'the picture and controls start on the same row');
  assert.equal(loaded.height,rail.height,'the picture and controls end on the same row');
  assert.ok(rail.height<=370,'paired controls and Start leave room below the closed player');
  const notes=page.locator('#notes');
  const scribe=page.locator('#scribeSummary');
  assert.equal(await notes.isVisible(),false,'Scribe starts collapsed');
  assert.equal(await page.locator('#hub-copy').isVisible(),false,'handoff lives inside Scribe');
  assert.equal(await page.locator('.tools-hub-panel').count(),0,'no standalone handoff instructions');
  assert.ok((await scribe.boundingBox()).y>=loaded.y+loaded.height,'Scribe starts below the player');
  await scribe.click();
  const notesTop=(await notes.boundingBox()).y;
  assert.ok(notesTop>=loaded.y+loaded.height,'notes start below the player');
  assert.ok(page.viewportSize().height-notesTop>=64,'notes have room on a phone with portrait video loaded');
  const noteButtons=await page.locator('#notes-workspace .gs-scribe-primary button').evaluateAll(buttons=>buttons.map(button=>{
   const {right,top,height}=button.getBoundingClientRect();
   return {name:button.textContent,right,top,height};
  }));
  const notesBottom=await notes.evaluate(field=>field.getBoundingClientRect().bottom);
  assert.deepEqual(noteButtons.map(button=>button.name),['Clear','Copy','Mark frame']);
  assert.equal(new Set(noteButtons.map(button=>button.top)).size,1,'note actions fit on one row');
  assert.ok(noteButtons.every(button=>button.top>=notesBottom&&button.right<=page.viewportSize().width));
  const secondary=await page.locator('#notes-workspace .gs-scribe-secondary button').evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect().height));
  assert.equal(secondary.length,3);
  assert.ok(secondary.every(height=>height<noteButtons[0].height));

  await page.locator('#forward').click();
  await page.getByText('F1 · 0:00.033 · 30 fps',{exact:true}).waitFor();
  await page.locator('#trimIn').click();
  await page.locator('#jumpforward').click();
  await page.getByText('F31 · 0:01.033 · 30 fps',{exact:true}).waitFor();
  await page.locator('#trimOut').click();
  assert.equal(await page.locator('#trimInLabel').textContent(),'In F1');
  assert.equal(await page.locator('#trimOutLabel').textContent(),'Out F31');
  assert.equal(await page.locator('#trimTotal').textContent(),'30 fr · 1.000 s');
  for(const id of ['trimInTick','trimOutTick','trimBand'])assert.equal(await page.locator('#'+id).isVisible(),true);
  await notes.scrollIntoViewIfNeeded();
  await notes.fill('Test cut note');
  assert.equal(await notes.inputValue(),'Test cut note');
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);
  await page.getByRole('button',{name:'Copy handoff',exact:true}).click();
  await page.getByText('Handoff copied.',{exact:true}).waitFor();
  const handoff=await page.evaluate(()=>navigator.clipboard.readText());
  assert.match(handoff,/Test cut note/);
  assert.match(handoff,/"outFrame": 31/);
  await page.getByRole('button',{name:'Done typing',exact:true}).click();
  assert.equal(await notes.isVisible(),false,'Done folds Scribe away');
  assert.equal(await notes.inputValue(),'Test cut note','closing Scribe keeps notes');

  await page.locator('#trimExport').click();
  await page.locator('#trimCancel').click();
  assert.equal(await page.locator('#trimTotal').textContent(),'30 fr · 1.000 s','cancel keeps the selection');
  await page.evaluate(()=>{
   Object.defineProperty(navigator,'canShare',{value:({files})=>files.length===1});
   Object.defineProperty(navigator,'share',{value:async({files})=>{
    const [file]=files;
    window.sharedTrim={name:file.name,size:file.size};
   }});
  });
  const download=await saveFrameLockCut(page,'Blue.Angels trim');
  const file=await download.path();
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-of','json',file],{encoding:'utf8'}));
  const video=probe.streams.find(stream=>stream.codec_type==='video');
  assert.deepEqual([video.width,video.height,Number(video.nb_read_frames)],[162,288,30]);
  assert.ok(probe.streams.some(stream=>stream.codec_type==='audio'),'trim retains the source soundtrack');
  const samples=execFileSync('ffmpeg',['-v','error','-i',file,'-map','0:a:0','-f','s16le','pipe:1']);
  assert.ok(samples.some(value=>value!==0),'exported soundtrack decodes to audible samples');
  await page.getByRole('button',{name:'Share file',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.sharedTrim.name),download.suggestedFilename());
  await page.getByRole('button',{name:'Keep editing the current video',exact:true}).click();
  assert.equal(await page.locator('.gs-player-filename').textContent(),'portrait.mp4');
  assert.equal(await page.locator('#trimTotal').textContent(),'30 fr · 1.000 s');
  assert.equal(await notes.inputValue(),'Test cut note');
  await page.getByRole('button',{name:'Last trim',exact:true}).click();
  const retry=page.waitForEvent('download');
  await page.getByRole('link',{name:'Download',exact:true}).click();
  assert.equal((await retry).suggestedFilename(),download.suggestedFilename());
  await page.getByRole('button',{name:'Keep editing the current video',exact:true}).click();

  await saveFrameLockCut(page,'Reload cut');
  await page.getByRole('button',{name:'Load the new export',exact:true}).click();
  await page.getByText('Reload cut.webm',{exact:true}).waitFor();
  await page.locator('#trimIn:enabled').waitFor();
  assert.equal(await page.locator('#trimInLabel').textContent(),'In —');
  assert.equal(await page.locator('#trimOutLabel').textContent(),'Out —');
  await page.locator('#trimIn').click();
  await page.locator('#jumpforward').click();
  await page.locator('#trimOut').click();
  await saveFrameLockCut(page,'Open new');
  const chooser=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'Open a new video',exact:true}).click();
  await (await chooser).setFiles(source);
  await page.getByText('portrait.mp4',{exact:true}).waitFor();
  await page.locator('#trimIn:enabled').waitFor();
  assert.equal(await page.locator('#trimInLabel').textContent(),'In —');
  console.log(`FrameLock at 360x640: ${loaded.height}px matched panels, collapsed Scribe, clipboard handoff, and audible 30-frame trim with all three next actions passed.`);
 }finally{rmSync(temp,{recursive:true,force:true});}
}

async function checkWavLock(page){
 const dir=mkdtempSync(join(tmpdir(),'wavlock-'));
 try{
  const path=join(dir,'source.mp3');
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=640:duration=4','-c:a','libmp3lame',path]);
  await page.goto('http://127.0.0.1:8767/tools-home/tools/wavlock/');
  const open=page.getByRole('button',{name:'Open audio file',exact:true});
  const waveform=page.locator('#waveView');
  const box=await waveform.boundingBox(), prompt=await open.boundingBox();
  assert.ok(box.height<165&&box.width>310,'the waveform fills the short phone bed');
  assert.ok(prompt.y>=box.y&&prompt.y+prompt.height<=box.y+box.height,'the initial opener sits inside the waveform bed');
  assert.ok((await page.locator('#start').boundingBox()).y>=box.y+box.height,'transport sits below the waveform');
  assert.ok((await page.locator('#scribeActions').boundingBox()).y>box.y+box.height,'Scribe sits below the player');
  assert.equal(await page.locator('#audioPicker').isVisible(),false);
  assert.equal(await page.locator('#wavlockEffects').evaluate(node=>node.open),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);

  const touch=await page.context().newCDPSession(page);
  const finger=(x,y,id)=>({x:Math.round(x),y:Math.round(y),id});
  const send=(type,touchPoints=[])=>touch.send('Input.dispatchTouchEvent',{type,touchPoints});
  const grip=await page.locator('#fileGrip').boundingBox();
  await send('touchStart',[finger(grip.x+grip.width/2,grip.y+grip.height/2,1)]);
  await send('touchMove',[finger(grip.x+grip.width/2,grip.y+grip.height/2+40,1)]);
  await send('touchEnd');
  assert.equal(await page.locator('#audioPicker').isVisible(),true,'pulling the grip reveals the picker');
  await page.getByRole('button',{name:'Hide file picker',exact:true}).click();
  assert.equal(await page.locator('#audioPicker').isVisible(),false);

  const picker=page.waitForEvent('filechooser');
  await open.click();
  await (await picker).setFiles(path);
  await page.waitForFunction(()=>document.querySelector('#source').textContent==='source.mp3'&&document.querySelector('#audio').readyState>=2);
  assert.equal(await open.isVisible(),false);
  const center=box.x+box.width/2,y=box.y+box.height/2;
  const pinch=radius=>[finger(center-radius,y,1),finger(center+radius,y,2)];
  const originalTo=await page.locator('#waveTo').textContent();
  await send('touchStart',pinch(23));
  for(const radius of [34,49,65,79])await send('touchMove',pinch(radius));
  await send('touchEnd');
  await page.waitForFunction(()=>document.querySelector('#waveFrom').textContent!=='00:00.000');
  assert.notEqual(await page.locator('#waveTo').textContent(),originalTo);
  assert.equal(await page.locator('#audio').evaluate(node=>node.currentTime),0,'pinching leaves the playhead in place');

  const beforePan=await page.locator('#waveFrom').textContent();
  await send('touchStart',[finger(center,y,1)]);
  await send('touchMove',[finger(center+55,y,1)]);
  await send('touchEnd');
  assert.notEqual(await page.locator('#waveFrom').textContent(),beforePan,'one finger pans a zoomed waveform');
  await send('touchStart',pinch(79));
  for(const radius of [64,50,35,20])await send('touchMove',pinch(radius));
  await send('touchEnd');
  assert.equal(await page.locator('#waveTo').textContent(),originalTo,'pinching inward restores the wide view');
  await page.getByRole('button',{name:'Fit',exact:true}).click();
  assert.equal(await page.locator('#waveFrom').textContent(),'00:00.000');

  async function expectWav(button,label,duration){
   const pending=page.waitForEvent('download');
   await button.click();
   const download=await pending;
   assert.equal(download.suggestedFilename(),label+'.wav');
   const seconds=execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',await download.path()],{encoding:'utf8'});
   assert.ok(Math.abs(Number(seconds)-duration)<.0001,'WAV cut matches the selection');
  }
  const scribe=page.locator('#scribeActions').getByRole('button',{name:'Scribe',exact:true});
  for(const [name,start,end] of [['First',.375,1.125],['Second',1.625,3.25]]){
   await page.locator('#in').fill(String(start));
   await page.locator('#out').fill(String(end));
   await page.getByRole('textbox',{name:'Clip name',exact:true}).fill(name);
   await expectWav(page.getByRole('button',{name:'Save WAV',exact:true}),name,end-start);
   await page.getByRole('button',{name:'Edit '+name,exact:true}).waitFor();
   await scribe.click();
   const notes=page.getByRole('textbox',{name:'Scribe notes',exact:true});
   await notes.fill(name+' clip note');
   await page.getByRole('button',{name:'Mark time',exact:true}).click();
   assert.match(await page.locator('#gs-scribeStatus').textContent(),/^Marked /,'mark confirms the paused audio time');
   assert.match(await notes.inputValue(),new RegExp('\\[Audio .* \\| IN .* \\| OUT .* \\| '+name+'\\]'));
   await page.getByRole('button',{name:'Clear',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#gs-scribeStatus').textContent==='Note kept in History.');
   await scribe.click();
  }
  await page.getByRole('button',{name:'Rename Second',exact:true}).click();
  await page.getByRole('textbox',{name:'New clip name',exact:true}).fill('Second chorus');
  await page.getByRole('button',{name:'Save name',exact:true}).click();
  await page.getByRole('button',{name:'Edit Second chorus',exact:true}).waitFor();

  await page.reload();
  await page.getByRole('button',{name:'Edit First',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#source').textContent==='source.mp3'&&document.querySelector('#audio').readyState>=2);
  assert.equal(await page.locator('#in').inputValue(),'0.375');
  assert.equal(await page.locator('#out').inputValue(),'1.125');
  assert.equal(await page.locator('#name').inputValue(),'First');
  await page.locator('#out').fill('1.375');
  await expectWav(page.getByRole('button',{name:'Update WAV',exact:true}),'First',1);
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Saved First'));
  assert.equal(await page.locator('#clipList .saved-cut').count(),2,'editing updates the original row');
  const play=page.getByRole('button',{name:'Play or pause Second chorus',exact:true});
  await play.click();
  await page.waitForFunction(()=>!document.querySelector('#audio').paused&&document.querySelector('#audio').currentTime>=1.625);
  await page.waitForFunction(()=>document.querySelector('#audio').paused&&Math.abs(document.querySelector('#audio').currentTime-3.25)<.02);
  await scribe.click();
  await page.getByRole('button',{name:'History',exact:true}).click();
  const history=page.getByRole('dialog',{name:'Scribe history'});
  await history.locator('li pre').filter({hasText:'| Second]'}).waitFor();
  await history.locator('li').filter({hasText:'| First]'}).getByRole('button',{name:'Restore'}).click();
  assert.equal(await page.locator('#out').inputValue(),'1.125','the earlier note restores its own original range');
  console.log('WavLock phone layout, drawer, two-finger zoom, saved clip edits and playback, WAV timing, and shared Scribe recovery passed.');
 }finally{rmSync(dir,{recursive:true,force:true});}
}

(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true});try{
 const pages=['cliplock/?mode=video','caplock/','sxlock/','aspectlock/','previewlock/cloud-test.html','framelock/','motionlock/'];
 for(const path of pages){const frameLock=path==='framelock/',capLock=path==='caplock/';const page=await browser.newPage({viewport:frameLock?{width:360,height:640}:{width:390,height:740},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8767/tools-home/tools/'+path);await page.waitForSelector('.gs-player-shell');await page.waitForFunction(()=>[...document.querySelectorAll('input[type=range]:not([hidden]):not([data-gs-continuous])')].every(e=>e.hasAttribute('data-gs-protected-range')||e.closest('[inert]')));await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,path+' fits phone width');
  assert.equal(await page.locator('input[type=range]:not([data-gs-continuous])').evaluateAll(es=>es.some(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0)),false,path+' has no draggable ranges');
  if(path!=='sxlock/'){
   const ref=page.locator('.gs-video-reference');
   const shortcut=ref.getByRole('button',{name:'Scribe',exact:true});
   if(path==='aspectlock/'){
    assert.equal(await shortcut.count(),0,'AspectLock opens Scribe from its section');
    assert.equal(await page.locator('#editorScribe > summary').isVisible(),true);
   }else assert.equal(await shortcut.count(),1,path+' has Scribe beside the readout');
   const player=await page.locator('.gs-player-workspace').boundingBox();
   assert.ok((await ref.boundingBox()).y>=player.y+player.height-1,path+' puts the readout below the picture');
  }
  const layout=await page.evaluate(()=>{const workspace=document.querySelector('.gs-player-workspace'),rail=document.querySelector('.gs-player-rail'),stage=document.querySelector('.gs-player-picture');if(!workspace||!rail||!stage)return null;const r=rail.getBoundingClientRect(),s=stage.getBoundingClientRect();return {right:r.left>=s.right-1,rail:r.width,stage:s.width,left:s.left,rightEdge:r.right,viewport:innerWidth};});if(layout){assert.equal(layout.right,true,path+' transport hugs right');assert.equal(layout.rail,frameLock?112:76,path+' uses its saved rail width');if(path==='sxlock/'){assert.ok(layout.left<=1&&layout.rightEdge>=layout.viewport-1,'SxLock uses the full phone width');}else{assert.ok(layout.left>=16,path+' has a left inset');assert.ok(layout.rightEdge<=layout.viewport-16,path+' clears Samsung edge controls');}}
  assert.equal(await page.locator('.gs-source-drawer').isVisible(),false,path+' hides source controls');
  const startId=path==='aspectlock/'?'bedZero':capLock?'toStart':path==='sxlock/'?'restart':'start';
  const start=page.locator('#'+startId),play=page.locator(frameLock?'#playPause':'#play');
  const railTop=(await page.locator('.gs-rail-stack').boundingBox()).y;
  assert.equal((await start.boundingBox()).y,railTop,path+' has Start as the top control');
  assert.ok((await start.boundingBox()).y<(await play.boundingBox()).y,path+' has Play below Start');
  const heights=await page.locator('.gs-rail-stack button').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().height>0).map(e=>({id:e.id,h:e.getBoundingClientRect().height,frame:e.classList.contains('gs-frame-button')})));
  const rowHeight=frameLock?44:capLock?25:29;
  const frameHeight=frameLock?48:capLock?32:36;
  for(const b of heights)assert.equal(b.h,b.frame?frameHeight:b.id==='liveRecord'?40:['liveStop','saveTake'].includes(b.id)?25:rowHeight,path+' locks single-row height for '+b.id);
  const pair=page.locator('.gs-frame-pair');if(await pair.count()){const r=await pair.first().evaluate(e=>[...e.children].map(n=>n.getBoundingClientRect().top));assert.equal(new Set(r).size,1,path+' frame buttons share one row');}await page.getByRole('button',{name:'Show file picker',exact:true}).click();assert.equal(await page.locator('.gs-source-drawer').isVisible(),true);await page.getByRole('button',{name:'Hide file picker',exact:true}).click();assert.equal(await page.locator('.gs-source-drawer').isVisible(),false);
  if(frameLock)await checkFrameLock(page);
  assert.deepEqual(errors,[],path+' initializes without script errors');await page.close();
 }
 const wavPage=await browser.newPage({viewport:{width:360,height:640},isMobile:true,hasTouch:true,acceptDownloads:true});
 const wavErrors=[];wavPage.on('pageerror',error=>wavErrors.push(error.message));
 await checkWavLock(wavPage);
 assert.deepEqual(wavErrors,[],'WavLock audio editor has no script errors');
 await wavPage.close();
 console.log('Seven video editors share the locked SxLock player.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
