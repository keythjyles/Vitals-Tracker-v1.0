/* Finalize duration headers in fragmented Chrome MediaRecorder MP4s.
 * Leaves encoded samples, timestamps, offsets and box sizes unchanged. */
(function(root){
'use strict';
async function finalizeMp4Duration(blob){
 const patches=[],tracks=new Map(),defaults=new Map();let movie=null;
 async function boxes(start,end){const out=[];while(start+8<=end){const v=new DataView(await blob.slice(start,Math.min(start+16,end)).arrayBuffer());let size=v.getUint32(0),header=8;const type=String.fromCharCode(...new Uint8Array(v.buffer,4,4));if(size===1){size=Number(v.getBigUint64(8));header=16;}if(size===0)size=end-start;if(!Number.isSafeInteger(size)||size<header||start+size>end)throw Error('Invalid MP4 box: '+type);out.push({start,end:start+size,p:start+header,type});start+=size;}if(start!==end)throw Error('Incomplete MP4 box.');return out;}
 async function view(b){return new DataView(await blob.slice(b.p,b.end).arrayBuffer());}
 function field(v,kind){const v1=v.getUint8(0)===1;return kind==='tkhd'?(v1?28:20):(v1?24:16);}
 function durationPatch(b,v,kind,value){const offset=field(v,kind),n=v.getUint8(0)===1?8:4,a=new Uint8Array(n),d=new DataView(a.buffer);if(n===8)d.setBigUint64(0,BigInt(Math.ceil(value)));else{if(value>0xffffffff)throw Error('MP4 duration exceeds header capacity.');d.setUint32(0,Math.ceil(value));}patches.push({at:b.p+offset,bytes:a});}
 const top=await boxes(0,blob.size),moov=top.find(b=>b.type==='moov');if(!moov)throw Error('MP4 movie header missing.');if(!top.some(b=>b.type==='moof'))return blob;
 for(const b of await boxes(moov.p,moov.end)){
  if(b.type==='mvhd'){const v=await view(b);movie={b,v,scale:v.getUint32(v.getUint8(0)===1?20:12)};}
  if(b.type==='trak'){let tk,md;for(const c of await boxes(b.p,b.end)){if(c.type==='tkhd')tk={b:c,v:await view(c)};if(c.type==='mdia')for(const d of await boxes(c.p,c.end))if(d.type==='mdhd')md={b:d,v:await view(d)};}if(tk&&md){const id=tk.v.getUint32(tk.v.getUint8(0)===1?20:12),scale=md.v.getUint32(md.v.getUint8(0)===1?20:12);tracks.set(id,{tk,md,scale,end:0});}}
  if(b.type==='mvex')for(const c of await boxes(b.p,b.end))if(c.type==='trex'){const v=await view(c);defaults.set(v.getUint32(4),v.getUint32(12));}
 }
 if(!movie?.scale||!tracks.size)throw Error('MP4 timing headers missing.');
 for(const moof of top.filter(b=>b.type==='moof'))for(const traf of (await boxes(moof.p,moof.end)).filter(b=>b.type==='traf')){
  const children=await boxes(traf.p,traf.end),tfhd=children.find(b=>b.type==='tfhd'),tfdt=children.find(b=>b.type==='tfdt');if(!tfhd||!tfdt)throw Error('MP4 fragment timing missing.');
  const h=await view(tfhd),flags=h.getUint32(0)&0xffffff,id=h.getUint32(4),track=tracks.get(id);if(!track)throw Error('Unknown MP4 track.');let p=8;if(flags&1)p+=8;if(flags&2)p+=4;const def=flags&8?h.getUint32(p):defaults.get(id);const dt=await view(tfdt);let cursor=dt.getUint8(0)===1?Number(dt.getBigUint64(4)):dt.getUint32(4);
  for(const trun of children.filter(b=>b.type==='trun')){const v=await view(trun),f=v.getUint32(0)&0xffffff,count=v.getUint32(4);let q=8;if(f&1)q+=4;if(f&4)q+=4;for(let i=0;i<count;i++){const dur=f&0x100?v.getUint32(q):def;if(f&0x100)q+=4;if(!dur)throw Error('MP4 sample duration missing.');if(f&0x200)q+=4;if(f&0x400)q+=4;let cto=0;if(f&0x800){cto=v.getUint8(0)===1?v.getInt32(q):v.getUint32(q);q+=4;}track.end=Math.max(track.end,cursor+cto+dur);cursor+=dur;}}
 }
 let seconds=0;for(const track of tracks.values()){if(!track.scale||!track.end)throw Error('MP4 track duration missing.');durationPatch(track.md.b,track.md.v,'mdhd',track.end);durationPatch(track.tk.b,track.tk.v,'tkhd',track.end/track.scale*movie.scale);seconds=Math.max(seconds,track.end/track.scale);}durationPatch(movie.b,movie.v,'mvhd',seconds*movie.scale);
 patches.sort((a,b)=>a.at-b.at);const parts=[];let at=0;for(const patch of patches){parts.push(blob.slice(at,patch.at),patch.bytes);at=patch.at+patch.bytes.length;}parts.push(blob.slice(at));return new Blob(parts,{type:blob.type});
}
root.SxMp4Duration={finalizeMp4Duration};if(typeof module!=='undefined')module.exports=root.SxMp4Duration;
})(typeof globalThis!=='undefined'?globalThis:this);
