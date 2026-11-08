const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async(browser,base)=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await context.route('https://gs-previewlock-api.onrender.com/**',route=>{requests.push(route.request().url());return route.fulfill({status:503,json:{error:'Local test'}});});
 await page.goto(base);let chooser=page.waitForEvent('filechooser');await page.locator('#emptyVideoFiles').click();await(await chooser).setFiles('/tmp/caplock-fixtures/source25.mp4');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Source loaded from your device'));
 await page.locator('#editActiveCaption').click();chooser=page.waitForEvent('filechooser');await page.getByText('Import numbered files',{exact:true}).click();await(await chooser).setFiles(['blue','green'].map((color,i)=>({name:(i+1)+' '+color+' caption.mp4',mimeType:'video/mp4',buffer:fs.readFileSync('/tmp/caplock-fixtures/'+color+'-caption.mp4')})));
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('2 captions ready.'));
 const pixel=()=>page.locator('.media-layer:not([hidden]) .keyed-frame').last().evaluate(c=>{const x=c.getContext('2d');return {corner:[...x.getImageData(2,2,1,1).data],left:[...x.getImageData(80,80,1,1).data],right:[...x.getImageData(230,80,1,1).data]};});
 let p=await pixel();assert.equal(p.corner[3],0);assert.equal(p.left[3],255);assert.equal(p.right[3],0);
 const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('gs_caplock_draft_v1')));assert.equal(draft.version,8);assert.equal(draft.clips.every(c=>c.chroma?.enabled),true);
 const raw=await page.locator('.media-layer video').first().evaluate(v=>{const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const x=c.getContext('2d');x.drawImage(v,0,0);return [...x.getImageData(2,2,1,1).data];});assert.equal(raw[3],255);assert.ok(raw[2]>150,'original blue pixels remain in the original video');
 await page.locator('#insertCaption').click();await page.locator('[data-for=seek] input').fill('13');await page.getByRole('button',{name:'Go to frame',exact:true}).click();await page.waitForFunction(()=>{const c=document.querySelector('.media-layer:not([hidden]) .keyed-frame');return c&&c.getContext('2d').getImageData(230,80,1,1).data[3]===255;});p=await pixel();assert.equal(p.left[3],0,'previous frame cleared without ghost trails');assert.equal(p.corner[3],0);
 await page.locator('#clipTimeline .item-open').first().click();
 const mirror=page.locator('#clipMirror'),flip=page.locator('#clipFlip');
 const previewScale=()=>page.locator('.media-layer:not([hidden]) .keyed-frame').first().evaluate(canvas=>{
  const transform=new DOMMatrix(getComputedStyle(canvas).transform);return [transform.a,transform.d];
 });
 await mirror.click();assert.equal(await mirror.getAttribute('aria-pressed'),'true');assert.deepEqual(await previewScale(),[-1,1]);
 await flip.click();assert.equal(await flip.getAttribute('aria-pressed'),'true');assert.deepEqual(await previewScale(),[-1,-1]);
 const orientedDraft=await page.evaluate(()=>JSON.parse(localStorage.getItem('gs_caplock_draft_v1')));
 const {mirrorX,flipY}=orientedDraft.clips[0];
 assert.equal(orientedDraft.version,9);assert.equal(mirrorX,true);assert.equal(flipY,true);
 await mirror.click();assert.deepEqual(await previewScale(),[1,-1]);
 await page.locator('#closeClipProperties').click();await page.locator('#layerUndo').click();assert.deepEqual(await previewScale(),[-1,-1]);
 await page.locator('#layerRedo').click();assert.deepEqual(await previewScale(),[1,-1]);
 await page.locator('#nextCaption').click();p=await pixel();assert.equal(p.corner[3],0);assert.equal(p.left[3],255,'green background removed on next caption');
 await page.locator('#editActiveCaption').click();await page.locator('#captionBackground summary').click();await page.locator('#chromaEnabled').uncheck();assert.equal(await page.locator('.media-layer:not([hidden]) video').last().isVisible(),true);await page.locator('#chromaEnabled').check();assert.equal(await page.locator('.media-layer:not([hidden]) .keyed-frame').last().isVisible(),true);await page.locator('#closeClipProperties').click();
 // Exercise the same compositor/export engine used by Next → SxLock, then decode its actual MP4.
 const exported=await page.evaluate(async({bedBytes,clipBytes,orientation})=>{
  const {createProject}=await import('/tools-home/tools/caplock/core.mjs?v=20-key'),{renderCaptioned}=await import('/tools-home/tools/caplock/composite.mjs?v=20-key'),m=await import('/tools-home/tools/sxlock/vendor/mediabunny-1.62.1-gs1.mjs');
  const p=createProject(),bed=new Blob([new Uint8Array(bedBytes)],{type:'video/mp4'}),clip=new Blob([new Uint8Array(clipBytes)],{type:'video/mp4'});
  p.media={kind:'local',name:'bed.mp4',size:bed.size};p.clips=[{id:'one',name:'1 blue.mp4',captionNumber:1,type:'video',ref:{kind:'local',name:'1 blue.mp4',size:clip.size},inFrame:0,outFrame:25,trimInFrame:0,trimOutFrame:25,playbackRate:1,x:50,y:50,width:100,rotation:0,opacity:1,volume:0,visible:true,placed:true,loop:false,chroma:{enabled:true,color:'#0060b8',similarity:.18,blend:.04}}];
  async function renderPixels(){
   const result=await renderCaptioned({project:p,bed,readAsset:async()=>clip}),input=new m.Input({formats:m.ALL_FORMATS,source:new m.BlobSource(result.blob)}),track=await input.getPrimaryVideoTrack(),sample=await new m.VideoSampleSink(track).getSample(.04);
   const canvas=document.createElement('canvas');canvas.width=180;canvas.height=320;
   const ctx=canvas.getContext('2d'),frame=sample.toVideoFrame();ctx.drawImage(frame,0,0);frame.close();sample.close();
   const at=(x,y)=>[...ctx.getImageData(x,y,1,1).data],audio=!!await input.getPrimaryAudioTrack();input.dispose();
   return {report:result.report,bg:at(10,130),letter:at(45,144),mirrorOnly:at(135,144),flipOnly:at(45,177),both:at(135,177),audio,recipe:result.recipe};
  }
  const regular=await renderPixels();
  Object.assign(p.clips[0],orientation);
  return {...regular,oriented:await renderPixels()};
 },{bedBytes:[...fs.readFileSync('/tmp/caplock-fixtures/key-bed.mp4')],clipBytes:[...fs.readFileSync('/tmp/caplock-fixtures/blue-caption.mp4')],orientation:{mirrorX,flipY}});
 assert.equal(exported.report.outputFrames,25);assert.equal(exported.audio,true);assert.ok(Math.abs(exported.bg[0]-34)<10&&Math.abs(exported.bg[1]-51)<10&&Math.abs(exported.bg[2]-68)<10,JSON.stringify(exported));assert.ok(exported.letter[0]>180&&exported.letter[1]>180&&exported.letter[2]<70,JSON.stringify(exported));assert.equal(exported.recipe.clips[0].chroma.enabled,true);
 const oriented=exported.oriented;
 assert.equal(oriented.report.outputFrames,25);assert.equal(oriented.audio,true);
 assert.equal(oriented.recipe.clips[0].mirrorX,true);assert.equal(oriented.recipe.clips[0].flipY,true);
 const yellow=pixel=>pixel[0]>180&&pixel[1]>180&&pixel[2]<70;
 assert.ok(yellow(oriented.both),'export moves the keyed marker along both axes');
 for(const sample of [oriented.letter,oriented.mirrorOnly,oriented.flipOnly]){
  assert.ok(sample.slice(0,3).every((channel,i)=>Math.abs(channel-exported.bg[i])<10),'vacated pixels reveal the bed');
 }
 console.log('CapLock orientation verified in preview and decoded MP4, including layer undo and redo.');
 await page.screenshot({path:'/tmp/caplock-fixtures/r20-background.png',fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log(JSON.stringify({captionBackground:{blue:true,green:true,originalPixelsIntact:true,existingAlphaInMainSuite:true,seekClearsPriorFrame:true,editableToggle:true,localCloudRequests:0,exportFrames:25,exportAudio:true,exportPixels:exported.bg,letterPixels:exported.letter,errors}}));await context.close();
};
