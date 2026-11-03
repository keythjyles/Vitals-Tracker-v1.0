import {validateChroma} from './background.mjs?v=20';
export function isToolboxEntry(search,studio=false){const params=new URLSearchParams(search);return !studio&&!['project','cuts','assetPath'].some(key=>params.has(key))&&params.get('new')!=='cloud-video'&&params.get('legacy')!=='1';}
const refKey=r=>JSON.stringify([r.kind,r.path||'',r.name,r.size]);
export function validateToolboxAsset(a){
 if(!a||typeof a.id!=='string'||!a.id||!['video','image','audio'].includes(a.type)||!a.ref||!['local','previewlock'].includes(a.ref.kind))throw Error('Invalid toolbox file');
 if(a.frames!=null&&(!Number.isSafeInteger(a.frames)||a.frames<1))throw Error('Invalid source frame count');
 if(a.duration!=null&&(!Number.isFinite(a.duration)||a.duration<=0))throw Error('Invalid source duration');
 if(a.sha256!=null&&!/^[a-f0-9]{64}$/.test(a.sha256))throw Error('Invalid file fingerprint');
 return {id:a.id,name:String(a.name||a.ref.name||'File'),type:a.type,ref:{kind:a.ref.kind,name:String(a.ref.name||''),path:String(a.ref.path||''),size:Number(a.ref.size)||0},frames:a.frames??null,duration:a.duration??null,...(a.sha256?{sha256:a.sha256}:{}),...(a.chroma?{chroma:validateChroma(a.chroma)}:{})};
}
export function ensureToolbox(p){
 p.toolbox||=[];
 for(const c of p.clips){
  if(c.toolboxId&&p.toolbox.some(a=>a.id===c.toolboxId))continue;
  let a=p.toolbox.find(a=>refKey(a.ref)===refKey(c.ref));
  if(!a){a=validateToolboxAsset({id:'file-'+c.id,name:c.ref.name||c.name,type:c.type,ref:c.ref,frames:c.sourceFrames??(c.type==='image'?1:null),duration:c.sourceDuration??null,chroma:c.chroma});p.toolbox.push(a);}
  c.toolboxId=a.id;
 }
 return p.toolbox;
}
export function packetDuration(times,end){
 if(times.length<2)return end;
 const deltas=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b),step=deltas[Math.floor(deltas.length/2)];
 return step>0&&times.every((t,i)=>Math.abs(t-times[0]-i*step)<.0002)?times.length*step:end;
}
export function makeToolboxPlacement(asset,frame,id,previous){
 if(!Number.isInteger(frame)||frame<0)throw Error('Choose an insertion frame.');
 const duration=asset.duration||(asset.type==='image'?2:0);if(!duration)throw Error('Reconnect this file to read its clip length.');
 const span=Math.max(1,Math.ceil(duration*25-1e-6));
 return {id,toolboxId:asset.id,name:asset.name,phraseId:'',type:asset.type,ref:{...asset.ref},inFrame:frame,outFrame:frame+span,trimInFrame:0,trimOutFrame:asset.type==='image'?null:span,playbackRate:1,x:previous?.x??50,y:previous?.y??75,width:previous?.width??90,rotation:previous?.rotation??0,opacity:previous?.opacity??1,volume:asset.type==='audio'?1:0,visible:true,placed:true,locked:false,loop:false,...(asset.frames?{sourceFrames:asset.frames}:{}),...(asset.type!=='image'?{sourceDuration:duration}:{}),...(asset.chroma?{chroma:{...asset.chroma}}:{})};
}
export function shiftPlacementIn(c,value){
 if(!Number.isInteger(value)||value<0)throw Error('IN must be a nonnegative frame.');
 const span=c.outFrame-c.inFrame;c.inFrame=value;c.outFrame=value+span;return c;
}
export function fitPlacementOut(c,value,duration=c.sourceDuration){
 if(!Number.isInteger(value)||value<=c.inFrame)throw Error('OUT must follow IN.');
 if(c.type==='image'){c.outFrame=value;return c;}
 const end=Math.min(duration??Infinity,c.trimOutFrame==null?Infinity:c.trimOutFrame/25),source=end-c.trimInFrame/25,rate=source*25/(value-c.inFrame);
 if(!Number.isFinite(rate)||rate<.1||rate>8)throw Error('Choose an OUT that fits the complete clip at 0.1× to 8×.');
 c.outFrame=value;c.playbackRate=rate;if(duration)c.sourceDuration=duration;return c;
}
export function setPlacementSpeed(c,rate,duration=c.sourceDuration){
 if(!Number.isFinite(rate)||rate<.1||rate>8)throw Error('Speed must be 0.1× to 8×.');
 const end=Math.min(duration??Infinity,c.trimOutFrame==null?Infinity:c.trimOutFrame/25),span=end-c.trimInFrame/25;
 if(!Number.isFinite(span)||span<=0)throw Error('Reconnect this file to read its clip length.');
 c.playbackRate=rate;c.outFrame=c.inFrame+Math.max(1,Math.ceil(span*25/rate-1e-6));return c;
}
export function assetFrameLabel(a){return a?.frames?(a.type==='image'?'1 still frame':`${a.frames} source frames · ${(a.frames/a.duration).toFixed(2).replace(/\.00$/,'')} fps · ${a.duration.toFixed(3)}s`):'Reconnect to read source frames';}
