export const FPS=25;
export const DEFAULT_STYLE={font:'Arial',weight:700,size:52,color:'#ffffff',outline:4,shadow:6,background:'#000000',backgroundOpacity:0,align:'center',x:50,y:78,width:86,lineHeight:1.15,animation:'none',emphasis:false};
export const uid=()=>globalThis.crypto.randomUUID();
export const phrase=(text,frames={})=>({id:uid(),text,inFrame:null,outFrame:null,visible:true,layer:'caplock.caption',styleRef:'global',overrides:{},...frames});
export const createProject=()=>({schema:'GS-CapLock-1',version:1,fps:FPS,media:null,globalStyle:{...DEFAULT_STYLE},presets:{},captions:[]});
export const timed=c=>Number.isInteger(c.inFrame)&&Number.isInteger(c.outFrame)&&c.inFrame>=0&&c.outFrame>c.inFrame;
export const effective=(p,c)=>({...p.globalStyle,...c.overrides});
export function segment(text){
 const sentences=text.trim().split(/(?<=[.!?;…])\s+|\n+/u).filter(Boolean),result=[];
 for(const sentence of sentences){
  if(sentence.length<=64){result.push(sentence);continue;}
  const clauses=sentence.split(/(?<=[,:—])\s+|\s+(?=(?:but|because|although|while|so that|and then)\b)/iu);
  for(const clause of clauses){if(clause.length<=64){result.push(clause);continue;}let part='';for(const word of clause.split(/\s+/)){if(part&&part.length+word.length+1>64){result.push(part);part='';}part+=(part?' ':'')+word;}if(part)result.push(part);}
 }
 return result.map(s=>phrase(s));
}
const seconds=s=>{const a=s.replace(',','.').split(':').map(Number);return a.reduce((n,x)=>n*60+x,0)};
export function importTranscript(text){
 const lines=text.replace(/^\uFEFF/,'').replace(/\r/g,'').split('\n');let cues=[];
 for(let i=0;i<lines.length;i++){
  const m=lines[i].match(/^\s*((?:\d+:)?\d{2}:\d{2}[.,]\d{3})\s+-->\s+((?:\d+:)?\d{2}:\d{2}[.,]\d{3})/);
  if(!m)continue;
  let body=[];while(i+1<lines.length&&lines[i+1].trim())body.push(lines[++i]);
  const start=seconds(m[1]),end=seconds(m[2]);if(end<=start)throw Error('Transcript contains a non-positive cue.');
  cues.push(phrase(body.join('\n'),{inFrame:Math.round(start*FPS),outFrame:Math.max(Math.round(start*FPS)+1,Math.round(end*FPS)),originalTiming:{start,end},timing:'imported'}));
 }
 if(text.includes('-->')&&!cues.length)throw Error('No supported SRT/VTT cues found.');
 return {captions:cues.length?cues:segment(text),timestamped:!!cues.length};
}
export function subtitle(p,type){
 const visible=p.captions.filter(c=>c.visible);if(visible.some(c=>!timed(c)))throw Error('Mark IN and OUT for every visible phrase before subtitle export.');
 const stamp=f=>{const ms=Math.round(f/FPS*1000);return String(Math.floor(ms/3600000)).padStart(2,'0')+':'+String(Math.floor(ms/60000)%60).padStart(2,'0')+':'+String(Math.floor(ms/1000)%60).padStart(2,'0')+(type==='srt'?',':'.')+String(ms%1000).padStart(3,'0')};
 return (type==='vtt'?'WEBVTT\n\n':'')+visible.slice().sort((a,b)=>a.inFrame-b.inFrame).map((c,i)=>(type==='srt'?(i+1)+'\n':'')+stamp(c.inFrame)+' --> '+stamp(c.outFrame)+'\n'+c.text+'\n').join('\n');
}
export function validateProject(raw){
 if(raw?.schema!=='GS-CapLock-1'||raw.version!==1||raw.fps!==FPS||!Array.isArray(raw.captions)||raw.captions.length>10000)throw Error('Unsupported CapLock project.');
 const p=createProject();p.globalStyle=validateStyle(raw.globalStyle);p.media=raw.media?{kind:String(raw.media.kind),name:String(raw.media.name||''),path:String(raw.media.path||''),size:Number(raw.media.size)||0,lastModified:Number(raw.media.lastModified)||0}:null;
 const ids=new Set();p.captions=raw.captions.map(c=>{if(typeof c.id!=='string'||ids.has(c.id)||typeof c.text!=='string'||c.text.length>10000)throw Error('Invalid caption identity or text.');ids.add(c.id);if((c.inFrame!==null&&(!Number.isInteger(c.inFrame)||c.inFrame<0))||(c.outFrame!==null&&(!Number.isInteger(c.outFrame)||c.outFrame<0))||(c.inFrame!==null&&c.outFrame!==null&&c.outFrame<=c.inFrame))throw Error('Invalid caption boundaries.');return phrase(c.text,{id:c.id,inFrame:c.inFrame,outFrame:c.outFrame,visible:c.visible!==false,overrides:validateStyle(c.overrides,true),...(c.originalTiming?{originalTiming:c.originalTiming}:{})});});
 for(const [name,style] of Object.entries(raw.presets||{}))if(!['__proto__','constructor','prototype'].includes(name))p.presets[name]=validateStyle(style);
 return p;
}
export function validateStyle(style={},partial=false){
 const out=partial?{}:{...DEFAULT_STYLE};
 for(const [k,v] of Object.entries(style)){
  if(!Object.hasOwn(DEFAULT_STYLE,k))continue;
  if(['size','outline','shadow','backgroundOpacity','x','y','width','lineHeight','weight'].includes(k)){const limits={size:[12,160],outline:[0,16],shadow:[0,24],backgroundOpacity:[0,1],x:[0,100],y:[0,100],width:[20,100],lineHeight:[.8,2],weight:[400,900]};if(!Number.isFinite(v)||v<limits[k][0]||v>limits[k][1])throw Error('Invalid style '+k);}
  else if(['color','background'].includes(k)){if(!/^#[0-9a-f]{6}$/i.test(v))throw Error('Invalid color');}
  else if(k==='font'&&!['Arial','Georgia','Verdana','Impact','monospace'].includes(v))throw Error('Unsupported font');
  else if(k==='align'&&!['left','center','right'].includes(v))throw Error('Invalid alignment');
  else if(k==='animation'&&!['none','fade','pop'].includes(v))throw Error('Invalid animation');
  else if(k==='emphasis'&&typeof v!=='boolean')throw Error('Invalid emphasis');out[k]=v;
 }
 return out;
}
