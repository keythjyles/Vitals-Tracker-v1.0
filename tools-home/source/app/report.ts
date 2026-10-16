export type JokeVariant={id:string;text:string;tone:string;tense:string;qualifier:string;notes:string};
export type JokeReport={schema:'JokeReport-1.0';id:string;name:string;source:string;notes:string;variants:JokeVariant[]};
export function validateReport(value:unknown):JokeReport {
  const v=value as JokeReport;
  if(!v||v.schema!=='JokeReport-1.0'||!Array.isArray(v.variants)||!v.variants.length||v.variants.length>250)throw Error('Choose a JokeReport-1.0 report with 1–250 variants.');
  for(const k of ['id','name','source','notes'] as const)if(typeof v[k]!=='string')throw Error('Missing report '+k+'.');
  if(!v.id.trim()||!v.name.trim()||!v.source.trim())throw Error('The report needs an ID, name and source joke.');
  const ids=new Set<string>();
  for(const x of v.variants){
    if(!x||typeof x!=='object')throw Error('Invalid variant.');
    for(const k of ['id','text','tone','tense','qualifier','notes'] as const)if(typeof x[k]!=='string')throw Error('Missing variant '+k+'.');
    if(!x.id.trim()||!x.text.trim()||!x.tone.trim()||!x.tense.trim()||ids.has(x.id))throw Error('Every variant needs unique ID, text, tone and tense.');
    ids.add(x.id);
  }
  if(JSON.stringify(v).length>200000)throw Error('Report is too large. Split it into smaller batches.');
  return {schema:'JokeReport-1.0',id:v.id,name:v.name,source:v.source,notes:v.notes,variants:v.variants.map(x=>({id:x.id,text:x.text,tone:x.tone,tense:x.tense,qualifier:x.qualifier,notes:x.notes}))};
}
export function encodePayload(value:unknown){const bytes=new TextEncoder().encode(JSON.stringify(value));let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export async function decodePayload(encoded:string,compressed=false):Promise<unknown>{
  if(encoded.length>300000)throw Error('That link is too large. Import the report file instead.');
  const normalized=encoded.replace(/-/g,'+').replace(/_/g,'/');
  const binary=atob(normalized+'='.repeat((4-normalized.length%4)%4));
  let bytes:Uint8Array=Uint8Array.from(binary,c=>c.charCodeAt(0));
  if(compressed){
    if(typeof DecompressionStream==='undefined')throw Error('This browser cannot open compressed report links. Use Import Report with the JSON file.');
    const stream=new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
    const reader=stream.getReader(),chunks:Uint8Array[]=[];let total=0;
    while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>220000){await reader.cancel();throw Error('Expanded report is too large.');}chunks.push(value);}
    bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  }
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
