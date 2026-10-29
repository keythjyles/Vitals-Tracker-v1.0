// Production frames describe bed placement; source time remains seconds at its native rate.
export const rateOf=c=>c.playbackRate??1;
export function clipTime(c,frame,duration=Infinity){
 const rate=rateOf(c),start=c.trimInFrame/25,end=Math.min(duration,c.trimOutFrame==null?Infinity:c.trimOutFrame/25);
 const span=Math.max(0,end-start),elapsed=(frame-c.inFrame)/25*rate;
 const active=c.visible&&frame>=c.inFrame&&frame<c.outFrame;
 const exhausted=span<=0||(!c.loop&&elapsed>=span);
 const target=start+(c.loop&&Number.isFinite(span)&&span>0?Math.max(0,elapsed)%span:Math.max(0,elapsed));
 return {rate,target,end,shown:active&&!exhausted};
}
export function fitRate(c,duration=Infinity){
 const end=Math.min(duration*25,c.trimOutFrame??Infinity),span=end-c.trimInFrame;
 const rate=span/(c.outFrame-c.inFrame);
 if(!Number.isFinite(rate)||rate<.1||rate>8)throw Error('Select a source range and bed IN/OUT that fit between0.1x and8x.');
 return rate;
}
