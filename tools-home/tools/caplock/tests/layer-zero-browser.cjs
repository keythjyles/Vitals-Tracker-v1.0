const assert=require('node:assert/strict');
const fs=require('node:fs/promises');

module.exports=async(browser,base)=>{
 const context=await browser.newContext({viewport:{width:360,height:640},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.accept());
 await page.goto(base);
 const locator=id=>page.locator('#'+id);
 const row=()=>page.locator('#clipTimeline .item-open');
 const draft=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('gs_caplock_draft_v1')));
 const count=n=>page.waitForFunction(n=>document.querySelector('#itemCount').textContent===String(n),n);
 const goTrim=async n=>{
  await locator('trimGoFrame').fill(String(n));
  await locator('trimGo').getByRole('button',{name:'Go',exact:true}).click();
 };
 const save=async()=>{
  const download=page.waitForEvent('download',{timeout:30000});
  await locator('saveVideo').click();
  return [...await fs.readFile(await(await download).path())];
 };
 const inspect=async(bytes,checkPixels)=>page.evaluate(async({bytes,checkPixels})=>{
  const vendor='/tools-home/tools/sxlock/vendor/mediabunny-1.62.1-gs1.mjs';
  const m=await import(vendor),input=new m.Input({formats:m.ALL_FORMATS,source:new m.BlobSource(new Blob([new Uint8Array(bytes)]))});
  try{
   const track=await input.getPrimaryVideoTrack();
   const audio=await input.getPrimaryAudioTrack();
   let frames=0;
   for await(const _ of new m.EncodedPacketSink(track).packets(undefined,undefined,{metadataOnly:true}))frames++;
   const result={frames,width:await track.getDisplayWidth(),height:await track.getDisplayHeight(),duration:await track.computeDuration(),audio:!!audio};
   if(!checkPixels)return result;
   const sample=await new m.VideoSampleSink(track).getSample(0),canvas=new OffscreenCanvas(result.width,result.height);
   const ctx=canvas.getContext('2d');
   sample.draw(ctx,0,0);
   sample.close();
   result.bottomLeft=[...ctx.getImageData(20,280,1,1).data];
   result.topRight=[...ctx.getImageData(160,40,1,1).data];
   let squares=0,n=0;
   for await(const {buffer,timestamp} of new m.AudioBufferSink(audio).buffers()){
    const data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++){
     const t=timestamp+i/buffer.sampleRate;
     if(t>=.05&&t<.25){squares+=data[i]**2;n++;}
    }
   }
   result.rms=Math.sqrt(squares/n);
   return result;
  }finally{input.dispose();}
 },{bytes,checkPixels});

 await locator('newVideoFile').setInputFiles('/tmp/caplock-fixtures/trim-source.mp4');
 await count(1);
 await page.waitForFunction(()=>!document.querySelector('#insertCaption').disabled);
 assert.match(await row().first().textContent(),/Layer 0 · trim-source.mp4/);
 const initial=await draft(),baseId=initial.clips[0].id;
 assert.equal(initial.toolbox.length,1);
 assert.equal(initial.clips[0].toolboxId,initial.toolbox[0].id);
 assert.equal(initial.clips[0].inFrame,0);
 await locator('insertCaption').click();
 assert.match(await locator('toolboxList').textContent(),/Used 1×/);
 await locator('toolboxClose').click();

 await row().first().click();
 await locator('rotateMode').click();
 await locator('clipRotation').fill('180');
 await locator('clipWidth').fill('67');
 await locator('applyClip').click();
 await locator('clipFit').click();
 assert.equal(await locator('clipWidth').inputValue(),'100');
 await locator('clipMirror').click();
 await locator('clipFlip').click();
 assert.equal(await locator('clipFlip').getAttribute('aria-pressed'),'true');
 await locator('clipFlip').click();
 await locator('openTrim').click();
 await page.waitForFunction(()=>!document.querySelector('#trimApply').disabled);
 assert.match(await locator('trimSummary').textContent(),/36 frames · 1.200 s/);
 await goTrim(12);
 await page.getByRole('button',{name:'Next source frame',exact:true}).click();
 assert.match(await locator('trimPosition').textContent(),/F13 \/ 36 · 0.433 s/);
 await locator('trimMarkIn').click();
 await locator('trimCancel').click();
 assert.equal((await draft()).clips[0].sourceTrim,undefined);

 await locator('openTrim').click();
 await page.waitForFunction(()=>!document.querySelector('#trimApply').disabled);
 await goTrim(13);await locator('trimMarkIn').click();
 await goTrim(23);await locator('trimMarkOut').click();
 assert.match(await locator('trimSummary').textContent(),/10 frames · 0.333 s/);
 assert.ok(await locator('trimDialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
 await locator('trimApply').click();
 assert.equal(await locator('clipProperties').isVisible(),true);
 assert.equal(await locator('clipEnd').inputValue(),'9');
 const trimmed=(await draft()).clips[0];
 assert.equal(trimmed.rotation,180);
 assert.equal(trimmed.mirrorX,true);
 assert.equal(trimmed.inFrame,0);
 assert.equal(trimmed.playbackRate,1);
 assert.deepEqual([trimmed.sourceTrim.inFrame,trimmed.sourceTrim.outFrame],[13,23]);
 await locator('closeClipProperties').click();
 await locator('layerUndo').click();
 assert.equal((await draft()).clips[0].sourceTrim,undefined);
 await locator('layerRedo').click();
 assert.deepEqual((await draft()).clips[0].sourceTrim,trimmed.sourceTrim);

 await page.getByText('Save, recover & export',{exact:true}).click();
 const result=await inspect(await save(),true);
 assert.equal(result.frames,9);
 assert.equal(result.width,180);
 assert.equal(result.height,320);
 assert.ok(result.audio&&result.rms>.05,JSON.stringify(result));
 assert.ok(result.bottomLeft[0]>220&&result.bottomLeft[1]<45&&result.bottomLeft[2]<30&&result.topRight[0]>220&&result.topRight[1]>220,JSON.stringify(result));

 await locator('toolboxFiles').setInputFiles('/tmp/caplock-fixtures/source25.mp4');
 await page.waitForFunction(()=>document.querySelector('#toolboxStatus').textContent.includes('2 files in'));
 await locator('toolboxAppend').click();
 await page.getByRole('button',{name:'Insert source25.mp4',exact:true}).click();
 await count(2);
 const second=(await draft()).clips[1];
 assert.equal(second.inFrame,9);
 assert.equal(second.volume,1);
 await row().first().click();
 await locator('replaceVideo').click();
 await page.getByRole('button',{name:'Replace with source25.mp4',exact:true}).click();
 assert.deepEqual((await draft()).clips[1],second);
 assert.equal((await draft()).clips[0].ref.name,'source25.mp4');
 await locator('layerUndo').click();
 assert.equal((await draft()).clips[0].id,baseId);
 await page.getByRole('button',{name:'Remove trim-source.mp4',exact:true}).click();
 await count(1);
 await locator('insertCaption').click();
 assert.match(await locator('toolboxList').textContent(),/trim-source.mp4/);
 await locator('toolboxClose').click();
 await row().first().click();
 await locator('clipStart').fill('0');
 await locator('clipStart').press('Tab');
 await locator('closeClipProperties').click();

 const recover=new URL(base);recover.searchParams.set('recover','local');
 await page.goto(recover.href);
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Saved placements restored.'));
 await locator('reconnectFiles').setInputFiles('/tmp/caplock-fixtures/source25.mp4');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Reconnected 1 layers.'));
 await page.getByText('Save, recover & export',{exact:true}).click();
 const swapped=await inspect(await save(),false);
 assert.deepEqual(swapped,{frames:75,width:180,height:320,duration:3,audio:true});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({layerZero:{trimmed:result,reconnectedWithoutOriginalBed:swapped,appendAtExclusiveEnd:true,undoAndReplace:true,errors}}));
 await context.close();
};
