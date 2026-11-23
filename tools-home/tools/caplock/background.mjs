// AspectLock's per-frame scratch-canvas approach, shared by CapLock preview/export.
// The original pixels/bytes remain the source for all background treatments.
export const DEFAULT_CHROMA=Object.freeze({enabled:true,color:'#0a77d4',similarity:.18,blend:.04});
export const DEFAULT_REPLACEMENT_COLOR='#000000';
export function validateChroma(raw){
 if(!raw||typeof raw.enabled!=='boolean'||!/^#[0-9a-f]{6}$/i.test(raw.color)||!Number.isFinite(raw.similarity)||raw.similarity<.01||raw.similarity>.5||!Number.isFinite(raw.blend)||raw.blend<0||raw.blend>.2)throw Error('Invalid caption background settings');
 const checked = {enabled:raw.enabled,color:raw.color.toLowerCase(),similarity:raw.similarity,blend:raw.blend};
 if(raw.backgroundOpacity!==undefined){
  if(!Number.isFinite(raw.backgroundOpacity)||raw.backgroundOpacity<0||raw.backgroundOpacity>1)throw Error('Invalid background opacity');
  checked.backgroundOpacity=raw.backgroundOpacity;
 }
 if(raw.sourceAlpha!==undefined&&typeof raw.sourceAlpha!=='boolean')throw Error('Invalid source transparency setting');
 if(raw.sourceAlpha)checked.sourceAlpha=true;
 if(raw.replacement!==undefined){
  const {enabled,color}=raw.replacement||{};
  if(typeof enabled!=='boolean'||!/^#[0-9a-f]{6}$/i.test(color))throw Error('Invalid replacement background');
  checked.replacement={enabled,color:color.toLowerCase()};
 }
 return checked;
}
const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),distance=(r,g,b)=>Math.sqrt(r*r+g*g+b*b)/441.6729559300637;
export function removeBackground(pixels,key){
 if(!key?.enabled||key.backgroundOpacity===1)return pixels;
 const [kr,kg,kb]=rgb(key.color),softness=key.blend,bg=key.backgroundOpacity??0;
 for(let i=0;i<pixels.length;i+=4){
  if(!pixels[i+3])continue;
  const d=distance(pixels[i]-kr,pixels[i+1]-kg,pixels[i+2]-kb),alpha=softness?Math.max(0,Math.min(1,(d-key.similarity)/softness)):Number(d>key.similarity);
  pixels[i+3]=Math.round(pixels[i+3]*(bg+(1-bg)*alpha));
 }
 return pixels;
}
export function inferBackground(pixels,width,height,{includeAlpha=false}={}){
 const samples=[];let transparent=0;
 for(const [x,y] of [[.02,.02],[.05,.02],[.95,.02],[.98,.02],[.02,.05],[.98,.05],[.02,.95],[.98,.95],[.02,.98],[.05,.98],[.95,.98],[.98,.98]]){
  const i=(Math.min(height-1,Math.floor(y*height))*width+Math.min(width-1,Math.floor(x*width)))*4;
  if(pixels[i+3]<250)transparent++;else samples.push([pixels[i],pixels[i+1],pixels[i+2]]);
 }
 // Genuine alpha sources remain alpha, including partially transparent edges.
 if(transparent)return includeAlpha?{...DEFAULT_CHROMA,sourceAlpha:true}:null;
 if(!samples.length)return null;
 const median=[0,1,2].map(k=>samples.map(p=>p[k]).sort((a,b)=>a-b)[Math.floor(samples.length/2)]);
 if(samples.filter(p=>distance(...p.map((v,k)=>v-median[k]))<.045).length<samples.length*.9)return null;
 return {...DEFAULT_CHROMA,color:'#'+median.map(v=>v.toString(16).padStart(2,'0')).join('')};
}
// Only used after an explicit background command. A screen inside a filmed
// scene does not reach the frame's edges, unlike a caption's solid backdrop.
export function inferChromaScreen(pixels,width,height){
 const bins=new Map();
 for(let i=0;i<pixels.length;i+=4){
  const [r,g,b,a]=pixels.subarray(i,i+4);
  if(a<250||!((g>=140&&g>2*r+24&&g>2*b+24)||(b>=140&&b>2*r+24&&b>1.5*g+24)))continue;
  const bin=(r>>5)*64+(g>>5)*8+(b>>5),group=bins.get(bin)||[];
  group.push(i/4);bins.set(bin,group);
 }
 const minimum=Math.max(16,Math.ceil(width*height*.015));
 let best=null;
 for(const group of bins.values()){
  if(group.length<minimum)continue;
  const members=new Set(group);let largest=[];
  while(members.size){
   const queue=[members.values().next().value];members.delete(queue[0]);
   for(let n=0;n<queue.length;n++){
    const at=queue[n],x=at%width,y=Math.floor(at/width);
    for(const next of [x>0?at-1:-1,x<width-1?at+1:-1,y>0?at-width:-1,y<height-1?at+width:-1]){
     if(members.delete(next))queue.push(next);
    }
   }
   if(queue.length>largest.length)largest=queue;
  }
  if(largest.length<minimum||best&&largest.length<=best.length)continue;
  best=largest;
 }
 if(!best)return null;
 const median=[0,1,2].map(channel=>best.map(at=>pixels[at*4+channel]).sort((a,b)=>a-b)[Math.floor(best.length/2)]);
 return {...DEFAULT_CHROMA,color:'#'+median.map(v=>v.toString(16).padStart(2,'0')).join(''),similarity:.1};
}
export function detectBackground(source,options){
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,64,64);ctx.drawImage(source,0,0,64,64);
 const pixels=ctx.getImageData(0,0,64,64).data;
 const border=inferBackground(pixels,64,64,options);
 if(border?.sourceAlpha)return border;
 return (options?.includeScreens?inferChromaScreen(pixels,64,64):null)||border;
}
export function fillReplacement(ctx,key){
 if(!key.replacement?.enabled)return;
 ctx.save();
 ctx.globalCompositeOperation='destination-over';
 ctx.globalAlpha=key.backgroundOpacity??1;
 ctx.fillStyle=key.replacement.color;
 ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
 ctx.restore();
}
export class BackgroundSurface{
 constructor(canvas=document.createElement('canvas')){this.canvas=canvas;this.ctx=canvas.getContext('2d',{willReadFrequently:true});}
 draw(source,key,{maxWidth=Infinity}={}){
  if(!key?.enabled)return source;
  const sourceWidth=source.videoWidth||source.naturalWidth||source.width,sourceHeight=source.videoHeight||source.naturalHeight||source.height,scale=Math.min(1,maxWidth/sourceWidth),width=Math.max(1,Math.round(sourceWidth*scale)),height=Math.max(1,Math.round(sourceHeight*scale));
  if(!width||!height)throw Error('Caption frame is not decoded yet.');
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  const ctx=this.ctx;ctx.clearRect(0,0,width,height);ctx.drawImage(source,0,0,width,height);
  if(!key.sourceAlpha){
   const image=ctx.getImageData(0,0,width,height);
   removeBackground(image.data,key.replacement?.enabled?{...key,backgroundOpacity:0}:key);
   ctx.putImageData(image,0,0);
  }
  fillReplacement(ctx,key);
  return this.canvas;
 }
}

