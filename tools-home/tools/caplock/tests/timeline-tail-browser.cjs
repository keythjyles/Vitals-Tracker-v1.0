const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async(browser,base)=>{
 const {createProject}=await import('../core.mjs');
 const saved=createProject(),file='/tmp/caplock-fixtures/tail-bed.mp4';
 saved.media={kind:'local',name:'tail-bed.mp4',size:fs.statSync(file).size};
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await context.addInitScript(p=>localStorage.setItem('gs_caplock_draft_v1',JSON.stringify(p)),saved);
 const url=new URL(base);url.searchParams.set('recover','local');await page.goto(url.href);
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Saved placements restored.'));
 const go=async n=>{await page.locator('[data-for=seek] input').fill(String(n));await page.getByRole('button',{name:'Go to frame',exact:true}).click();};
 await page.locator('#reconnectFiles').setInputFiles(file);await page.waitForFunction(()=>!document.querySelector('#play').disabled);
 await go(5);await page.locator('#toolboxFiles').setInputFiles(['/tmp/caplock-fixtures/late-goat.mp4','/tmp/caplock-fixtures/silent-goat.mp4']);
 await page.waitForFunction(()=>document.querySelector('#toolboxStatus').textContent.includes('3 files in'));
 await page.getByRole('button',{name:'Insert late-goat.mp4',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#itemCount').textContent==='2');
 assert.equal(await page.locator('#seek').getAttribute('max'),'29');assert.match(await page.locator('#placementState').textContent(),/30 frames/);
 await page.locator('#clipTimeline .item-open').last().click();await page.locator('#clipVolume').fill('70');await page.locator('#clipVolume').press('Tab');
 await page.waitForFunction(()=>document.querySelector('#clipVolumeInfo').textContent.includes('source sound starts near'));
 const firstSound=Number((await page.locator('#clipVolumeInfo').textContent()).match(/near ([0-9.]+)s/)[1]);assert.ok(firstSound>.55&&firstSound<.65);
 await page.locator('#captionBackground summary').click();await page.locator('#chromaEnabled').uncheck();await page.locator('#applyClip').click();await page.locator('#closeClipProperties').click();
 await go(0);await page.locator('#play').click();
 await page.waitForFunction(()=>Number(document.querySelector('#seek').value)>=11&&document.querySelector('.media-layer video').paused);
 assert.equal(await page.locator('.media-layer video').last().evaluate(v=>v.paused),false);
 await page.locator('#play').click();assert.equal(await page.locator('.media-layer video').last().evaluate(v=>v.paused),true);
 // Resume at a tail frame and measure actual HTML media sound, not just its mute flag.
 await go(21);await page.evaluate(async()=>{const v=[...document.querySelectorAll('.media-layer video')].at(-1),ctx=new AudioContext(),meter=ctx.createAnalyser();meter.fftSize=1024;ctx.createMediaElementSource(v).connect(meter).connect(ctx.destination);await ctx.resume();window.tailAudio={ctx,meter};});
 await page.locator('#play').click();
 const previewRms=await page.evaluate(async()=>{const {meter}=window.tailAudio,a=new Float32Array(meter.fftSize);let peak=0;const end=performance.now()+160;while(performance.now()<end){meter.getFloatTimeDomainData(a);peak=Math.max(peak,Math.sqrt(a.reduce((s,n)=>s+n*n,0)/a.length));await new Promise(requestAnimationFrame);}return peak;});
 assert.ok(previewRms>.02,'No actual tail preview sound: '+previewRms);
 await page.waitForFunction(()=>document.querySelector('#play').textContent.includes('Play')&&document.querySelector('#seek').value==='29');
 await page.locator('#play').click();assert.match(await page.locator('#status').textContent(),/End of timeline/);assert.equal(await page.locator('#seek').inputValue(),'29');
 await page.getByText('Save, recover & export',{exact:true}).click();const download=page.waitForEvent('download');await page.locator('#saveVideo').click();const bytes=[...fs.readFileSync(await(await download).path())];
 const measured=await page.evaluate(async bytes=>{
  const m=await import('/tools-home/tools/sxlock/vendor/mediabunny-1.62.1-gs1.mjs'),i=new m.Input({formats:m.ALL_FORMATS,source:new m.BlobSource(new Blob([new Uint8Array(bytes)],{type:'video/mp4'}))});
  try{
   const track=await i.getPrimaryVideoTrack();let frames=0,end=0;for await(const p of new m.EncodedPacketSink(track).packets()){frames++;end=Math.max(end,p.timestamp+p.duration);}
   const audio=await i.getPrimaryAudioTrack(),parts=[];for await(const b of new m.AudioBufferSink(audio).buffers())parts.push(b);
   const amplitude=(freq,start,end)=>{let re=0,im=0,count=0;for(const part of parts){const b=part.buffer,data=b.getChannelData(0),from=Math.max(0,Math.ceil((start-part.timestamp)*b.sampleRate)),to=Math.min(data.length,Math.ceil((end-part.timestamp)*b.sampleRate));for(let n=from;n<to;n++){const angle=2*Math.PI*freq*(part.timestamp+n/b.sampleRate);re+=data[n]*Math.cos(angle);im+=data[n]*Math.sin(angle);count++;}}return 2*Math.hypot(re,im)/count;};
   const sink=new m.VideoSampleSink(track),pixel=async(t,x,y)=>{const s=await sink.getSample(t);try{const c=new OffscreenCanvas(180,320),ctx=c.getContext('2d');s.draw(ctx,0,0,180,320);return [...ctx.getImageData(x,y,1,1).data];}finally{s.close();}};
   return{frames,end,bedBefore:amplitude(440,.08,.3),bedAfter:amplitude(440,.5,.7),goatBefore:amplitude(1000,.5,.7),goatAfter:amplitude(1000,.9,1.15),bedFirst:await pixel(0,2,2),bedFinalSource:await pixel(.36,2,2),bedLast:await pixel(1.16,2,2),goatLast:await pixel(1.16,90,240)};
  }finally{i.dispose();}
 },bytes);
 assert.equal(measured.frames,30);assert.ok(Math.abs(measured.end-1.2)<.00001);assert.ok(measured.bedBefore>.08);assert.ok(measured.bedAfter<.003);assert.ok(measured.goatBefore<.003);assert.ok(measured.goatAfter>.07&&measured.goatAfter<.1,JSON.stringify(measured));
 assert.ok(measured.bedFinalSource.every((n,k)=>Math.abs(n-measured.bedLast[k])<4));assert.ok(Math.abs(measured.bedFirst[0]-measured.bedLast[0])>20);assert.ok(measured.goatLast[0]>220&&measured.goatLast[1]>220&&measured.goatLast[2]<30);
 // A placement wholly past the bed also exposes the gap and OUT remains editable.
 await page.locator('#clipTimeline .item-open').last().click();await page.locator('#clipStart').fill('15');await page.locator('#clipStart').press('Tab');assert.equal(await page.locator('#clipEnd').inputValue(),'40');assert.equal(await page.locator('#seek').getAttribute('max'),'39');
 await page.locator('#clipEnd').fill('50');await page.locator('#clipEnd').press('Tab');assert.ok(Math.abs(Number(await page.locator('#clipSpeed').inputValue())-25/35)<.0001);assert.equal(await page.locator('#seek').getAttribute('max'),'49');await page.locator('#closeClipProperties').click();
 await page.locator('#insertCaption').click();await page.getByRole('button',{name:'Insert silent-goat.mp4',exact:true}).click();await page.locator('#clipTimeline .item-open').last().click();await page.locator('#clipVolume').fill('70');await page.locator('#clipVolume').press('Tab');
 await page.waitForFunction(()=>document.querySelector('#clipVolumeInfo').textContent.includes('audio track is silent'));
 await page.screenshot({path:'/tmp/caplock-fixtures/r25-timeline-tail.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({timelineTailR25:{previewContinuesPastBed:true,tailPauseResume:true,previewRms,sourceSoundDiagnostic:true,silentTrackDiagnostic:true,lateInsertion:true,editableOut:true,...measured,errors}}));await context.close();
};
