const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
(async()=>{
 const dir='/tmp/caption-clipper-check';await fs.mkdir(dir,{recursive:true});const source=path.join(dir,'caption.mp4');
 execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=160x90:rate=24:duration=4','-c:v','libx264','-pix_fmt','yuv420p',source]);
 const bytes=await fs.readFile(source),digest=crypto.createHash('sha256').update(bytes).digest('hex');
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try{
 const context=await browser.newContext({viewport:{width:360,height:780}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('gs_previewlock_key','fixture-only'));
 const original={id:'original',role:'caption',name:'caption.mp4',path:'/fixture/captions/caption.mp4',size:bytes.length,sha256:digest};
 const project={id:'caption-fixture',title:'Caption project',text:'Saved joke',assets:[{...original,id:'bed',role:'bed',name:'bed.mp4',path:'/fixture/video/bed.mp4'},original]};
 let writes=0,savedRequest=null;
 await page.route('https://gs-previewlock-api.onrender.com/**',async route=>{
  const u=new URL(route.request().url());let response;
  const current=u.searchParams.get('id')==='empty-fixture'?{...project,id:'empty-fixture',assets:project.assets.filter(a=>a.role==='bed')}:project;
  if(u.pathname==='/api/joke-project')response={project:current,rev:'r0',capabilities:{clipBatch:2}};
  else if(u.pathname==='/api/joke-project/cuts'){
   writes++;const data=route.request().postDataJSON();savedRequest=data;
   assert.equal(data.cuts[0].sourceOutFrame,24);assert.equal(data.cuts[1].sourceInFrame,20);
   original.cuts={id:'batch-fixture',status:'complete',chroma:data.chroma,ranges:data.cuts.map((c,i)=>({number:i+1,...c})),clips:data.cuts.map((c,i)=>({number:i+1,...c,path:'/fixture/'+c.name,frames:c.outFrame-c.inFrame,size:100,sha256:'fixture-output'}))};
   response={project,rev:'r1',persisted:true};
  }else if(u.pathname==='/api/playback'){assert.ok(!u.searchParams.get('path').includes('/video/'),'Bed must not load into Caption Clipper');response={url:'http://127.0.0.1:8767/caption-fixture.mp4'};}
  else if(u.pathname==='/api/joke-projects')response={projects:[{id:project.id}]};
  else throw Error('Unexpected request '+u.pathname);
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(response)});
 });
 await page.route('**/caption-fixture.mp4',r=>r.fulfill({contentType:'video/mp4',body:bytes}));
 await page.goto('http://127.0.0.1:8767/tools-home/tools/cliplock/?project=caption-fixture');
 await page.waitForFunction(()=>!document.querySelector('#next').disabled);
 assert.match(await page.title(),/Caption Clipper.*R3/);assert.equal(await page.locator('#sourceSelect option').count(),1);
 assert.equal(await page.locator('#singleExport').count(),0);assert.match(await page.locator('#source').innerText(),/caption.mp4.*96 frames/);
 // Emulate rounded browser media-time reads on a 24fps source, and multiple taps before seek completion.
 await page.locator('#video').evaluate(v=>{const d=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');Object.defineProperty(v,'currentTime',{configurable:true,get(){return Math.floor(d.get.call(this)*1000)/1000;},set(n){d.set.call(this,n);}});});
 await page.getByRole('button',{name:'Next source frame',exact:true}).click();
 assert.match(await page.locator('#clock').innerText(),/^F1 /);
 await page.evaluate(()=>{for(let i=0;i<19;i++)document.querySelector('#next').click();});
 await page.waitForFunction(()=>document.querySelector('#clock').textContent.startsWith('F20 '));
 await page.waitForFunction(()=>!document.querySelector('#video').seeking);
 assert.ok(await page.locator('#video').evaluate(v=>v.currentTime>20/24&&v.currentTime<21/24),'Picture seeks inside frame20');
 await page.evaluate(()=>{for(let i=0;i<5;i++)document.querySelector('#back').click();});assert.match(await page.locator('#clock').innerText(),/^F15 /);
 await page.getByRole('button',{name:'Mark IN',exact:true}).click();assert.equal(await page.locator('#in').inputValue(),'15');
 await page.getByRole('button',{name:'Next source frame',exact:true}).click();assert.match(await page.locator('#clock').innerText(),/^F16 /);
 assert.equal(await page.locator('#in').inputValue(),'15','Stepping must never silently edit IN');
 await page.getByRole('button',{name:'Mark OUT',exact:true}).click();assert.equal(await page.locator('#out').inputValue(),'16');
 await page.locator('#in').fill('0');await page.locator('#out').fill('24');await page.locator('#out').dispatchEvent('change');await page.locator('#addCut').click();
 assert.equal(await page.locator('#in').inputValue(),'24');
 await page.locator('#next').click();assert.equal(await page.locator('#in').inputValue(),'24','Stepping after Add cut moves picture only');
 await page.locator('#inHandle').press('ArrowLeft');await page.locator('#inHandle').press('ArrowLeft');assert.equal(await page.locator('#in').inputValue(),'22');
 await page.locator('#in').fill('20');await page.locator('#out').fill('48');await page.locator('#out').dispatchEvent('change');await page.locator('#cutName').fill('question');await page.locator('#addCut').click();
 assert.match(await page.locator('#cutList').innerText(),/F0–24/);assert.match(await page.locator('#cutList').innerText(),/F20–48/);
 await page.getByRole('button',{name:'Edit cut 1',exact:true}).click();assert.equal(await page.locator('#out').inputValue(),'24');await page.locator('#newCut').click();
 await page.reload();await page.waitForFunction(()=>document.querySelector('#cutCount').textContent==='2'&&!document.querySelector('#saveBatch').disabled);
 await page.locator('#saveBatch').click();await page.waitForFunction(()=>!document.querySelector('#finishBatch').disabled);
 assert.equal(writes,1);assert.equal(savedRequest.cuts[1].sourceStart,20/24);assert.equal(original.sha256,digest);
 await page.route('**/tools/caplock/**',r=>r.fulfill({contentType:'text/html',body:'<title>CapLock handoff</title>'}));await page.locator('#finishBatch').click();await page.waitForURL(/caplock/);
 assert.equal(new URL(page.url()).searchParams.get('caption'),'original');assert.equal(new URL(page.url()).searchParams.get('project'),'caption-fixture');
 // Empty caption project keeps import available and never substitutes the bed.
 await page.goto('http://127.0.0.1:8767/tools-home/tools/cliplock/?project=empty-fixture');await page.waitForFunction(()=>!document.querySelector('#importCaption').disabled);
 assert.equal(await page.locator('#video').isVisible(),false);assert.match(await page.locator('#emptyMessage').innerText(),/No caption animation/);
 await page.locator('#import').setInputFiles(source);await page.waitForFunction(()=>!document.querySelector('#next').disabled);
 await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#video').currentTime>.8);const beforePlayStep=await page.locator('#video').evaluate(v=>Math.floor(v.currentTime*24));await page.locator('#next').click();assert.equal(await page.locator('#video').evaluate(v=>v.paused),true);assert.ok(Number((await page.locator('#clock').innerText()).match(/^F([0-9]+)/)[1])>=beforePlayStep,'Step pauses and advances from current playback');
 for(const viewport of [{width:360,height:640},{width:390,height:844},{width:720,height:390}]){await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 assert.deepEqual(errors,[]);
 console.log('Caption-only selection/import, rounded24fps +1, rapid20-tap cursor, reverse stepping, mark isolation, overlap queue, custom naming, draft recovery, save and CapLock handoff passed. Cloud uses authenticated fixtures; no production writes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
