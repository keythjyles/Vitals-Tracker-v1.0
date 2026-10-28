// Real shipped UI, persistent browser storage, and first-play transport regression.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=process.env.REPO_DIR?path.resolve(process.env.REPO_DIR):path.resolve(__dirname,'../../../..'),data=path.resolve(process.env.DATA_DIR);
async function main(){
 const server=http.createServer((q,s)=>{
  const file=path.resolve(repo,decodeURIComponent(new URL(q.url,'http://test').pathname).slice(1));
  if(!file.startsWith(repo+path.sep)){s.writeHead(403);s.end();return;}
  try{s.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'application/octet-stream');s.end(fs.readFileSync(file));}catch{s.writeHead(404);s.end();}
 }).listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
 const proxyUrl=process.env.LIVE_URL&&(process.env.HTTPS_PROXY||process.env.HTTP_PROXY);
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,...(proxyUrl?{proxy:{server:proxyUrl}}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext({viewport:{width:412,height:915},ignoreHTTPSErrors:!!process.env.LIVE_URL});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=process.env.LIVE_URL||'http://127.0.0.1:'+server.address().port+'/tools-home/tools/sxlock/index.html';
 const wav=Buffer.alloc(44+4800*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);for(let i=0;i<4800;i++)wav.writeInt16LE(Math.round(1000*Math.sin(i*2*Math.PI*700/48000)),44+i*2);
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
   await page.locator('#audioFiles').setInputFiles({name:'New sound before video.wav',mimeType:'audio/wav',buffer:wav});
   await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Imported recordings ready'));
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
   await page.locator('#play').click();await page.waitForFunction(()=>document.getElementById('video').currentTime>1.1);
   const first=await page.evaluate(()=>{const v=document.getElementById('video'),s=document.getElementById('seek');return {time:v.currentTime,mediaDuration:String(v.duration),max:Number(s.max),value:Number(s.value),clock:document.getElementById('clock').textContent}});
   transport.push({name,delayedMetadata,first});console.log('FIRST PLAY',name,delayedMetadata?'delayed browser metadata':'native metadata',JSON.stringify(first));
   if(!process.env.OBSERVE_ONLY){assert(first.max>2.5);assert(first.value<first.max*.5);assert(Math.abs(first.value-first.time)<.2);}
   if(delayedMetadata)await page.evaluate(()=>delete document.getElementById('video').duration);
   await page.locator('#restart').click();await page.waitForFunction(()=>document.getElementById('video').currentTime>.3&&document.getElementById('video').currentTime<.9);
   await page.locator('#stop').click();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(data,process.env.OBSERVE_ONLY?'library-playhead-baseline.json':'library-playhead.json'),JSON.stringify({recovered,transport,pageErrors:errors},null,2));
  console.log(process.env.OBSERVE_ONLY?'Recorded baseline observations':'PASS library recovery, independent import, project switch, delete and first-play seek');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exit(1)});
