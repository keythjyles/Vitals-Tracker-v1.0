// Shared status for the cutter and the caption import sheet.
export function captionJobStatus(job,runtime){
 const total=job?.ranges?.length||0,saved=job?.clips?.length||0,missing=Math.max(0,total-saved);
 const interrupted=job?.status==='running'&&runtime?.active===false;
 const stopped=job?.status==='failed'||interrupted;
 const running=job?.status==='running'&&!interrupted;
 let message='',button='Save clips';
 if(job?.status==='complete'){message=saved+' components saved in this project.';button='Clips saved';}
 else if(stopped){message='Stopped · '+saved+' / '+total+' clips saved. '+(job.error||'The server restarted.')+' Resume keeps completed clips and all cut marks.';button=missing?'Resume '+missing:'Finish save';}
 else if(running){
  const current=runtime?.number||Math.min(total,saved+1),frame=runtime?.frame||0,frames=runtime?.frames||0;
  message='Saving '+current+' / '+total+(runtime?.name?' · '+runtime.name:'')+(frames?' · '+frame+' / '+frames+' frames':'')+' · '+saved+' already saved.';
  button=current+'/'+total+(frames?' · '+Math.floor(frame/frames*100)+'%':'');
 }
 return {total,saved,missing,running,stopped,complete:job?.status==='complete',message,button};
}
