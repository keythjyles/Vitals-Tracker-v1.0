import {frameAt,frameSeekTime,selection} from '../cliplock/core.mjs?v=4';
import {inspect} from '../cliplock/engine.mjs?v=3';
import {clipRange} from './clip-time.mjs?v=28';

const $=id=>document.getElementById(id);

export function createTrimDialog(apply){
 const dialog=$('trimDialog'),video=$('trimVideo');
 let session=null;
 const boundary=n=>session.timing.times[n]??session.timing.end;
 function range(){
  const {times,end}=session.timing;
  return selection(times,end,$('trimIn').valueAsNumber,$('trimOut').valueAsNumber);
 }
 function update(){
  if(!session?.timing)return;
  const {timing,cursor}=session,total=timing.times.length;
  $('trimPosition').textContent=`F${cursor} / ${total} · ${boundary(cursor).toFixed(3)} s`;
  $('trimPlay').textContent=video.paused?'▶':'Ⅱ';
  $('trimBar').style.setProperty('--cursor',boundary(cursor)/timing.end*100+'%');
  try{
   const cut=range();
   $('trimBar').style.setProperty('--in',cut.start/timing.end*100+'%');
   $('trimBar').style.setProperty('--out',cut.end/timing.end*100+'%');
   $('trimSummary').textContent=`Keep ${cut.frames} frames · ${(cut.end-cut.start).toFixed(3)} s`;
   $('trimApply').disabled=video.readyState<1;
  }catch{
   $('trimBar').style.removeProperty('--in');
   $('trimBar').style.removeProperty('--out');
   $('trimSummary').textContent='Mark In before Out.';
   $('trimApply').disabled=true;
  }
 }
 function seek(n){
  if(!session?.timing||!Number.isSafeInteger(n)||n<0||n>session.timing.times.length)return false;
  video.pause();
  session.cursor=n;
  const frame=Math.min(n,session.timing.times.length-1);
  video.currentTime=Math.min(video.duration,frameSeekTime(session.timing,frame));
  $('trimGoFrame').value=n;
  update();
  return true;
 }
 function syncCursor(){
  if(!video.paused)session.cursor=frameAt(session.timing.times,video.currentTime);
 }
 function dispose(){
  session=null;
  video.pause();
  video.removeAttribute('src');
  video.load();
 }
 dialog.addEventListener('close',()=>{if(!dialog.open)dispose();});
 $('trimCancel').onclick=()=>dialog.close();
 for(const button of dialog.querySelectorAll('[data-trim-step]')){
  button.onclick=()=>{
   if(!session?.timing)return;
   syncCursor();
   seek(Math.max(0,Math.min(session.timing.times.length,session.cursor+Number(button.dataset.trimStep))));
  };
 }
 $('trimGo').onsubmit=event=>{
  event.preventDefault();
  if(!seek($('trimGoFrame').valueAsNumber))$('trimGoFrame').reportValidity();
 };
 for(const [button,input] of [['trimMarkIn','trimIn'],['trimMarkOut','trimOut']]){
  $(button).onclick=()=>{
   syncCursor();
   video.pause();
   $(input).value=session.cursor;
   update();
  };
  $(input).oninput=update;
 }
 $('trimPlay').onclick=async()=>{
  if(!video.paused){syncCursor();video.pause();update();return;}
  if(session.cursor>=session.timing.times.length)seek(0);
  try{await video.play();}catch(e){$('trimMessage').textContent=e.message;}
 };
 for(const event of ['timeupdate','play','pause','ended'])video.addEventListener(event,()=>{
  if(!session?.timing)return;
  const {times,end}=session.timing;
  if(video.ended||video.currentTime>=end){session.cursor=times.length;video.pause();}
  else if(!video.paused)session.cursor=frameAt(times,video.currentTime);
  $('trimGoFrame').value=session.cursor;
  update();
 });
 $('trimApply').onclick=()=>{
  if(!session?.timing)return;
  try{
   const {clip,timing}=session,{inFrame,outFrame,start,end}=range();
   if(apply(clip,{inFrame,outFrame,start,end},timing))dialog.close();
   else $('trimMessage').textContent='The placement changed. Reopen Trim to try again.';
  }catch(e){$('trimMessage').textContent=e.message;}
 };

 return {
  close(){if(dialog.open){dialog.close();dispose();}},
  async open(clip,media){
   dispose();
   const editing={clip,timing:null,cursor:0};
   session=editing;
   $('trimTitle').textContent='Trim · '+clip.name;
   $('trimMessage').textContent='Reading source frames…';
   $('trimPosition').textContent='';
   $('trimSummary').textContent='';
   $('trimBar').removeAttribute('style');
   $('trimControls').disabled=true;
   $('trimApply').disabled=true;
   $('trimIn').value=$('trimOut').value=$('trimGoFrame').value='';
   if(!dialog.open)dialog.showModal();
   try{
    const loaded=new Promise((resolve,reject)=>{
     video.onloadeddata=resolve;
     video.onerror=()=>reject(Error('This video could not open for trimming.'));
    });
    video.src=media.url;
    const [timing]=await Promise.all([media.trimTiming??=inspect(media.blob).catch(e=>{delete media.trimTiming;throw e;}),loaded]);
    if(session!==editing||!dialog.open)return;
    editing.timing=timing;
    const {times,end}=timing,original=clipRange(clip,end),first=frameAt(times,original.start);
    let last=frameAt(times,original.end);
    if(times[last]<original.end-1e-7)last++;
    $('trimIn').max=times.length-1;
    $('trimOut').max=$('trimGoFrame').max=times.length;
    $('trimIn').value=clip.sourceTrim?.inFrame??first;
    $('trimOut').value=clip.sourceTrim?.outFrame??Math.max(first+1,last);
    $('trimMessage').textContent='Out is the first frame after the cut.';
    $('trimControls').disabled=false;
    seek(Number($('trimIn').value));
   }catch(e){if(session===editing)$('trimMessage').textContent=e.message;}
  }
 };
}
