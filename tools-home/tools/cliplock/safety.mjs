import {selection,clipName} from './core.mjs?v=3';
export {hapticClick} from '../../shared/compact-player.mjs?v=5';
export function cutListRecipe(source,meta,cuts){return {schema:'GS-ClipLockList-1',release:'R12',outExclusive:true,source:{...source,totalFrames:meta.times.length},cuts:structuredClone(cuts)};}
export function readCutList(recipe,meta,digest){
 if(recipe?.schema!=='GS-ClipLockList-1'||recipe.outExclusive!==true)throw Error('Choose a ClipLock cut list with exclusive OUT frames.');
 if(recipe.source?.sha256&&recipe.source.sha256!==digest)throw Error('This cut list belongs to a different source. Your cuts are unchanged.');
 if(recipe.source?.totalFrames!==meta.times.length)throw Error('Source frame count differs. Your cuts are unchanged.');
 if(!Array.isArray(recipe.cuts)||!recipe.cuts.length||recipe.cuts.length>40)throw Error('Choose a cut list with 1–40 cuts.');
 const names=new Set();return recipe.cuts.map((c,i)=>{selection(meta.times,meta.end,c.inFrame,c.outFrame);const name=String(c.name||i+1),key=clipName(name,'webm').toLowerCase();if(names.has(key))throw Error('Each cut needs a different name.');names.add(key);return {id:crypto.randomUUID(),name,inFrame:c.inFrame,outFrame:c.outFrame};});
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const n of bytes)crc=crcTable[(crc^n)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function header(size){const bytes=new Uint8Array(size),view=new DataView(bytes.buffer);return {bytes,u16:(p,n)=>view.setUint16(p,n,true),u32:(p,n)=>view.setUint32(p,n,true)};}
// Media is already compressed. Store each clip without additional encoding or players.
export async function clipZip(files,{signal}={}){
 const parts=[],directory=[];let offset=0,centralSize=0;
 for(const file of files){if(signal?.aborted)throw Error('Cut cancelled.');const name=new TextEncoder().encode(file.name),size=file.blob.size;if(offset+size>0xffffffff)throw Error('Clip bundle exceeds ZIP size limit. Save clips individually.');const bytes=new Uint8Array(await file.blob.arrayBuffer()),crc=crc32(bytes),local=header(30);local.u32(0,0x04034b50);local.u16(4,20);local.u16(6,0x800);local.u16(12,33);local.u32(14,crc);local.u32(18,size);local.u32(22,size);local.u16(26,name.length);parts.push(local.bytes,name,file.blob);
 const central=header(46);central.u32(0,0x02014b50);central.u16(4,20);central.u16(6,20);central.u16(8,0x800);central.u16(14,33);central.u32(16,crc);central.u32(20,size);central.u32(24,size);central.u16(28,name.length);central.u32(42,offset);directory.push(central.bytes,name);centralSize+=46+name.length;offset+=30+name.length+size;
 }
 const end=header(22);end.u32(0,0x06054b50);end.u16(8,files.length);end.u16(10,files.length);end.u32(12,centralSize);end.u32(16,offset);return new Blob([...parts,...directory,end.bytes],{type:'application/zip'});
}
