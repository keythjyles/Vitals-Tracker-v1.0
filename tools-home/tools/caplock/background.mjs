// AspectLock's per-frame scratch-canvas approach, shared by CapLock preview/export.
// The original pixels/bytes remain the source; only the composited alpha changes.
export const DEFAULT_CHROMA=Object.freeze({enabled:true,color:'#0a77d4',similarity:.18,blend:.04});
export function validateChroma(raw){
 if(!raw||typeof raw.enabled!=='boolean'||!/^#[0-9a-f]{6}$/i.test(raw.color)||!Number.isFinite(raw.similarity)||raw.similarity<.01||raw.similarity>.5||!Number.isFinite(raw.blend)||raw.blend<0||raw.blend>.2)throw Error('Invalid caption background settings');
 return {enabled:raw.enabled,color:raw.color.toLowerCase(),similarity:raw.similarity,blend:raw.blend};
}
const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),distance=(r,g,b)=>Math.sqrt(r*r+g*g+b*b)/441.6729559300637;
export function removeBackground(pixels,key){
 if(!key?.enabled)return pixels;
 const [kr,kg,kb]=rgb(key.color),softness=key.blend;
 for(let i=0;i<pixels.length;i+=4){
  if(!pixels[i+3])continue;
  const d=distance(pixels[i]-kr,pixels[i+1]-kg,pixels[i+2]-kb),alpha=softness?Math.max(0,Math.min(1,(d-key.similarity)/softness)):Number(d>key.similarity);
  pixels[i+3]=Math.round(pixels[i+3]*alpha);
 }
 return pixels;
}
export function inferBackground(pixels,width,height){
 const samples=[];let transparent=0;
 for(const [x,y] of [[.02,.02],[.05,.02],[.95,.02],[.98,.02],[.02,.05],[.98,.05],[.02,.95],[.98,.95],[.02,.98],[.05,.98],[.95,.98],[.98,.98]]){
  const i=(Math.min(height-1,Math.floor(y*height))*width+Math.min(width-1,Math.floor(x*width)))*4;
  if(pixels[i+3]<250)transparent++;else samples.push([pixels[i],pixels[i+1],pixels[i+2]]);
 }
 // Genuine alpha sources remain alpha, including partially transparent edges.
 if(transparent||!samples.length)return null;
 const median=[0,1,2].map(k=>samples.map(p=>p[k]).sort((a,b)=>a-b)[Math.floor(samples.length/2)]);
 if(samples.filter(p=>distance(...p.map((v,k)=>v-median[k]))<.045).length<samples.length*.9)return null;
 return {...DEFAULT_CHROMA,color:'#'+median.map(v=>v.toString(16).padStart(2,'0')).join('')};
}
export function detectBackground(source){
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,64,64);ctx.drawImage(source,0,0,64,64);
 return inferBackground(ctx.getImageData(0,0,64,64).data,64,64);
}
export class BackgroundSurface{
 constructor(canvas=document.createElement('canvas')){this.canvas=canvas;this.ctx=canvas.getContext('2d',{willReadFrequently:true});}
 draw(source,key,{maxWidth=Infinity}={}){
  if(!key?.enabled)return source;
  const sourceWidth=source.videoWidth||source.naturalWidth||source.width,sourceHeight=source.videoHeight||source.naturalHeight||source.height,scale=Math.min(1,maxWidth/sourceWidth),width=Math.max(1,Math.round(sourceWidth*scale)),height=Math.max(1,Math.round(sourceHeight*scale));
  if(!width||!height)throw Error('Caption frame is not decoded yet.');
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  const ctx=this.ctx;ctx.clearRect(0,0,width,height);ctx.drawImage(source,0,0,width,height);
  const image=ctx.getImageData(0,0,width,height);removeBackground(image.data,key);ctx.putImageData(image,0,0);return this.canvas;
 }
}
