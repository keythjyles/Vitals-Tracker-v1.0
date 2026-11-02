// One video cut is one independent jokelet project. Names never define identity.
const fingerprint=/^[a-f0-9]{64}$/;
const positive=n=>Number.isSafeInteger(n)&&n>0;
function label(value,max){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Invalid cut name or source filename.');return value;}
export function normalizeCutOrigin(value){
 const s=value?.source,c=value?.cut;
 if(!s||!c||!fingerprint.test(s.sha256)||!positive(s.frames)||!positive(s.bytes))throw Error('A cut needs its original source fingerprint.');
 if(typeof c.id!=='string'||!c.id||c.id.length>160||!positive(c.index)||!Number.isSafeInteger(c.inFrame)||!Number.isSafeInteger(c.outFrame)||c.inFrame<0||c.outFrame<=c.inFrame||c.outFrame>s.frames)throw Error('Invalid source cut frames.');
 if(!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<0||c.end<=c.start)throw Error('Invalid source cut timing.');
 return {schema:'GS-CutOrigin-1',source:{name:label(s.name,512),sha256:s.sha256,frames:s.frames,bytes:s.bytes},cut:{id:c.id,index:c.index,name:label(c.name,110),inFrame:c.inFrame,outFrame:c.outFrame,start:c.start,end:c.end,frames:c.outFrame-c.inFrame}};
}
export async function sha256Bytes(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function cutProjectId(value){const o=normalizeCutOrigin(value);return 'cut-'+await sha256Bytes(new TextEncoder().encode(JSON.stringify([o.source.sha256,o.cut.id,o.cut.inFrame,o.cut.outFrame])));}
export function verifyCutOutput(value,origin){
 const o=normalizeCutOrigin(origin),v=value;
 if(!v||!fingerprint.test(v.sha256)||!positive(v.bytes)||v.bytes>40*1024*1024||!['mp4','webm'].includes(v.format)||v.frames!==o.cut.frames||!positive(v.width)||!positive(v.height)||typeof v.audio!=='boolean'||!Number.isFinite(v.duration)||Math.abs(v.duration-(o.cut.end-o.cut.start))>.003)throw Error('The prepared cut does not match its source range.');
 return {sha256:v.sha256,bytes:v.bytes,format:v.format,frames:v.frames,width:v.width,height:v.height,audio:v.audio,duration:v.duration};
}
export function projectBed(project){const id=project?.cutOrigin?.bedAssetId;return (project?.assets||[]).find(a=>a.id===id&&a.role==='bed')||null;}
