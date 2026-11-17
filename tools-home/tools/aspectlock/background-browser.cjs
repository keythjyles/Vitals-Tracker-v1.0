const assert = require('node:assert/strict');

module.exports = async function checkBackground(browser, caplockURL) {
 const page = await browser.newPage({viewport:{width:360,height:760},isMobile:true,hasTouch:true});
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 const $ = id => page.locator('#' + id);
 const pixels = () => $('output').evaluate(canvas => {
  const ctx = canvas.getContext('2d');
  return [[10,350],[130,460]].map(([x,y])=>[...ctx.getImageData(x,y,1,1).data]);
 });
 const near = (actual, expected, tolerance=10) => expected.every((n,i)=>Math.abs(actual[i]-n)<=tolerance);
 try {
  await page.goto(new URL('../aspectlock/?source=device',caplockURL).href);
  await page.getByRole('button',{name:'Choose bed',exact:true}).tap();
  const choose = page.waitForEvent('filechooser');
  await $('pickDeviceVideo').tap();
  await (await choose).setFiles('/tmp/caplock-fixtures/key-bed.mp4');
  await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Loaded from device:'));
  await $('railToolbox').tap();
  await $('toolboxFiles').setInputFiles('/tmp/caplock-fixtures/blue-caption.mp4');
  await page.getByRole('button',{name:'Overlay blue-caption.mp4 at current frame',exact:true}).tap();
  await page.waitForFunction(()=>document.getElementById('addedName').textContent==='blue-caption.mp4');
  await $('editAdded').tap();
  await $('aspectBackground').locator('summary').tap();
  assert.equal(await $('keyTransparent').getAttribute('aria-pressed'),'true');
  assert.equal(await $('keyMode').inputValue(),'custom','the solid background is sampled on import');
  const [bed, foreground] = await pixels();
  assert.ok(near(bed,[34,51,68]),JSON.stringify(bed));
  assert.ok(foreground[0]>180&&foreground[1]>180&&foreground[2]<70,JSON.stringify(foreground));

  await $('keyKeep').tap();
  const [original] = await pixels();
  assert.ok(original[2]>150&&original[0]<25,JSON.stringify(original));
  await $('keyReplace').tap();
  await $('keyReplacementColor').fill('#a03ed0');
  let [replacement, marker] = await pixels();
  assert.deepEqual(replacement,[160,62,208,255]);
  assert.deepEqual(marker,foreground);
  await $('opacity').fill('65');
  await $('keyBackground').fill('40');
  assert.equal(await $('opacity').inputValue(),'65');
  await $('keyTransparent').tap();
  assert.equal(await $('opacity').inputValue(),'65');
  assert.deepEqual((await pixels())[0],bed);
  await $('keyReplace').tap();
  assert.equal(await $('keyReplacementColor').inputValue(),'#a03ed0');
  await $('opacity').fill('100');
  await $('closeItemProperties').tap();
  const save = $('aspectExport').locator(':scope > summary');
  await save.tap();
  await $('save').tap();
  await page.reload();
  await save.tap();
  await $('restoreEdit').tap();
  await page.waitForFunction(()=>document.getElementById('status').textContent==='Saved edit restored.');
  await page.waitForFunction(()=>{
   const ctx=document.getElementById('output').getContext('2d');
   return ctx.getImageData(10,350,1,1).data[2]>180;
  });
  [replacement,marker]=await pixels();
  assert.deepEqual(replacement,[160,62,208,255]);
  assert.deepEqual(marker,foreground);
  await $('render').tap();
  await page.waitForFunction(()=>document.getElementById('resultVideo').readyState>=2,{},{timeout:30000});
  const decoded=await $('resultVideo').evaluate(video=>{
   const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
   const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0);
   return [[10,350],[130,460]].map(([x,y])=>[...ctx.getImageData(x,y,1,1).data]);
  });
  assert.ok(near(decoded[0],[160,62,208],12),JSON.stringify(decoded));
  assert.ok(near(decoded[1],[255,240,0],14),JSON.stringify(decoded));
  const alpha = await page.evaluate(async()=>{
   const {BackgroundSurface,detectBackground}=await import('../caplock/background.mjs?v=33');
   const {Composition}=await import('./composition.mjs?v=36');
   const source=document.createElement('canvas');source.width=source.height=64;
   const ctx=source.getContext('2d');ctx.fillStyle='#0a77d4';ctx.fillRect(20,20,20,20);
   const key={...detectBackground(source,{includeAlpha:true}),backgroundOpacity:1,replacement:{enabled:true,color:'#a03ed0'}};
   const sample = canvas => {
    const output=canvas.getContext('2d');
    return [[3,3],[30,30]].map(([x,y])=>[...output.getImageData(x,y,1,1).data]);
   };
   return {caplock:sample(new BackgroundSurface().draw(source,key)),aspectlock:sample(new Composition().overlayFrame(source,{...key,mode:'alpha'},64))};
  });
  const expected = [[160,62,208,255],[10,119,212,255]];
  assert.deepEqual(alpha.caplock,expected);
  assert.deepEqual(alpha.aspectlock,expected);
  assert.deepEqual(errors,[]);
  console.log('AspectLock Keep, Replace and Transparent verified in the phone preview, saved edit and decoded WebM.');
  await page.goto(new URL('../aspectlock/?source=device',caplockURL).href);
  await page.getByRole('button',{name:'Choose bed',exact:true}).tap();
  const audioBed = page.waitForEvent('filechooser');
  await $('pickDeviceVideo').tap();
  await (await audioBed).setFiles('/tmp/caplock-fixtures/source25.mp4');
  await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Loaded from device:'));
  await $('railToolbox').tap();
  await $('toolboxFiles').setInputFiles('/tmp/caplock-fixtures/goat-tone.mp4');
  await page.getByRole('button',{name:'Overlay goat-tone.mp4 at current frame',exact:true}).tap();
  await $('editAdded').tap();
  await $('insertionIn').fill('10');
  await $('insertionIn').press('Tab');
  await $('sheetItemStart').tap();
  await page.waitForFunction(()=>document.getElementById('position').dataset.frame==='10');
  const audio = $('insertionAudio');
  assert.equal(await audio.locator('summary').textContent(),'Audio · No sound');
  await audio.locator('summary').tap();
  await $('insertionVolume').fill('25');
  await $('insertionVolume').press('Tab');
  assert.equal(await $('ov').evaluate(video=>video.volume),0.25);
  for(const id of ['insertionFadeIn','insertionFadeOut']){
   await $(id).fill('10');
   await $(id).press('Tab');
  }
  await audio.getByRole('button',{name:'No sound',exact:true}).tap();
  assert.equal(await $('ov').evaluate(video=>video.muted),true);
  await $('closeItemProperties').tap();
  await $('aspectBedSettings').locator(':scope > summary').tap();
  await $('bedAudio').locator('summary').tap();
  await $('bedVolume').fill('35');
  await $('bedVolume').press('Tab');
  assert.equal(await $('bv').evaluate(video=>video.volume),0.35);
  await $('bedFadeIn').fill('25');
  await $('bedFadeIn').press('Tab');
  await $('bedAudio').getByRole('button',{name:'No sound',exact:true}).tap();
  assert.equal(await $('bv').evaluate(video=>video.muted),true);
  await save.tap();
  await $('save').tap();
  await page.reload();
  await save.tap();
  await $('restoreEdit').tap();
  await page.waitForFunction(()=>document.getElementById('status').textContent==='Saved edit restored.');
  const recipe=JSON.parse(await $('spec').textContent());
  assert.equal(recipe.audio.bed.fadeIn,1);
  assert.equal(recipe.audio.bed.previousVolume,.35);
  await $('editAdded').tap();
  await audio.locator('summary').tap();
  assert.equal(await $('insertionVolume').inputValue(),'0');
  await audio.getByRole('button',{name:'Sound on',exact:true}).tap();
  assert.equal(await $('insertionVolume').inputValue(),'25');
  assert.equal(await $('insertionFadeIn').inputValue(),'10');
  assert.equal(await $('insertionFadeOut').inputValue(),'10');
  await $('closeItemProperties').tap();
  await $('render').tap();
  await page.waitForFunction(()=>document.getElementById('resultVideo').readyState>=2,{},{timeout:30000});
  const levels = await $('resultVideo').evaluate(async video=>{
   const m = await import('../sxlock/vendor/mediabunny-1.62.1-gs1.mjs');
   const blob = await (await fetch(video.src)).blob();
   const input = new m.Input({formats:m.ALL_FORMATS, source:new m.BlobSource(blob)});
   try {
    const track = await input.getPrimaryAudioTrack();
    const peaks = [0,0,0,0,0];
    for await (const {buffer,timestamp} of new m.AudioBufferSink(track).buffers()) {
     const samples = buffer.getChannelData(0);
     for(let i=0;i<samples.length;i++){
      const t=timestamp+i/buffer.sampleRate;
      const region=t<.25?0:t>.84&&t<.96?1:t>1.6?2:t>.49&&t<.52?3:t>1.27&&t<1.3?4:-1;
      if(region>=0)peaks[region]=Math.max(peaks[region],Math.abs(samples[i]));
     }
    }
    return peaks;
   } finally {input.dispose();}
  });
  assert.ok(levels[1]>.02&&levels[1]<.05&&levels[0]<.003&&levels[2]<.003,JSON.stringify(levels));
  assert.ok(levels.slice(3).every(level=>level>levels[1]*.15&&level<levels[1]*.45),JSON.stringify(levels));
  assert.deepEqual(errors,[]);
  console.log('PASS AspectLock insertion mute, saved level, audio boundaries and WebM sound');

 } finally {await page.close();}
};
