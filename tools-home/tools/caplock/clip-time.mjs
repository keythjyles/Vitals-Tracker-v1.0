// Production frames describe bed placement; source time remains seconds at its native rate.
export const rateOf=c=>c.playbackRate??1;
export function clipRange(c,duration=Infinity){
 const start=c.sourceTrim?.start??c.trimInFrame/25;
 const end=c.sourceTrim?Math.min(c.sourceTrim.end,duration)
  :Math.min(duration,c.sourceDuration??Infinity,c.trimOutFrame==null?Infinity:c.trimOutFrame/25);
 return {start,end};
}
export function clipTime(c,frame,duration=Infinity){
 const rate=rateOf(c),{start,end}=clipRange(c,duration);
 const span=Math.max(0,end-start),elapsed=(frame-c.inFrame)/25*rate;
 const active=c.visible&&frame>=c.inFrame&&frame<c.outFrame;
 const exhausted=span<=0||(!c.loop&&elapsed>=span);
 const target=start+(c.loop&&Number.isFinite(span)&&span>0?Math.max(0,elapsed)%span:Math.max(0,elapsed));
 return {rate,target,start,end,shown:active&&!exhausted};
}
export function pictureTime(c,frame,duration){
 const time=clipTime(c,frame,duration);
 if(!time.shown&&c.visible&&c.holdLastFrame&&frame>=c.outFrame){
  return {...time,target:Math.max(time.start,time.end-.000002),shown:true,held:true};
 }
 return time;
}
export function fitRate(c,duration=Infinity){
 const {start,end}=clipRange(c,duration),rate=(end-start)*25/(c.outFrame-c.inFrame);
 if(!Number.isFinite(rate)||rate<.1||rate>8)throw Error('Select a source range and bed IN/OUT that fit between0.1x and8x.');
 return rate;
}
