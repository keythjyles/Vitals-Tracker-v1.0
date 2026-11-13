// Real shipped UI, persistent browser storage, and first-play transport regression.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=process.env.REPO_DIR?path.resolve(process.env.REPO_DIR):path.resolve(__dirname,'../../../..'),data=path.resolve(process.env.DATA_DIR);
async function main(){
 const server=http.createServer((q,s)=>{
  const file=path.resolve(repo,decodeURIComponent(new URL(q.url,'http://test').pathname).slice(1));
  if(!file.startsWith(repo+path.sep)){s.writeHead(403);s.end();return;}
  const types={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
  try{s.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');s.end(fs.readFileSync(file));}catch{s.writeHead(404);s.end();}
 }).listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
 const proxyUrl=process.env.LIVE_URL&&(process.env.HTTPS_PROXY||process.env.HTTP_PROXY);
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,...(proxyUrl?{proxy:{server:proxyUrl}}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext({viewport:{width:412,height:915},hasTouch:true,isMobile:true,ignoreHTTPSErrors:!!process.env.LIVE_URL});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=process.env.LIVE_URL||'http://127.0.0.1:'+server.address().port+'/tools-home/tools/sxlock/index.html';
 const wav=Buffer.alloc(44+4800*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);for(let i=0;i<4800;i++)wav.writeInt16LE(Math.round(1000*Math.sin(i*2*Math.PI*700/48000)),44+i*2);
 async function importWav(name){
  await page.getByText('Import sounds',{exact:true}).tap();
  const [chooser]=await Promise.all([
   page.waitForEvent('filechooser'),
   page.getByRole('button',{name:'Choose audio files',exact:true}).tap()
  ]);
  assert(chooser.isMultiple());
  await chooser.setFiles({name,mimeType:'audio/wav',buffer:wav});
  await page.waitForFunction(name=>[...SxLock.sounds.values()].some(sound=>sound.name===name&&sound.category==='My sounds'),name);
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Imported recordings ready'));
 }
 try{
  await page.route('https://api.github.com/repos/keythjyles/Vitals-Tracker-v1.0/contents/tools-home/tools/sxlock/sounds/incoming',r=>r.fulfill({json:[{type:'file',name:'Owner_uploaded-cut.WAV',sha:'disposable-test',html_url:'https://github.com/example/sound',download_url:'https://r27-test.invalid/sound.wav'}]}));
  await page.route('https://r27-test.invalid/sound.wav',r=>r.fulfill({contentType:'audio/wav',body:wav}));
  await page.goto(url);await page.waitForFunction(()=>window.SxLock);await page.evaluate(()=>SxLock.ready);
  await page.evaluate(async data=>{
   const open=indexedDB.open('SxLock-media',3),db=await new Promise((r,j)=>{open.onsuccess=()=>r(open.result);open.onerror=()=>j(open.error)});
   const legacy={id:'custom-legacy',name:'Owner original bee.wav',duration:.1,builtin:false},deleted={id:'custom-deleted',name:'Intentionally deleted.wav',duration:.1,builtin:false};
   const backup={schema:'SxLock-1.0',sounds:[legacy,deleted],clips:[{soundId:legacy.id,start:34.52,duration:.1}],notes:'Keep this project',savedAt:1};
   const current={schema:'SxLock-1.0',sounds:[],clips:[],notes:'Current recovery project',savedAt:2};
   await new Promise((r,j)=>{const tx=db.transaction(['sounds','projects'],'readwrite');const s=tx.objectStore('sounds');s.clear();s.put({id:legacy.id,data});s.put({id:'custom-orphan',data});s.put({id:'custom-standalone',data,metadata:{id:'custom-standalone',name:'Standalone voice.webm',origin:'microphone',mimeType:'audio/wav',duration:.1,builtin:false}});tx.objectStore('projects').put({id:'current',state:current});tx.objectStore('projects').put({id:'backup-test',state:backup});tx.oncomplete=r;tx.onerror=()=>j(tx.error)});db.close();
   localStorage.setItem('sxlock-project-v1',JSON.stringify(current));localStorage.setItem('sxlock-project-v1-previous',JSON.stringify(backup));
   localStorage.setItem('sx-scrubber-review-v2',JSON.stringify({approvedtest:{name:'Approved test sound',status:'approved',category:'Nature',duration:.1,storedBytes:9600,sha256:'test-approved'}}));
  },wav.toString('base64'));
  await page.reload();await page.waitForFunction(()=>window.SxLock);await page.evaluate(()=>SxLock.ready);
  const recovered=await page.evaluate(()=>({custom:[...SxLock.sounds.values()].filter(s=>!s.builtin).map(s=>({id:s.id,name:s.name,data:!!s.data})),directory:SxLock.sounds.has('rec-dir-owner-uploaded-cut-wav'),approved:SxLock.sounds.has('scrubber-approvedtest'),clips:SxLock.snapshot().clips.length,source:document.getElementById('video').getAttribute('src'),project:JSON.parse(localStorage.getItem('sxlock-project-v1'))}));
  console.log('BOOT',JSON.stringify(recovered));
  if(!process.env.OBSERVE_ONLY){assert.equal(recovered.custom.length,3);assert.equal(recovered.custom.find(s=>s.id==='custom-legacy').name,'Owner original bee.wav');assert(recovered.custom.every(s=>s.data));assert(recovered.directory);assert(recovered.approved);assert.equal(recovered.clips,0);assert.equal(recovered.source,null);assert.equal(recovered.project.notes,'Current recovery project');
   assert.equal(await page.evaluate(async()=>{const ac=await SxLock.audioContext();return(await SxLock.buffer('custom-legacy',ac)).duration}),.1);
   await importWav('New sound before video.wav');
   await page.reload();await page.waitForFunction(()=>window.SxLock);await page.evaluate(()=>SxLock.ready);
   assert(await page.evaluate(()=>[...SxLock.sounds.values()].some(s=>s.name==='New sound before video.wav'&&s.data)),'Import without a video was lost');
   // Opening a project must not replace the independent recording library.
   const project={schema:'SxLock-1.0',sounds:[],clips:[],notes:'Explicit project'};
   await page.locator('#loadProject').setInputFiles({name:'project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
   await page.waitForFunction(()=>document.getElementById('status').textContent==='Project and stored assets restored.');
   assert(await page.evaluate(()=>SxLock.sounds.has('custom-legacy')));
   await page.locator('#manageSounds').evaluate(el=>el.open=true);page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Delete forever Owner original bee.wav',exact:true}).click();
   await page.waitForFunction(()=>!SxLock.sounds.has('custom-legacy'));
   await page.reload();await page.waitForFunction(()=>window.SxLock);await page.evaluate(()=>SxLock.ready);assert(!(await page.evaluate(()=>SxLock.sounds.has('custom-legacy'))),'A deleted sound returned from a backup');
  }
  const transport=[];
  for(const [name,delayedMetadata] of [['fixture_40s.mp4',false],['fixture_no_duration.webm',false],['fixture_40s.mp4',true]]){
   if(delayedMetadata)await page.evaluate(()=>Object.defineProperty(document.getElementById('video'),'duration',{configurable:true,get:()=>Infinity}));
   await page.locator('#videoFile').setInputFiles(path.join(data,name));
   await page.waitForFunction(()=>document.getElementById('video').readyState>=2&&!document.getElementById('play').disabled);
   if(!process.env.OBSERVE_ONLY&&name==='fixture_40s.mp4'&&!delayedMetadata){
    await page.locator('#category').selectOption({label:'My sounds'});
    await importWav('New sound with video.wav');
    assert(await page.getByRole('button',{name:'Place New sound with video.wav',exact:true}).isVisible());
    assert.equal(await page.evaluate(()=>SxLock.snapshot().clips.length),0);
   }
   await page.locator('#play').click();await page.waitForFunction(()=>document.getElementById('video').currentTime>1.1);
   const first=await page.evaluate(()=>{const v=document.getElementById('video'),s=document.getElementById('seek');return {time:v.currentTime,mediaDuration:String(v.duration),max:Number(s.max),value:Number(s.value),clock:document.getElementById('clock').textContent}});
   transport.push({name,delayedMetadata,first});console.log('FIRST PLAY',name,delayedMetadata?'delayed browser metadata':'native metadata',JSON.stringify(first));
   if(!process.env.OBSERVE_ONLY){assert(first.max>2.5);assert(first.value<first.max*.5);assert(Math.abs(first.value-first.time)<.2);}
   if(delayedMetadata)await page.evaluate(()=>delete document.getElementById('video').duration);
   await page.locator('#stop').click();
   if(!process.env.OBSERVE_ONLY){
    const stopped=await page.locator('#video').evaluate(v=>({time:v.currentTime,paused:v.paused}));
    assert(stopped.paused&&stopped.time>=first.time,'Stop holds the current frame');
   }
   await page.locator('#restart').click();
   if(!process.env.OBSERVE_ONLY){
    await page.waitForFunction(()=>{const v=document.getElementById('video');return v.paused&&!v.seeking&&v.currentTime===0});
    assert.equal(await page.locator('#sxSideControls > button').first().getAttribute('id'),'restart');
   }
  }
  if(!process.env.OBSERVE_ONLY){
   await page.locator('#videoFile').setInputFiles(path.join(data,'fixture_40s.mp4'));
   await page.waitForFunction(()=>document.getElementById('video').readyState>=2&&!document.getElementById('play').disabled);
   await page.getByRole('button',{name:'Show file picker'}).click();
   await page.getByText('SxLock · GS-TOOL-SXLOCK · R37',{exact:true}).waitFor();
   await page.evaluate(()=>window.scrollTo(0,10));
   await page.locator('.gs-source-drawer').waitFor({state:'hidden'});
   await page.evaluate(()=>window.scrollTo(0,0));
   const geometry=await page.evaluate(()=>{
    const box=selector=>document.querySelector(selector).getBoundingClientRect();
    return {referenceGap:box('.sx-reference').top-box('#editorDock').bottom,playerLeft:box('#editorDock').left,playerRight:box('#editorDock').right,viewport:innerWidth,
     sections:['#soundSection','#mixerSection','#scribeBox','#exportSection','.sx-footer'].map(selector=>box(selector).top),
     filename:document.querySelector('.gs-player-filename').textContent};
   });
   assert(geometry.referenceGap<=2&&geometry.filename==='fixture_40s.mp4');
   assert(geometry.playerLeft<=1&&geometry.playerRight>=geometry.viewport-1,'The player reaches both edges: '+JSON.stringify(geometry));
   assert(geometry.sections.every((top,i)=>i===0||top>geometry.sections[i-1]),'The original mobile module order is preserved');
   assert.equal(await page.locator('#notes').isVisible(),false,'Scribe starts collapsed');
   assert.equal(await page.locator('#saveTake').textContent(),'Save take');
   await page.setViewportSize({width:320,height:640});
   await page.getByRole('button',{name:'Tools',exact:true}).tap();
   const toolLinks=page.getByRole('dialog',{name:'Tools'});
   assert.deepEqual(await toolLinks.getByRole('link').allTextContents(),['Sound Scrubber','WavLock','CapLock','AspectLock','PreviewLock','All tools']);
   await toolLinks.getByRole('button',{name:'Close tools'}).tap();
   assert.equal(await toolLinks.isVisible(),false);
   await page.setViewportSize({width:412,height:915});
   await page.evaluate(()=>window.scrollTo(0,0));
   const go=page.getByRole('spinbutton',{name:'Go to seconds'});
   await go.fill('9.12');await page.getByRole('button',{name:'Go to time'}).click();
   await page.waitForFunction(()=>document.getElementById('clock').textContent.includes('F228'));
   await page.locator('#scribeBox summary').tap();
   await page.setViewportSize({width:320,height:640});
   const scribeLayout=await page.locator('#scribeBox').evaluate(scribe=>{
    const buttons=[...scribe.querySelectorAll('.scribe-actions button')].map(button=>button.getBoundingClientRect().toJSON());
    return {position:getComputedStyle(scribe).position,notesBottom:scribe.querySelector('#notes').getBoundingClientRect().bottom,buttons};
   });
   assert.equal(scribeLayout.position,'static');
   assert(scribeLayout.buttons[0].top>scribeLayout.notesBottom);
   assert.equal(new Set(scribeLayout.buttons.map(button=>button.top)).size,2);
   assert.equal(new Set(scribeLayout.buttons.map(button=>button.left)).size,3);
   assert(scribeLayout.buttons.every(button=>button.height>=44&&button.right<=320));
   await page.setViewportSize({width:412,height:915});
   await page.getByRole('button',{name:'Mark frame'}).tap();
   assert.equal(await page.locator('#notes').inputValue(),'[F228 | 0:09.120 | 25 fps] ');
   await page.locator('#notes').fill('[F228 | 0:09.120 | 25 fps] Keep this stroke 📝');
   await page.getByRole('button',{name:'Clear',exact:true}).tap();
   await page.waitForFunction(()=>document.getElementById('notes').value==='');
   await page.reload();
   await page.locator('#scribeBox summary').tap();
   await page.getByRole('button',{name:'History',exact:true}).tap();
   const entry=page.locator('#scribeEntries li').filter({hasText:'Keep this stroke 📝'});
   await entry.waitFor();
   await entry.getByRole('button',{name:'Restore'}).tap();
   assert.equal(await page.locator('#notes').inputValue(),'[F228 | 0:09.120 | 25 fps] Keep this stroke 📝');
   await page.getByRole('button',{name:'Dock Scribe'}).tap();
   const dock=page.locator('.sx-section-dock');
   await dock.locator('#scribeBox').waitFor();
   assert.equal(await dock.locator('#scribeBox > summary').isVisible(),false);
   assert.equal(await page.locator('.sx-reference .sx-docked-button').count(),0);
   const dockLayout=await page.evaluate(()=>{
    const box=selector=>document.querySelector(selector).getBoundingClientRect();
    return {gap:box('#notes').top-box('#sxResize').bottom,actionsBottom:box('#scribeBox .scribe-actions').bottom,undockTop:box('#scribeBox [data-dock]').top};
   });
   assert(dockLayout.gap>=0&&dockLayout.gap<=2,'The note box starts directly after the player');
   assert(dockLayout.undockTop>dockLayout.actionsBottom,'Undock is below the Scribe buttons');
   assert.equal(await dock.locator('#notes').inputValue(),'[F228 | 0:09.120 | 25 fps] Keep this stroke 📝');
   const dockToggle=page.getByRole('button',{name:'Toggle docked Scribe'});
   await dockToggle.tap();
   assert.equal(await dock.isVisible(),false);
   await dockToggle.tap();
   assert.equal(await dock.locator('#notes').inputValue(),'[F228 | 0:09.120 | 25 fps] Keep this stroke 📝');
   await page.getByRole('button',{name:'Dock Mixer'}).tap();
   await dock.locator('#mixerSection').waitFor();
   assert.equal(await dock.locator('#scribeBox').count(),0);
   assert.equal(await page.locator('#scribeBox > summary').getByRole('button',{name:'Dock Scribe'}).count(),1);
   await page.reload();
   await dock.locator('#mixerSection').waitFor();
   await page.getByRole('button',{name:'Undock Mixer'}).tap();
   assert.equal(await dock.isVisible(),false);
   for(const label of ['Sound library','Insertions','Video','Save and export']){
    await page.getByRole('button',{name:'Dock '+label,exact:true}).tap();
    await dock.getByRole('button',{name:'Undock '+label,exact:true}).tap();
    assert.equal(await dock.isVisible(),false);
   }
   await page.locator('#videoFile').setInputFiles(path.join(data,'fixture_landscape.mp4'));
   await page.waitForFunction(()=>{const video=document.getElementById('video');return video.readyState>=2&&video.videoWidth>video.videoHeight&&!document.getElementById('play').disabled});
   await page.evaluate(()=>window.scrollTo(0,0));
   const view=page.getByRole('button',{name:'View',exact:true});
   await view.tap();
   const viewSheet=page.getByRole('dialog',{name:'Preview view'});
   const zoom=()=>page.locator('#video').evaluate(video=>Number(video.style.getPropertyValue('--sx-zoom')));
   const height=()=>page.locator('.viewer').evaluate(surface=>surface.clientHeight);
   const defaultHeight=await height();
   await viewSheet.getByRole('button',{name:'Shorter'}).tap();
   assert(await height()<defaultHeight);
   await viewSheet.getByRole('button',{name:'Taller'}).tap();
   await viewSheet.getByRole('button',{name:'Fill'}).tap();
   assert(await zoom()>1);
   await viewSheet.getByRole('button',{name:'Zoom out'}).tap();
   await viewSheet.getByRole('button',{name:'Fit'}).tap();
   assert.equal(await zoom(),1);
   assert.equal(await height(),defaultHeight);
   await viewSheet.getByRole('button',{name:'Close preview view'}).tap();
   await page.locator('#play').tap();
   await page.waitForFunction(()=>!document.getElementById('video').paused);
   const picture=await page.locator('.viewer').boundingBox();
   const cx=Math.round(picture.x+picture.width/2),cy=Math.round(picture.y+picture.height/2);
   await page.touchscreen.tap(cx,cy);
   const touch=await context.newCDPSession(page);
   const pinch=offset=>[{id:1,x:cx-offset,y:cy},{id:2,x:cx+offset,y:cy}];
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pinch(20)});
   await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pinch(58)});
   await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert(await zoom()>2,'Pinch zooms the landscape picture');
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx,y:cy}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx+40,y:cy}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert(await page.locator('#video').evaluate(video=>parseFloat(video.style.getPropertyValue('--sx-pan-x')))>0,'A drag pans the zoomed picture');
   const resizeGrip=await page.locator('#sxResize').boundingBox();
   await page.mouse.move(resizeGrip.x+resizeGrip.width/2,resizeGrip.y+resizeGrip.height/2);
   await page.mouse.down();await page.mouse.move(resizeGrip.x+resizeGrip.width/2,resizeGrip.y+resizeGrip.height/2+44,{steps:4});await page.mouse.up();
   assert(await height()>defaultHeight,'The grip resizes the preview');
   assert.equal(await viewSheet.isVisible(),false);
   assert(await page.locator('#video').evaluate(video=>!video.paused),'Picture gestures leave playback running');
   await page.locator('#stop').tap();
   console.log('PASS full-width player, docking and restoration, landscape zoom/pan, and resize during playback');
   console.log('PASS phone layout, module order, Tools menu, frame mark, Clear and Scribe recovery after reload');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(data,process.env.OBSERVE_ONLY?'library-playhead-baseline.json':'library-playhead.json'),JSON.stringify({recovered,transport,pageErrors:errors},null,2));
  console.log(process.env.OBSERVE_ONLY?'Recorded baseline observations':'PASS library recovery, independent import, project switch, delete and first-play seek');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exit(1)});
