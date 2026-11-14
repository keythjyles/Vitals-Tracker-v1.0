/* Original audio for source records whose catalog stores a WAV in a split ZIP. */
(() => {
 'use strict';
 const LIMIT = 64 * 1024 * 1024;
 const ORIGIN = 'https://zenodo.org/api/records/4060432/files/';
 const archivePattern = /^FSD50K\.(dev|eval)_audio\.(zip|z0[1-5])$/;
 const positive = value => Number.isSafeInteger(value) && value > 0;
 const crcTable = Uint32Array.from({length:256}, (_, index) => {
  for(let bit=0;bit<8;bit++) index=(index>>>1)^((index&1)?0xedb88320:0);
  return index;
 });
 function validArchive(value) {
  return value && archivePattern.test(value.file) && positive(value.offset)
   && positive(value.compressedBytes) && positive(value.bytes) && value.bytes <= LIMIT
   && value.compressedBytes <= LIMIT && (value.method === 0 || value.method === 8)
   && /^[\da-f]{8}$/.test(value.crc32);
 }
 async function fromArchive(candidate) {
  const a = candidate.archive;
  if(!validArchive(a) || !/^freesound:\d+$/.test(candidate.id)) throw Error('Invalid audio archive record.');
  const end = a.offset + a.compressedBytes + 511;
  const url = ORIGIN + a.file + '/content?clip=' + candidate.id.split(':')[1];
  const response = await fetch(url,{headers:{Range:'bytes='+a.offset+'-'+end},signal:AbortSignal.timeout(25000)});
  if(response.status!==206)throw Error('Original audio archive HTTP '+response.status+'. Try again.');
  const wrapped = await response.arrayBuffer(), header = new DataView(wrapped);
  if(wrapped.byteLength<30 || header.getUint32(0,true)!==0x04034b50 || header.getUint16(8,true)!==a.method)
   throw Error('Audio archive header does not match this candidate.');
  const nameLength=header.getUint16(26,true),offset=30+nameLength+header.getUint16(28,true);
  const name=new TextDecoder().decode(wrapped.slice(30,30+nameLength));
  if(name.split('/').at(-1)!==candidate.id.split(':')[1]+'.wav' || offset+a.compressedBytes>wrapped.byteLength)
   throw Error('Audio archive entry is incomplete or mismatched.');
  let bytes=wrapped.slice(offset,offset+a.compressedBytes);
  if(a.method===8){
   const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   bytes=await new Response(stream).arrayBuffer();
  }
  let crc=0xffffffff;
  for(const byte of new Uint8Array(bytes))crc=(crc>>>8)^crcTable[(crc^byte)&255];
  if(bytes.byteLength!==a.bytes || ((crc^0xffffffff)>>>0).toString(16).padStart(8,'0')!==a.crc32)
   throw Error('Original audio archive checksum did not match.');
  return new Blob([bytes],{type:'audio/wav'});
 }
 async function download(candidate) {
  if(candidate.archive)return fromArchive(candidate);
  if(!candidate.url)throw Error('Original audio is unavailable.');
  const response=await fetch(candidate.url,{signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('Original audio HTTP '+response.status+'. Try again.');
  const blob=await response.blob();
  if(!blob.size||blob.size>LIMIT||/^(text\/|application\/json)/.test(blob.type))throw Error('The source did not return usable audio.');
  return blob;
 }
 function validate(value) {
  if(!value || typeof value.name!=='string'||!value.name.trim()||value.name.length>255)return false;
  const source=new URL(value.source);
  if(/^bigsoundbank:\d+$/.test(value.id)&&source.protocol==='https:'&&source.hostname==='bigsoundbank.com'){
   return value.url==='./intake/media/bigsoundbank-'+value.id.split(':')[1]+'.mp3';
  }
  if(/^sfxmint:[a-z0-9-]+$/.test(value.id)&&source.protocol==='https:'&&source.hostname==='sfxmint.com'){
   return value.url==='./intake/media/sfxmint-'+value.id.split(':')[1]+'.mp3';
  }
  const media=new URL(value.url);
  if(media.protocol!=='https:'||source.protocol!=='https:'||media.username||media.password||source.username||source.password)return false;
  if(/^commons:\d+$/.test(value.id))return media.hostname==='upload.wikimedia.org'&&source.hostname==='commons.wikimedia.org';
  if(/^freesound:\d+$/.test(value.id))return source.hostname==='freesound.org'&&validArchive(value.archive)&&value.url===ORIGIN+value.archive.file+'/content';
  if(/^sfxmint:[a-z0-9-]+$/.test(value.id))return source.hostname==='sfxmint.com' && /.(wav|mp3)$/.test(media.pathname) && (media.hostname==='sfxmint.com'||media.hostname.endsWith('.sfxmint.com'));
  return false;
 }
 window.GSCandidateAudio={download,validate};
})();
