const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
(async()=>{
 const dir='/tmp/gs-studio-fixtures';await fs.mkdir(dir,{recursive:true});
 const ff=args=>execFileSync('ffmpeg',['-v','error','-y',...args]);
 ff(['-f','lavfi','-i','testsrc2=size=160x90:rate=24:duration=4','-c:v','libx264','-pix_fmt','yuv420p',dir+'/caption.mp4']);
 ff(['-f','lavfi','-i','testsrc2=size=90x160:rate=25:duration=4','-c:v','libx264','-pix_fmt','yuv420p',dir+'/bed.mp4']);
 ff(['-f','lavfi','-i','color=c=red:s=100x40:r=25:d=1,format=yuva420p,lut=a=128','-c:v','libvpx-vp9','-lossless','1','-auto-alt-ref','0',dir+'/alpha.webm']);
 const bed=await fs.readFile(dir+'/bed.mp4'),caption=await fs.readFile(dir+'/caption.mp4'),alpha=await fs.readFile(dir+'/alpha.webm'),hash=b=>createHash('sha256').update(b).digest('hex'),id='dad-studio-fixture',root='/Grill Sergeant/JokeLab Productions/'+id;
 const source={id:'caption-a',role:'caption',name:'caption.mp4',path:root+'/captions/caption.mp4',size:caption.length,sha256:hash(caption),cuts:{id:'cut-01',version:1,status:'complete',chroma:{enabled:false,color:'#0a77d4'},ranges:[{number:1,inFrame:0,outFrame:25,sourceInFrame:0,sourceOutFrame:24,sourceStart:0,sourceEnd:1}],clips:[{number:1,name:'1.webm',path:root+'/captions/clips/1.webm',frames:25,fps:25,size:alpha.length,sha256:hash(alpha)}]}};
 const p={schema:'GS-JokeProject-1',version:1,id,title:'Fixture joke',text:'Why did the fixture cross the road? For a test.',assets:[{id:'bed-a',role:'bed',name:'bed.mp4',path:root+'/video/bed.mp4',size:bed.length,sha256:hash(bed)},source,{id:'animation-a',role:'animation',name:'reaction.webm',path:root+'/animations/reaction.webm',size:alpha.length,sha256:hash(alpha)}]};
 p.studio={bedAssetId:'bed-a',modules:{}};
 p.assets.push({id:'bed-b',role:'bed',name:'bed2.mp4',path:root+'/video/bed2.mp4',size:bed.length,sha256:hash(bed)});
 let rev=0,renderCalls=0,studioWrites=0,createCalls=0,created=null;
 const scribeEntries=new Map();
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await context.addInitScript(()=>localStorage.setItem('gs_previewlock_key','disposable-fixture-only'));
 await context.route('**/data/jokelab/library.json',r=>r.fulfill({json:{jokes:[{id,text:p.text,sources:[]},{id:'dad-brand-new',text:'New joke selected before any video exists.',sources:[]}]}}));
 await context.route('**/jokelab/PRODUCTION_LEDGER.json',r=>r.fulfill({json:{existingGroups:[],currentProductions:[],sourceBacklog:[],selectedBatch:[],aliases:{}}}));
 await context.route('**/jokelets/catalog.json',r=>r.fulfill({json:{catalog:[]}}));
 await context.route('https://api.github.com/**',r=>r.fulfill({json:[]}));
 await context.route('https://gs-previewlock-api.onrender.com/**',async r=>{
  const u=new URL(r.request().url()),method=r.request().method(),headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type'};if(method==='OPTIONS')return r.fulfill({status:204,headers});
  let d,status=200;if(u.searchParams.get('id')==='dad-brand-new'&&u.pathname==='/api/joke-project'){if(method==='POST'){createCalls++;const v=r.request().postDataJSON();created={id:'dad-brand-new',title:v.title,text:v.text,assets:[]};}return r.fulfill({headers,json:{project:created,rev:created?'new-1':null,capabilities:{studio:1,clipBatch:2,cutPass:1}}});}if(u.pathname==='/api/joke-project'&&method==='GET')d={project:p,rev:String(rev),capabilities:{studio:1,clipBatch:2,cutPass:1}};
  else if(u.pathname==='/api/joke-project'&&method==='POST'){createCalls++;const v=r.request().postDataJSON();assert.equal(v.rev,String(rev));p.title=v.title;p.text=v.text;d={project:p,rev:String(++rev),persisted:true};}
  else if(u.pathname==='/api/joke-project/studio'){const v=r.request().postDataJSON();if(v.rev!==String(rev)||(v.moduleRevision||0)!==(p.studio?.modules?.[v.module]?.revision||0)){status=409;d={error:'Stale fixture edit'};}else{studioWrites++;p.studio={...p.studio,activePhase:v.nextPhase,modules:{...p.studio?.modules,[v.module]:{revision:(p.studio?.modules?.[v.module]?.revision||0)+1,session:v.session}},...(v.module==='joke'&&v.session.bedAssetId?{bedAssetId:v.session.bedAssetId}:{})};d={project:p,rev:String(++rev),persisted:true};}}
  else if(u.pathname==='/api/joke-project/caplock'&&method==='GET')d={project:p,asset:source,session:p.caplock||null,rev:String(rev)};
  else if(u.pathname==='/api/joke-project/caplock'&&method==='POST'){const v=r.request().postDataJSON();assert.equal(v.rev,String(rev));p.caplock=v.session;p.caplockUpdated=new Date().toISOString();p.caplockDigest=hash(Buffer.from(JSON.stringify(v.session)));d={project:p,rev:String(++rev),persisted:true};}
  else if(u.pathname==='/api/joke-project/cuts'){renderCalls++;throw Error('Navigation must not render cuts.');}
  else if(u.pathname==='/api/playback')d={url:'http://127.0.0.1:8768/studio-fixture/'+encodeURIComponent(u.searchParams.get('path').split('/').pop())};
  else if(u.pathname==='/api/joke-projects')d={projects:[{id}],has_more:false};
  else if(u.pathname==='/api/assets')d={entries:[],has_more:false};
  else if(u.pathname==='/api/scribe-history'){
   if(method==='POST'){const note=r.request().postDataJSON();scribeEntries.set(note.id,note);d={id:note.id,persisted:true};}
   else d={entries:[...scribeEntries.values()],next:null};
  }
  else {status=400;d={error:'Unexpected fixture route '+u.pathname};}
  await r.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(d)});
 });
 await context.route('**/studio-fixture/**',r=>{const name=decodeURIComponent(new URL(r.request().url()).pathname.split('/').pop()),bytes=name==='caption.mp4'?caption:name.startsWith('bed')?bed:alpha;const range=/bytes=(\d+)-(\d*)/.exec(r.request().headers().range||'');let body=bytes,status=200,headers={'accept-ranges':'bytes'};if(range){const a=+range[1],b=range[2]?Math.min(+range[2],bytes.length-1):bytes.length-1;body=bytes.subarray(a,b+1);status=206;headers['content-range']=`bytes ${a}-${b}/${bytes.length}`;}return r.fulfill({status,headers,contentType:name.endsWith('.webm')?'video/webm':'video/mp4',body});});
 await page.goto('http://127.0.0.1:8768/tools-home/tools/studio/');
 const selector=page.frameLocator('#jokeSelector');await selector.getByRole('button',{name:'Select',exact:true}).first().waitFor();assert.equal(studioWrites,0);assert.equal(createCalls,0);assert.equal(await page.locator('[data-phase=cut]').isDisabled(),true);
 await selector.getByRole('button',{name:'Select',exact:true}).first().click();await page.locator('#jokeWorkspace').waitFor({state:'visible'});assert.equal(await page.locator('#text').inputValue(),p.text);assert.equal(createCalls,0);
 await page.locator('#phrases').fill('Why did\nthe fixture\n?\nFor a test.');await page.locator('#saveWork').click();await page.waitForFunction(()=>document.querySelector('#saveState').textContent.includes('Saved in Dropbox'));
 const enter=async(name)=>{await page.locator(`[data-phase=${name}]`).click();try{await page.waitForFunction(name=>document.querySelector('#saveState').textContent.includes(name+' · Fixture joke · playback paused'),name[0].toUpperCase()+name.slice(1));}catch(e){console.log(JSON.stringify({phase:name,status:await page.locator('#saveState').textContent(),dialog:await page.locator('#errorText').textContent(),errors}));await page.screenshot({path:'/tmp/gs-studio-r1-browser.png'});throw e;}return page.frameLocator('#moduleHost iframe');};
 let tool=await enter('cut');await tool.locator('#next').waitFor({state:'visible'});await tool.locator('#cutList button').first().click();await tool.locator('#cutName').fill('Question');await tool.locator('#jumpFrame').fill('2');await tool.locator('#goFrame').click();await tool.locator('#markIn').click();await tool.locator('#addCut').click();assert.match(await tool.locator('#cutList').textContent(),/Question/);
 tool=await enter('captions');await tool.locator('#video').evaluate(v=>v.readyState>=2);await tool.locator('#insertCaption').click();await tool.locator('#itemCount').waitFor();assert.equal(await tool.locator('#itemCount').textContent(),'1');
 tool=await enter('cut');assert.match(await tool.locator('#cutList').textContent(),/Question/);assert.equal(renderCalls,0);assert.equal(source.cuts.clips.length,1);
 tool=await enter('captions');assert.equal(await tool.locator('#itemCount').textContent(),'1');assert.equal(await tool.locator('#video').evaluate(v=>v.paused),true);
 tool=await enter('scene');await tool.locator('#editAdded').click();await tool.locator('[data-for=x] input').fill('539');await tool.locator('[data-for=x] button').click();await tool.locator('#closeItemProperties').click();
 tool=await enter('sound');await tool.locator('#addEffect').click();await tool.locator('#sheetSearch').fill('Cricket');await tool.locator('#effectSheet').getByRole('button',{name:'Place Cricket chirps',exact:true}).click();await tool.locator('#applyEffect').click();await tool.getByRole('textbox',{name:'Scribe notes'}).fill('Saved sound direction');
 tool=await enter('review');assert.equal(await tool.locator('#player').evaluate(v=>v.paused),true);assert.match(await tool.locator('#message').textContent(),/Source preview/);
 tool=await enter('scene');assert.equal(await tool.locator('#x').inputValue(),'539');
 tool=await enter('sound');assert.equal(await tool.locator('#notes').inputValue(),'Saved sound direction');assert.equal(p.studio.modules.sound.session.state.clips.length,1);assert.equal(await tool.locator('#video').evaluate(v=>v.paused),true);
 await page.locator('#saveWork').click();await page.waitForFunction(()=>document.querySelector('#saveState').textContent.includes('Saved in Dropbox'));
 // Choosing the bed once carries it through the existing visual and sound engines.
 await page.locator('#assets').click();await page.locator('#jokeWorkspace').waitFor({state:'visible'});await page.getByRole('button',{name:'Use as bed',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#saveState').textContent.includes('Bed selected for this joke'));assert.equal(p.studio.bedAssetId,'bed-b');
 tool=await enter('captions');assert.equal(await tool.locator('#bedName').textContent(),'bed2.mp4');
 tool=await enter('scene');assert.equal(await tool.locator('#baseChosen').textContent(),'bed2.mp4');
 tool=await enter('sound');assert.match(await tool.locator('#videoName').textContent(),/bed2.mp4/);await page.locator('#saveWork').click();await page.waitForFunction(()=>document.querySelector('#saveState').textContent.includes('Saved in Dropbox'));
 // A stale module write must leave the active editor available and retain its new local notes.
 p.studio.modules.sound.revision++;await tool.locator('#notes').fill('Unsaved new direction');await page.locator('[data-phase=review]').click();await page.locator('#errorDialog').waitFor({state:'visible'});assert.equal(await tool.locator('#notes').inputValue(),'Unsaved new direction');await page.locator('#closeError').click();
 // Reload re-enters via the joke picker; existing cloud checkpoints are available across contexts.
 await page.goto('http://127.0.0.1:8768/tools-home/tools/studio/');await page.frameLocator('#jokeSelector').getByRole('button',{name:'Select',exact:true}).first().click();await page.locator('#jokeWorkspace').waitFor({state:'visible'});assert.equal(await page.locator('#phrases').inputValue(),'Why did\nthe fixture\n?\nFor a test.');tool=await enter('sound');assert.equal(await tool.locator('#notes').inputValue(),'Saved sound direction');
 for(const size of [{width:360,height:740},{width:709,height:1536}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
 const manifest=await page.request.get('http://127.0.0.1:8768/tools-home/tools/studio/app.webmanifest').then(r=>r.json());assert.equal(manifest.start_url,'./');assert.equal(manifest.display,'standalone');assert.equal(manifest.icons.length,2);
 await page.screenshot({path:'/tmp/gs-studio-r1-browser.png',fullPage:false});
 await page.goto('http://127.0.0.1:8768/tools-home/tools/studio/');await page.frameLocator('#jokeSelector').locator('[data-joke-id="dad-brand-new"]').getByRole('button',{name:'Select',exact:true}).click();await page.locator('#jokeWorkspace').waitFor({state:'visible'});assert.equal(createCalls,1);assert.equal(created.text,'New joke selected before any video exists.');assert.deepEqual(created.assets,[]);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({studio:{jokeFirst:true,sourceSelectionNoGeneration:true,nativeCutCaptionRoundTrip:true,unrenderedCutsDurable:true,sceneSoundReviewRoundTrip:true,pausedRestore:true,staleWriteKeepsEdit:true,reloadRecovers:true,installManifest:true,studioWrites,renderCalls,errors}}));await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
