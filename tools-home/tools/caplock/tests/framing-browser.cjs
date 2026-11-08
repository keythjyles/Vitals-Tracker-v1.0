const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async(browser,base)=>{
 const {createProject}=await import('../core.mjs'),{makeToolboxPlacement}=await import('../toolbox-core.mjs');
 const bed=fs.readFileSync('/tmp/caplock-fixtures/source25.mp4'),caption=fs.readFileSync('/tmp/caplock-fixtures/large-caption.mp4'),p=createProject();
 const asset={id:'caption-file',name:'large-caption.mp4',ref:{kind:'local',name:'large-caption.mp4',path:'',size:caption.length},type:'video',frames:24,duration:1,chroma:{enabled:true,color:'#0060b8',similarity:.18,blend:.04}};
 p.media={kind:'local',name:'source25.mp4',size:bed.length};p.toolbox=[asset];p.clips=[makeToolboxPlacement(asset,0,'caption-one')];p.clips[0].outFrame=50;p.clips[0].playbackRate=.5;p.editFocus='overlay';p.bedTransform.y=7.8125;
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await context.addInitScript(p=>localStorage.setItem('gs_caplock_draft_v1',JSON.stringify(p)),p);
 const url=new URL(base);url.searchParams.set('recover','local');url.searchParams.set('fitBed','1');await page.goto(url.href);
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Saved placements restored.'));
 const draft=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('gs_caplock_draft_v1')));let q=await draft();assert.deepEqual(q.clips,p.clips);assert.deepEqual(q.bedTransform,{x:50,y:50,scale:1});
 const archive=await page.evaluate(()=>JSON.parse(localStorage.getItem('gs_caplock_previous_workspaces')).at(-1));assert.equal(archive.project.bedTransform.y,7.8125);assert.deepEqual(archive.project.clips,p.clips);
 await page.locator('#reconnectFiles').setInputFiles(['/tmp/caplock-fixtures/source25.mp4','/tmp/caplock-fixtures/large-caption.mp4']);await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Reconnected video and 1 layers.'));
 // A gesture on the bed after caption Move cannot inherit the caption's Move mode.
 await page.locator('#focusOverlay').click();await page.locator('#railMove').click();assert.equal(await page.locator('#railMove').getAttribute('aria-pressed'),'true');
 const bedId=(await draft()).clips[0].id,bedLayer=page.locator('.media-layer[data-clip-id="'+bedId+'"]');
 const box=await bedLayer.boundingBox(),x=box.x+box.width*.1,y=box.y+box.height*.3;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-70);await page.mouse.up();
 q=await draft();assert.equal(q.clips[0].y,50);assert.equal(await page.locator('#railMove').getAttribute('aria-pressed'),'false');
 await page.locator('#railMove').click();await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-25);await page.mouse.up();assert.notEqual((await draft()).clips[0].y,50);
 await page.locator('#focusReset').click();assert.equal((await draft()).clips[0].y,50);assert.equal(await page.locator('#itemCount').textContent(),'2');
 assert.equal(await page.locator('.media-layer[data-clip-id="caption-one"] .keyed-frame').evaluate(c=>c.width),540);
 // Opening settings retains the bed playhead. Marks use that frame and fit the whole animation.
 const jump=async frame=>{await page.locator('[data-for=seek] input').fill(String(frame));await page.getByRole('button',{name:'Go to frame',exact:true}).click();};
 await jump(25);await page.locator('#clipTimeline .item-open').last().click();assert.match(await page.locator('#clipBedFrame').textContent(),/Timeline F25/);assert.equal(await page.locator('#clipMarkIn').isVisible(),true);assert.equal(await page.locator('#clipMarkOut').isEnabled(),true);
 await page.locator('#clipMarkIn').click();assert.equal(await page.locator('#clipStart').inputValue(),'25');assert.equal(await page.locator('#clipEnd').inputValue(),'75');await page.locator('#closeClipProperties').click();
 await jump(60);await page.locator('#clipTimeline .item-open').last().click();assert.match(await page.locator('#clipBedFrame').textContent(),/Timeline F60/);await page.locator('#clipMarkOut').click();assert.equal(await page.locator('#clipEnd').inputValue(),'60');assert.ok(Math.abs(Number(await page.locator('#clipSpeed').inputValue())-25/35)<1e-10);await page.locator('#closeClipProperties').click();
 // Decode the actual exported first and final frames, comparing the complete picture to the source.
 await page.getByText('Save, recover & export',{exact:true}).click();const download=page.waitForEvent('download');await page.locator('#saveVideo').click();const output=fs.readFileSync(await(await download).path());
 const result=await page.evaluate(async({source,output})=>{
  const m=await import('/tools-home/tools/sxlock/vendor/mediabunny-1.62.1-gs1.mjs'),inputs=[source,output].map(bytes=>new m.Input({formats:m.ALL_FORMATS,source:new m.BlobSource(new Blob([new Uint8Array(bytes)],{type:'video/mp4'}))}));
  try{const tracks=await Promise.all(inputs.map(i=>i.getPrimaryVideoTrack())),sinks=tracks.map(t=>new m.VideoSampleSink(t));let frames=0;for await(const packet of new m.EncodedPacketSink(tracks[1]).packets(undefined,undefined,{metadataOnly:true}))frames++;
   const means=[];for(const time of [0,74/25]){const arrays=[];for(const sink of sinks){const sample=await sink.getSample(time),f=sample.toVideoFrame(),c=document.createElement('canvas');c.width=f.displayWidth;c.height=f.displayHeight;const ctx=c.getContext('2d');ctx.drawImage(f,0,0);arrays.push(ctx.getImageData(0,0,c.width,c.height).data);f.close();sample.close();}let total=0;for(let i=0;i<arrays[0].length;i+=4)for(let k=0;k<3;k++)total+=Math.abs(arrays[0][i+k]-arrays[1][i+k]);means.push(total/(arrays[0].length/4*3));}
   return{frames,width:await tracks[1].getDisplayWidth(),height:await tracks[1].getDisplayHeight(),audio:!!await inputs[1].getPrimaryAudioTrack(),wholeFramePixelErrors:means};
  }finally{inputs.forEach(i=>i.dispose());}
 },{source:[...bed],output:[...output]});
 assert.equal(result.frames,75);assert.equal(result.width,270);assert.equal(result.height,480);assert.equal(result.audio,true);assert.ok(result.wholeFramePixelErrors.every(v=>v<12),JSON.stringify(result));
 await page.screenshot({path:'/tmp/caplock-fixtures/r23-framing.png',fullPage:true});assert.deepEqual(errors,[]);console.log(JSON.stringify({framingR23:{fullPictureFirstAndFinalFrames:true,recoveryRetainsCaptions:true,shiftedBedArchived:true,overlayMoveCannotShiftBed:true,explicitBedMoveAndFit:true,currentFrameMarks:true,settingsRetainBedFrame:true,...result,errors}}));await context.close();
};
