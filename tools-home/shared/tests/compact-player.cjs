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
  assert.ok(rail.height<=315,'paired controls keep the closed player within its previous height');
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
  const noteButtons=await page.locator('.notes-actions button').evaluateAll(buttons=>buttons.map(button=>{
   const {width,top}=button.getBoundingClientRect();return {width,top};
  }));
  assert.equal(new Set(noteButtons.map(button=>button.top)).size,1,'note actions fit on one row');
  assert.ok(noteButtons.every(button=>button.width<=120),'note actions have capped widths');

  await page.locator('#forward').click();
  await page.getByText('Frame 1 · 0.033 s',{exact:true}).waitFor();
  await page.locator('#trimIn').click();
  await page.locator('#jumpforward').click();
  await page.getByText('Frame 31 · 1.033 s',{exact:true}).waitFor();
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

(async()=>{const browser=await chromium.launch({headless:true});try{
 const pages=['cliplock/?mode=video','caplock/','sxlock/','aspectlock/','previewlock/cloud-test.html','framelock/','motionlock/','wavlock/'];
 for(const path of pages){const frameLock=path==='framelock/',capLock=path==='caplock/';const page=await browser.newPage({viewport:frameLock?{width:360,height:640}:{width:390,height:740},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8767/tools-home/tools/'+path);await page.waitForSelector('.gs-player-shell');await page.waitForFunction(()=>[...document.querySelectorAll('input[type=range]:not([hidden])')].every(e=>e.hasAttribute('data-gs-protected-range')||e.closest('[inert]')));await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,path+' fits phone width');
  assert.equal(await page.locator('input[type=range]').evaluateAll(es=>es.some(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0)),false,path+' has no draggable ranges');
  const layout=await page.evaluate(()=>{const workspace=document.querySelector('.gs-player-workspace'),rail=document.querySelector('.gs-player-rail'),stage=document.querySelector('.gs-player-picture');if(!workspace||!rail||!stage)return null;const r=rail.getBoundingClientRect(),s=stage.getBoundingClientRect();return {right:r.left>=s.right-1,rail:r.width,stage:s.width,left:s.left,rightEdge:r.right,viewport:innerWidth};});if(layout){assert.equal(layout.right,true,path+' transport hugs right');assert.equal(layout.rail,76,path+' uses the locked SxLock rail');assert.ok(layout.left>=16,path+' has a left inset');assert.ok(layout.rightEdge<=layout.viewport-16,path+' clears Samsung edge controls');}
  assert.equal(await page.locator('.gs-source-drawer').isVisible(),false,path+' hides source controls');
  const heights=await page.locator('.gs-rail-stack button').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().height>0).map(e=>({id:e.id,h:e.getBoundingClientRect().height,frame:e.classList.contains('gs-frame-button')})));
  const rowHeight=frameLock?50.75:capLock?25:29;
  const frameHeight=frameLock?63:capLock?32:36;
  for(const b of heights)assert.equal(b.h,b.frame?frameHeight:b.id==='liveRecord'?40:['liveStop','saveTake'].includes(b.id)?25:rowHeight,path+' locks single-row height for '+b.id);
  const pair=page.locator('.gs-frame-pair');if(await pair.count()){const r=await pair.first().evaluate(e=>[...e.children].map(n=>n.getBoundingClientRect().top));assert.equal(new Set(r).size,1,path+' frame buttons share one row');}await page.getByRole('button',{name:'Show file picker',exact:true}).click();assert.equal(await page.locator('.gs-source-drawer').isVisible(),true);await page.getByRole('button',{name:'Hide file picker',exact:true}).click();assert.equal(await page.locator('.gs-source-drawer').isVisible(),false);
  if(frameLock)await checkFrameLock(page);
  assert.deepEqual(errors,[],path+' initializes without script errors');await page.close();
 }console.log('Eight editors share the locked SxLock rail, paired frame buttons, matching monitor and hidden file drawer.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
