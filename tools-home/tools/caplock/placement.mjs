// Numbered caption placement. Navigation never inserts or changes a locked item.
export const captionNumber=c=>c.captionNumber??Number(/^(\d+)\.[^.]+$/.exec(c.ref?.name||c.name||'')?.[1]||0);
export const activeCaption=p=>p.clips.find(c=>c.id===p.captionSequence?.activeId);
export function startCaptionSequence(p,ids,{source=null,folder='',frame=0}={}){
 const order=ids.map(id=>p.clips.find(c=>c.id===id)).filter(Boolean).sort((a,b)=>captionNumber(a)-captionNumber(b));
 if(!order.length||order.some(c=>!captionNumber(c)))throw Error('Import numbered caption components, such as1.webm,2.webm.');
 if(new Set(order.map(captionNumber)).size!==order.length)throw Error('Each caption number must be unique in this batch.');
 for(const c of order)c.captionNumber=captionNumber(c);
 p.captionSequence={source,folder,clipIds:order.map(c=>c.id),activeId:order.find(c=>!c.locked)?.id||order[0].id,preparedIds:[]};
 prepare(p,p.captionSequence.activeId,frame);return activeCaption(p);
}
function prepare(p,id,frame,previous){
 const c=p.clips.find(c=>c.id===id),s=p.captionSequence;if(!c)return;
 if(!c.locked){const span=c.outFrame-c.inFrame;c.inFrame=frame;c.outFrame=frame+span;c.visible=false;
  if(!s.preparedIds.includes(id)&&previous)for(const k of ['x','y','width','rotation','opacity'])c[k]=previous[k];
 }
 if(!s.preparedIds.includes(id))s.preparedIds.push(id);
}
export function navigateCaption(p,delta,frame){
 const s=p.captionSequence;if(!s)return null;const index=s.clipIds.indexOf(s.activeId),next=index+delta;
 if(next<0||next>=s.clipIds.length)return null;const previous=activeCaption(p);s.activeId=s.clipIds[next];prepare(p,s.activeId,frame,previous);return activeCaption(p);
}
export function moveCaptionDraft(p,frame){const c=activeCaption(p);if(c&&!c.locked){const span=c.outFrame-c.inFrame;c.inFrame=frame;c.outFrame=frame+span;}return c;}
export function insertCaption(p,frame){
 const c=activeCaption(p);if(!c)throw Error('Import caption components first.');if(c.locked)return null;
 if(!Number.isInteger(frame)||frame<0)throw Error('Choose a bed frame first.');moveCaptionDraft(p,frame);c.locked=true;c.visible=true;return c;
}
