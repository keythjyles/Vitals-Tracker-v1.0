import {selection,clipName} from './core.mjs?v=1';
export function addOrUpdate(cuts,range,{id,name}={}){
 const index=id?cuts.findIndex(c=>c.id===id):-1;
 const cut={...range,id:id||crypto.randomUUID(),name:String(name||index+1||cuts.length+1)};
 if(index<0)return [...cuts,cut];
 return cuts.map((c,i)=>i===index?cut:{...c});
}
export function toBatchRanges(meta,cuts){
 if(!cuts.length||cuts.length>40)throw Error('Add1–40 cuts.');
 const names=new Set();return cuts.map((c,i)=>{
  const r=selection(meta.times,meta.end,c.inFrame,c.outFrame),frames=Math.max(1,Math.round((r.end-r.start)*25));
  if(r.end>60.001||r.end-r.start>30.001)throw Error('Batch limit:60s source,30s per cut.');
  const name=clipName(c.name||String(i+1),'webm');if(names.has(name.toLowerCase()))throw Error('Give each cut a different name.');names.add(name.toLowerCase());
  const first=Math.round(r.start*25);return {inFrame:first,outFrame:first+frames,sourceStart:r.start,sourceEnd:r.end,sourceInFrame:c.inFrame,sourceOutFrame:c.outFrame,name};
 });
}
export function nextMarks(out,total){return {inFrame:Math.min(out,total-1),outFrame:total};}

// Finished-video cuts use native timestamps and audio; caption renderer limits do not apply.
export function toVideoRanges(meta,cuts,format){
 if(!cuts.length||cuts.length>40)throw Error('Add1–40 cuts.');
 if(!['mp4','webm'].includes(format))throw Error('Choose MP4 or WebM.');
 const names=new Set();return cuts.map((c,i)=>{const r=selection(meta.times,meta.end,c.inFrame,c.outFrame),name=clipName(c.name||String(i+1),format);if(names.has(name.toLowerCase()))throw Error('Give each cut a different name.');names.add(name.toLowerCase());return {...r,name,id:c.id};});
}
