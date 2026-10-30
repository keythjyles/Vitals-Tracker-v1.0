export const FPS=25;
export const DEFAULT_STYLE={font:'Arial',weight:700,size:52,color:'#ffffff',outline:4,shadow:6,background:'#000000',backgroundOpacity:0,align:'center',x:50,y:78,width:86,lineHeight:1.15,animation:'none',emphasis:false};
export const uid=()=>globalThis.crypto.randomUUID();
export const phrase=(text,frames={})=>({id:uid(),text,inFrame:null,outFrame:null,visible:true,layer:'caplock.caption',styleRef:'global',overrides:{},...frames});
export const createProject=()=>({schema:'GS-CapLock-1',version:5,bedTransform:{x:50,y:50,scale:1},editFocus:'bed',fps:FPS,media:null,clips:[],protocol:{text:'',approved:false},nativeCaptions:false,globalStyle:{...DEFAULT_STYLE},presets:{},captions:[]});
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
 if(raw?.schema!=='GS-CapLock-1'||![1,2,3,4,5].includes(raw.version)||raw.fps!==FPS||!Array.isArray(raw.captions)||raw.captions.length>10000)throw Error('Unsupported CapLock project.');
 const p=createProject();p.globalStyle=validateStyle(raw.globalStyle);p.media=raw.media?{kind:String(raw.media.kind),name:String(raw.media.name||''),path:String(raw.media.path||''),size:Number(raw.media.size)||0,lastModified:Number(raw.media.lastModified)||0}:null;
 if(raw.bedTransform){const b=raw.bedTransform;for(const [k,min,max]of [['x',-100,200],['y',-100,200],['scale',.25,4]])if(!Number.isFinite(b[k])||b[k]<min||b[k]>max)throw Error('Invalid bed transform '+k);p.bedTransform={x:b.x,y:b.y,scale:b.scale};}p.editFocus=raw.editFocus==='overlay'?'overlay':'bed';
 p.protocol={text:String(raw.protocol?.text||''),approved:raw.protocol?.approved===true};p.nativeCaptions=raw.nativeCaptions===true;p.clips=(raw.clips||[]).map(validateClip);if(new Set(p.clips.map(c=>c.id)).size!==p.clips.length)throw Error('Duplicate clip IDs');
 if(raw.workspace){const w=raw.workspace;if(!/^[a-z0-9][a-z0-9-]{5,99}$/.test(w.id||''))throw Error('Invalid project workspace');p.workspace={id:w.id,assetId:String(w.assetId||''),playhead:Math.max(0,Number(w.playhead)||0),selectedClip:String(w.selectedClip||'')};}
 if(raw.captionSequence){const s=raw.captionSequence,ids=s.clipIds;if(!Array.isArray(ids)||!ids.length||ids.length>1000||new Set(ids).size!==ids.length||ids.some(id=>!p.clips.some(c=>c.id===id))||!ids.includes(s.activeId))throw Error('Invalid caption sequence');p.captionSequence={clipIds:[...ids],activeId:s.activeId,preparedIds:(s.preparedIds||[]).filter(id=>ids.includes(id)),playhead:Math.max(0,Math.round(Number(s.playhead)||0)),folder:String(s.folder||''),source:s.source?{id:String(s.source.id||''),cutId:String(s.source.cutId||''),name:String(s.source.name||''),path:String(s.source.path||''),kind:s.source.kind==='local'?'local':'previewlock'}:null};}
 const ids=new Set();p.captions=raw.captions.map(c=>{if(typeof c.id!=='string'||ids.has(c.id)||typeof c.text!=='string'||c.text.length>10000)throw Error('Invalid caption identity or text.');ids.add(c.id);if((c.inFrame!==null&&(!Number.isInteger(c.inFrame)||c.inFrame<0))||(c.outFrame!==null&&(!Number.isInteger(c.outFrame)||c.outFrame<0))||(c.inFrame!==null&&c.outFrame!==null&&c.outFrame<=c.inFrame))throw Error('Invalid caption boundaries.');return phrase(c.text,{id:c.id,inFrame:c.inFrame,outFrame:c.outFrame,visible:c.visible!==false,overrides:validateStyle(c.overrides,true),direction:String(c.direction||''),useProtocol:c.useProtocol!==false,timingReview:!!c.timingReview,words:Array.isArray(c.words)?c.words.map(w=>({id:String(w.id),text:String(w.text),effect:String(w.effect||'')})):undefined,...(c.originalTiming?{originalTiming:c.originalTiming}:{})});});
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

export function validateClip(c){
 if(typeof c.id!=='string'||!['video','image','audio'].includes(c.type)||!c.ref||!['local','previewlock'].includes(c.ref.kind))throw Error('Invalid animation clip');
 for(const k of ['inFrame','outFrame','trimInFrame'])if(!Number.isInteger(c[k])||c[k]<0)throw Error('Clip boundaries must be nonnegative integer frames');
 if(c.outFrame<=c.inFrame)throw Error('Clip OUT must follow IN');
 if(c.trimOutFrame!=null&&(!Number.isInteger(c.trimOutFrame)||c.trimOutFrame<=c.trimInFrame))throw Error('Source OUT must follow source IN');
 if(c.playbackRate!=null&&(!Number.isFinite(c.playbackRate)||c.playbackRate<.1||c.playbackRate>8))throw Error('Animation speed must be0.1x to8x');
 if(c.captionNumber!=null&&(!Number.isInteger(c.captionNumber)||c.captionNumber<1))throw Error('Invalid caption number');
 for(const [k,min,max] of [['x',-100,200],['y',-100,200],['width',5,400],['rotation',-180,180],['opacity',0,1],['volume',0,1]])if(!Number.isFinite(c[k])||c[k]<min||c[k]>max)throw Error('Invalid clip '+k);
 return {id:c.id,name:String(c.name||c.ref.name||'Clip'),phraseId:String(c.phraseId||''),type:c.type,ref:{kind:c.ref.kind,name:String(c.ref.name||''),path:String(c.ref.path||''),size:Number(c.ref.size)||0},inFrame:c.inFrame,outFrame:c.outFrame,trimInFrame:c.trimInFrame,trimOutFrame:c.trimOutFrame??null,playbackRate:c.playbackRate??1,x:c.x,y:c.y,width:c.width,rotation:c.rotation,opacity:c.opacity,volume:c.volume,visible:c.visible!==false,loop:!!c.loop,locked:!!c.locked,...(c.captionNumber?{captionNumber:c.captionNumber}:{})};
}

