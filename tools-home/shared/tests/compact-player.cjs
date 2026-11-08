const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');

async function checkFrameLock(page){
 const temp=mkdtempSync(join(tmpdir(),'framelock-'));
 try{
  const source=join(temp,'portrait.mp4');
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=162x288:rate=30:duration=2','-c:v','libx264','-pix_fmt','yuv420p',source]);
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
  const notes=page.locator('#notes');
  const notesTop=(await notes.boundingBox()).y;
  assert.ok(notesTop>=loaded.y+loaded.height,'notes start below the player');
  assert.ok(page.viewportSize().height-notesTop>=64,'notes have room on a phone with portrait video loaded');
  await page.locator('#forward').click();
  await page.getByText('Frame 1 · 0.033 s',{exact:true}).waitFor();
  await notes.scrollIntoViewIfNeeded();
  await notes.fill('Test cut note');
  assert.equal(await notes.inputValue(),'Test cut note');
  console.log(`FrameLock portrait at 360x640: ${loaded.height}px matched panels, ${Math.round(page.viewportSize().height-notesTop)}px visible for notes, exact frame step passed.`);
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
