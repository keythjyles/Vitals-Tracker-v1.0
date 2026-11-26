const iframe=document.getElementById('app'),results=document.getElementById('results'),rows=[];
const wait=async(fn,limit=15000)=>{const at=performance.now();while(!fn()){if(performance.now()-at>limit)throw Error('Timed out: '+fn);await new Promise(r=>setTimeout(r,25));}};
const assert=(ok,text)=>{if(!ok)throw Error(text);},near=(a,b)=>Math.abs(a-b)<.001;
const log=(name,data={})=>{rows.push({name,pass:true,...data});results.textContent=JSON.stringify({status:'running',checks:rows},null,2);};
document.getElementById('run').onclick=async()=>{
 rows.length=0;document.getElementById('run').disabled=true;
 try{
  await wait(()=>iframe.contentWindow.SxLock);const w=iframe.contentWindow,d=w.document,$=id=>d.getElementById(id),app=w.SxLock;
  await app.ready;
  const clean=app.snapshot();app.restore({...clean,clips:[],video:null,videoRef:null,playheadSeconds:0,toolbox:{sounds:[],files:[],visual:[]},recordings:[]});
  const change=async(id,value)=>{const el=$(id);el.value=String(value);el.dispatchEvent(new w.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,30));};
  const upload=async(id,file)=>{const dt=new w.DataTransfer();dt.items.add(file);$(id).files=dt.files;$(id).dispatchEvent(new w.Event('change',{bubbles:true}));};
  const blob=await(await fetch(new URLSearchParams(location.search).get('source')||'/camlock-fixture.mp4')).blob();
  await upload('videoFile',new w.File([blob],'Insertion_Bed.mp4',{type:'video/mp4'}));await wait(()=>$('video').readyState>=2&&near(app.duration(),4));
  const ac=await app.audioContext(),tone=ac.createBuffer(1,4*48000,48000);for(let i=0;i<tone.length;i++)tone.getChannelData(0)[i]=.1*Math.sin(2*Math.PI*440*i/48000);
  const soundName='Long_Reusable_Music_Source_For_Compact_Labels_'+Date.now()+'.wav';
  await upload('toolboxFiles',new w.File([app.wav(tone)],soundName,{type:'audio/wav'}));
  await wait(()=>[...app.sounds.values()].some(s=>s.name===soundName));const id=[...app.sounds.values()].find(s=>s.name===soundName).id;await wait(()=>$('toolboxStatus').textContent.includes('Tap Place here'));
  $('openToolbox').click();await wait(()=>$('toolboxSheet').open);
  await wait(()=>$('toolboxItems').querySelector('.sx-sound-name'));const label=$('toolboxItems').querySelector('.sx-sound-name');assert(parseFloat(w.getComputedStyle(label).fontSize)<=13,'Toolbox filename is oversized');
  const preview=()=>$('toolboxItems').querySelector('[data-toolbox-preview="'+id+'"]');preview().click();await wait(()=>preview()?.textContent.includes('Pause'));preview().click();await wait(()=>preview()?.textContent.includes('Play'));
  assert(app.diagnostics().auditions===0,'Pause did not stop preview');log('Compact Toolbox labels and real preview Play/Pause');
  $('toolboxSheet').close();app.openSheet(id);await wait(()=>!$('sheetEditor').hidden);
  await change('effectInFrame',20);await change('effectOffset',.4);await change('effectSourceEnd',2.4);await change('effectRate',2);
  assert(Number($('effectInFrame').value)===20&&Number($('effectOutFrame').value)===45,'Speed did not update OUT');
  await change('effectOutMode','fit');await change('effectOutFrame',70);assert(near(Number($('effectRate').value),1),'Fit did not set rate');
  await change('effectOutMode','trim');await change('effectOutFrame',45);assert(near(Number($('effectSourceEnd').value),1.4),'Trim did not shorten selected source');
  await change('effectRate',2);assert(near(Number($('effectDuration').value),.5),'Trim speed duration mismatch');
  $('hearSelected').click();await wait(()=>$('hearSelected').textContent.includes('Pause'));$('hearSelected').click();await wait(()=>app.diagnostics().auditions===0);
  $('applyEffect').click();await wait(()=>!$('effectSheet').open);
  const clip=app.snapshot().clips.find(c=>c.soundId===id);assert(near(clip.start,.8)&&near(clip.duration,.5)&&clip.rate===2&&near(clip.sourceEnd,1.4),'Saved timing differs');
  log('Audio insertion IN/OUT, trim, fit, speed and selected-range audition',{clip});
  $('openToolbox').click();await wait(()=>$('toolboxSheet').open);
  const edit=[...$('visualPlacements').querySelectorAll('button')].find(b=>b.textContent==='Edit insertion');assert(edit,'Inserted audio has no settings entry');edit.click();await wait(()=>!$('sheetEditor').hidden);
  assert(Number($('effectInFrame').value)===20&&Number($('effectOutFrame').value)===33&&Number($('effectRate').value)===2,'Reopened settings lost precision');
  const before=JSON.stringify(app.snapshot().clips);$('sheetForward').click();await new Promise(r=>setTimeout(r,50));assert(JSON.stringify(app.snapshot().clips)===before,'Frame navigation changed insertion');
  const panel=$('effectSheet'),handle=panel.querySelector('.sheet-head'),r=panel.getBoundingClientRect();
  for(const [type,y]of [['pointerdown',r.top+10],['pointermove',r.top-80],['pointerup',r.top-80]])handle.dispatchEvent(new w.PointerEvent(type,{pointerId:88,pointerType:'touch',button:0,clientX:r.left+100,clientY:y,bubbles:true}));
  assert(panel.getBoundingClientRect().top<r.top-20,'Effect panel did not move');panel.close();
  log('Inserted audio reopens directly; navigation preserves timing; panel drags');
  // Compare the actual production rate mapper with measured PCM, including a later chunk.
  const rateClip={...clip,start:.2,offset:.1,sourceEnd:3.1,duration:1.5,rate:2,volume:100};
  const context=new w.OfflineAudioContext(1,2*48000,48000);app.placeSource(context,rateClip,tone,context.destination,0,0,2);
  const pcm=(await context.startRendering()).getChannelData(0),segment=pcm.slice(.3*48000,.4*48000);let crossings=0;for(let i=1;i<segment.length;i++)if(segment[i-1]<=0&&segment[i]>0)crossings++;
  assert(Math.abs(crossings-88)<=1,'Item rate was not used by the audio engine');assert(pcm.slice(0,.19*48000).every(v=>Math.abs(v)<1e-8),'Insertion began before IN');
  log('Production audio engine renders the saved 2× speed with exact start silence',{cyclesIn100ms:crossings});
  await upload('toolboxFiles',new w.File([blob],'Insertion_Clip.mp4',{type:'video/mp4'}));$('openToolbox').click();await wait(()=>$('toolboxSheet').open);
  const place=[...$('toolboxItems').querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Overlay Insertion_Clip.mp4');assert(place,'No visual placement');place.click();
  await wait(()=>app.snapshot().toolbox.visual.length===1);$('toolboxSheet').close();$('openToolbox').click();
  const visualEdit=[...$('visualPlacements').querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Edit insertion Insertion_Clip.mp4');visualEdit.click();await wait(()=>$('visualSettings').open);
  await change('visualIn',10);await change('visualSourceIn',.5);await change('visualSourceOut',2.5);await change('visualRate',2);
  const visual=app.snapshot().toolbox.visual[0];assert(near(visual.start,.4)&&near(visual.sourceOffset,.5)&&near(visual.sourceDuration,2)&&near(visual.duration,1),'Visual trim/rate not saved');
  await change('visualOut',60);assert(near(Number($('visualRate').value),1),'Visual fit did not change speed');$('visualClose').click();
  const saved=app.snapshot(true);assert(saved.clips.find(c=>c.soundId===id).rate===2,'Snapshot lost audio rate');
  await upload('loadProject',new w.File([JSON.stringify(saved)],'Insertion_Recovery.json',{type:'application/json'}));await wait(()=>$('status').textContent.includes('restored'));
  const recovered=app.snapshot();assert(near(recovered.clips.find(c=>c.soundId===id).sourceEnd,1.4)&&recovered.clips.find(c=>c.soundId===id).rate===2&&near(recovered.toolbox.visual[0].sourceOffset,.5),'Project recovery lost trim or speed');
  log('Video insertion source trim, speed, fitted OUT and portable-project recovery');
  // Export through the shipped buttons, then inspect the actual downloaded bytes.
  $('bed').value=0;$('bed').dispatchEvent(new w.Event('input',{bubbles:true}));$('bed').dispatchEvent(new w.Event('change',{bubbles:true}));
  $('fps').value=25;$('format').value='video/mp4';$('exportVideo').click();
  await wait(()=>!$('result').hidden&&!app.diagnostics().exportBusy,60000);
  let exportedURL;const click=w.HTMLAnchorElement.prototype.click;
  w.HTMLAnchorElement.prototype.click=function(){if(this.download)exportedURL=this.href;else click.call(this);};
  try{$('download').click();}finally{w.HTMLAnchorElement.prototype.click=click;}
  assert(exportedURL,'Export did not provide downloadable video');
  const outputBlob=await(await fetch(exportedURL)).blob();
  const {Input,ALL_FORMATS,BlobSource,CanvasSink,AudioBufferSink}=await import('../vendor/mediabunny-1.62.1-gs1.mjs');
  const input=new Input({source:new BlobSource(outputBlob),formats:ALL_FORMATS});
  const track=await input.getPrimaryVideoTrack(),audio=await input.getPrimaryAudioTrack();assert(audio,'Export lost enabled insertion audio');
  assert(near(await track.computeDuration(),4),'Export changed bed duration');
  const values=[];for await(const chunk of new AudioBufferSink(audio).buffers()){const samples=chunk.buffer.getChannelData(0);for(let i=0;i<samples.length;i++)values.push([chunk.timestamp+i/chunk.buffer.sampleRate,samples[i]]);}
  const rms=(a,b)=>{const samples=values.filter(([t])=>t>=a&&t<b);return Math.sqrt(samples.reduce((sum,[,v])=>sum+v*v,0)/samples.length);};
  const audible=values.filter(([t])=>t>=.9&&t<1);let cycles=0;for(let i=1;i<audible.length;i++)if(audible[i-1][1]<=0&&audible[i][1]>0)cycles++;
  assert(Math.abs(cycles-88)<=1&&rms(.5,.6)<.001&&rms(1.5,1.6)<.001,'Export did not retain item speed and source trim');
  const sourceInput=new Input({source:new BlobSource(blob),formats:ALL_FORMATS}),sourceTrack=await sourceInput.getPrimaryVideoTrack();
  const canvas=document.createElement('canvas');canvas.width=180;canvas.height=320;const g=canvas.getContext('2d');
  const bed=(await new CanvasSink(sourceTrack).getCanvas(1)).canvas,overlay=(await new CanvasSink(sourceTrack).getCanvas(1.1)).canvas;
  g.drawImage(bed,0,0,180,320);g.globalAlpha=.5;g.drawImage(overlay,0,0,180,320);g.globalAlpha=1;
  const expected=g.getImageData(0,0,180,320).data;g.drawImage((await new CanvasSink(track).getCanvas(1)).canvas,0,0,180,320);const actual=g.getImageData(0,0,180,320).data;
  let error=0;for(let i=0;i<actual.length;i+=4)for(let c=0;c<3;c++)error+=Math.abs(actual[i+c]-expected[i+c]);error/=180*320*3;
  assert(error<6,'Rendered visual source trim differs from preview');sourceInput.dispose();input.dispose();
  log('Actual MP4 export preserves audio speed, trim boundaries and visual source offset',{cyclesIn100ms:cycles,pixelMeanError:error,bytes:outputBlob.size});

  for(const width of [320,390,430]){iframe.style.width=width+'px';$('openToolbox').click();await wait(()=>$('toolboxSheet').open);assert(d.documentElement.scrollWidth<=w.innerWidth+1,'Horizontal overflow at '+width);$('toolboxSheet').close();}
  log('Toolbox fits phone widths 320, 390 and 430');
  results.textContent=JSON.stringify({status:'passed',checks:rows},null,2);
 }catch(error){results.textContent=JSON.stringify({status:'failed',checks:rows,error:error.stack},null,2);console.error(error);}
 finally{document.getElementById('run').disabled=false;}
};
