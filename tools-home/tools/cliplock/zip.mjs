// ZIP32 store-only packaging: one user download, original encoded clip bytes unchanged.
const table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32=bytes=>{let n=0xffffffff;for(const b of bytes)n=table[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;};
export async function storeZip(files){
 if(!files.length||files.length>65535)throw Error('Unsupported ZIP entry count.');
 const now=new Date(),time=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1),date=((Math.max(1980,now.getFullYear())-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
 const parts=[],central=[],names=new Set();let offset=0,centralSize=0;
 for(const file of files){const name=String(file.name);if(!name||name.includes('\\')||name.startsWith('/')||name.split('/').includes('..')||name.includes('\0')||names.has(name.toLowerCase()))throw Error('Invalid or repeated ZIP filename.');names.add(name.toLowerCase());
  const path=new TextEncoder().encode(name),data=new Uint8Array(await file.blob.arrayBuffer());if(path.length>65535||data.length>0xffffffff||offset+30+path.length+data.length>0xffffffff)throw Error('Package too large; save clips individually.');const crc=crc32(data);
  const local=new Uint8Array(30),l=new DataView(local.buffer);l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(10,time,true);l.setUint16(12,date,true);l.setUint32(14,crc,true);l.setUint32(18,data.length,true);l.setUint32(22,data.length,true);l.setUint16(26,path.length,true);
  const header=new Uint8Array(46),h=new DataView(header.buffer);h.setUint32(0,0x02014b50,true);h.setUint16(4,20,true);h.setUint16(6,20,true);h.setUint16(8,0x800,true);h.setUint16(12,time,true);h.setUint16(14,date,true);h.setUint32(16,crc,true);h.setUint32(20,data.length,true);h.setUint32(24,data.length,true);h.setUint16(28,path.length,true);h.setUint32(42,offset,true);
  parts.push(local,path,data);central.push(header,path);centralSize+=46+path.length;offset+=30+path.length+data.length;
 }
 const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});
}
