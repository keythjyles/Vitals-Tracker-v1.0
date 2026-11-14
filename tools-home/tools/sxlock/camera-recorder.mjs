export function setupCameraRecorder({video,clock,sourceEnd,ready,play,finish,stopBed,changed}) {
 const $=id=>document.getElementById(id);
 const sheet=$('cameraSheet'), preview=$('cameraPreview'), begin=$('cameraStart'), stop=$('cameraStop'), status=$('cameraStatus');
 const bed=document.createElement('video'), camera=document.createElement('video');
 for(const picture of [bed,camera]){picture.muted=true;picture.playsInline=true;preview.append(picture);}
 camera.autoplay=true;
 let stream, recorder, starting=false, finalizing=false, sequence=0,timer;

 function closeStream(){
  sequence++;
  clearTimeout(timer);
  stream?.getTracks().forEach(track=>track.stop());
  stream=null;
  camera.srcObject=null;
  bed.removeAttribute('src');
  bed.load();
  begin.disabled=true;
  stop.disabled=true;
 }
 function stopRecording(){
  if(recorder?.state==='recording')recorder.stop();
 }
 async function open(){
  if(sheet.open)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Camera capture requires HTTPS and a supported browser.');
  if(!ready())throw Error('Load a video and choose a frame before its end.');
  status.textContent='Allow camera access.';
  sheet.showModal();
  const attempt=++sequence;
  try{
   const input=await navigator.mediaDevices.getUserMedia({
    video:{facingMode:{ideal:'user'},width:{ideal:720},height:{ideal:1280}},audio:false,
   });
   if(attempt!==sequence||!sheet.open){input.getTracks().forEach(track=>track.stop());return;}
   stream=input;
   camera.srcObject=stream;
   bed.src=video.src;
   bed.addEventListener('loadedmetadata',()=>{bed.currentTime=clock();},{once:true});
   await camera.play();
   begin.disabled=false;
   status.textContent='Ready to record a muted video layer.';
  }catch(error){
   closeStream();
   status.textContent=error.name==='NotAllowedError'?'Camera permission was declined.':error.message;
  }
 }
 begin.onclick=()=>{
  if(!stream||starting||finalizing||recorder?.state==='recording')return;
  starting=true;
  begin.disabled=true;
  const start=clock(),time=new Date().toISOString(),chunks=[];
  let bytes=0;
  try{
   const mimeType=['video/webm;codecs=vp8','video/mp4','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
   recorder=new MediaRecorder(stream,mimeType?{mimeType,videoBitsPerSecond:2800000}:undefined);
   recorder.ondataavailable=event=>{
    if(event.data.size){chunks.push(event.data);bytes+=event.data.size;if(bytes>64*1024*1024)stopRecording();}
   };
   recorder.onerror=event=>{status.textContent=event.error?.message||'Camera recording interrupted.';stopRecording();};
   recorder.onstart=()=>{
    starting=false;
    stop.disabled=false;
    changed(true);
    status.textContent='Recording camera overlay…';
    play().catch(error=>{status.textContent=error.message;stopRecording();});
    bed.currentTime=start;
    bed.play().catch(()=>{});
    timer=setTimeout(stopRecording,Math.min(90000,Math.max(150,(sourceEnd()-start)*1000)));
   };
   recorder.onstop=async()=>{
    finalizing=true;
    stop.disabled=true;
    status.textContent='Saving camera recording…';
    stopBed();
    const result=new Blob(chunks,{type:recorder.mimeType||'video/webm'});
    closeStream();
    try{if(result.size)await finish(result,start,time);else throw Error('No camera video was recorded.');}
    catch(error){status.textContent=error.message;return;}
    finally{recorder=null;finalizing=false;changed(false);}
    sheet.close();
   };
   recorder.start(500);
  }catch(error){starting=false;changed(false);status.textContent=error.message;closeStream();}
 };
 stop.onclick=stopRecording;
 function closeWhileRecording(event){
  if(!starting&&!finalizing&&recorder?.state!=='recording')return;
  event.preventDefault();
  if(!starting)stopRecording();
 }
 sheet.addEventListener('cancel',closeWhileRecording);
 sheet.querySelector('form').addEventListener('submit',closeWhileRecording);
 sheet.addEventListener('close',closeStream);
 for(const name of ['pause','ended'])video.addEventListener(name,stopRecording);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&sheet.open){if(recorder?.state==='recording')stopRecording();else if(!starting&&!finalizing)sheet.close();}
 });
 return {open};
}
