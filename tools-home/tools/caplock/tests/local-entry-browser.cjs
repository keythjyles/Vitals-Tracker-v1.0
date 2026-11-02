const assert=require('node:assert/strict');
module.exports=async(browser,base,alphaBytes)=>{
 const context=await browser.newContext({viewport:{width:360,height:640},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 // A stale saved connection must not make ordinary device loading contact storage.
 await context.addInitScript(()=>{localStorage.setItem('gs_previewlock_key','unavailable-fixture-only');localStorage.setItem('gs_studio_project','dad-stale-fixture');});
 await context.route('https://gs-previewlock-api.onrender.com/**',route=>{requests.push(route.request().url());return route.fulfill({status:503,json:{error:'Cloud unavailable in this device-only test'}});});
 await page.goto(base);await page.locator('.gs-player-line').waitFor();
 let chooser=page.waitForEvent('filechooser');await page.locator('#emptyVideoFiles').click();await (await chooser).setFiles('/tmp/caplock-fixtures/source25.mp4');
 await page.waitForFunction(()=>document.querySelector('#video').readyState>=2&&document.querySelector('#status').textContent.includes('Source loaded from your device'));
 assert.equal(await page.locator('#bedName').textContent(),'source25.mp4');assert.equal(await page.locator('#bedLoader').isVisible(),false);
 assert.equal(await page.locator('.gs-source-drawer').isVisible(),false);
 await page.locator('#editActiveCaption').click();assert.equal(await page.locator('#captionImport').isVisible(),true);assert.equal(await page.locator('#savedCaptionControls').isVisible(),false);assert.equal(await page.locator('#projectPicker').isVisible(),false);
 chooser=page.waitForEvent('filechooser');await page.getByText('Import numbered files',{exact:true}).click();await (await chooser).setFiles([1,2].map(n=>({name:n+'.webm',mimeType:'video/webm',buffer:Buffer.from(alphaBytes)})));
 await page.waitForFunction(()=>!document.querySelector('#insertCaption').disabled);await page.locator('#insertCaption').click();await page.locator('#nextCaption').click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('gs_caplock_draft_v1')));assert.equal(before.clips.length,2);assert.equal(before.clips[0].placed,true);assert.equal(before.clips[1].placed,false);
 // Exercise the actual Photos button/chooser, not the legacy hidden file input.
 await page.locator('#dockGrip').click();chooser=page.waitForEvent('filechooser');await page.locator('#newVideoPhotos').click();await (await chooser).setFiles('/tmp/caplock-fixtures/source30.mp4');
 await page.waitForFunction(()=>document.querySelector('#bedName').textContent==='source30.mp4'&&document.querySelector('#video').readyState>=2&&document.querySelector('#status').textContent.includes('Source loaded from your device'));
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('gs_caplock_draft_v1')));assert.deepEqual(after.clips,before.clips);assert.equal(after.media.kind,'local');assert.equal(after.media.name,'source30.mp4');
 const layouts=[];for(const size of [{width:360,height:640},{width:390,height:844}]){
  await page.setViewportSize(size);await page.waitForTimeout(60);
  const g=await page.evaluate(()=>{const dock=document.querySelector('#playerDock').getBoundingClientRect(),line=document.querySelector('.gs-player-line').getBoundingClientRect(),rail=document.querySelector('.gs-player-rail').getBoundingClientRect(),picture=document.querySelector('.gs-player-picture').getBoundingClientRect();return {dock:dock.height,line:line.height,room:innerHeight-dock.height,aligned:Math.abs(picture.height-rail.height)<1,overflow:document.documentElement.scrollWidth>innerWidth+1};});
  assert.ok(g.line<=17,JSON.stringify(g));assert.ok(g.dock<=370,JSON.stringify(g));assert.ok(g.room>=200,JSON.stringify(g));assert.equal(g.aligned,true);assert.equal(g.overflow,false);layouts.push(g);
 }
 await page.screenshot({path:'/tmp/caplock-fixtures/r18-local-entry.png',fullPage:true});assert.deepEqual(requests,[],'local bed and caption import must not access the cloud');assert.deepEqual(errors,[]);await context.close();
 console.log(JSON.stringify({localEntry:{filesChooser:true,photosChooser:true,cloudRequests:0,numberedCaptionImport:true,insertNext:true,existingLayersRetained:true,layouts,errors}}));
};
