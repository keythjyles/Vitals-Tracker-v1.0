import {normalizeCutOrigin,cutProjectId,sha256Bytes} from './cut-jokelets-core.mjs?v=1';
import {beginCutQueue,stageCutProject,publishCutProject,matchingCutVideo} from './cut-jokelets.mjs?v=2';

// A whole video uses the same verified project save as a cut, without encoding it.
export async function videoProjectSource(file,meta){
 if(!file?.size||file.size>40*1024*1024)throw Error('Choose a video under the existing 40 MB project-file limit.');
 const header=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const format=header[0]===0x1a&&header[1]===0x45&&header[2]===0xdf&&header[3]===0xa3?'webm':String.fromCharCode(...header.slice(4,8))==='ftyp'?'mp4':null;
 if(!format)throw Error('Choose an MP4, MOV or WebM video. The original is unchanged.');
 if(!meta?.times?.length||Math.abs(meta.times[0])>.00001||!Number.isFinite(meta.end)||meta.end<=0)throw Error('This video needs a source starting at frame zero. Its original is unchanged.');
 const digest=await sha256Bytes(await file.arrayBuffer()),name=file.name||'Joke video.'+format;
 const origin=normalizeCutOrigin({source:{name,sha256:digest,frames:meta.times.length,bytes:file.size},cut:{id:'whole-video',index:1,name:name.replace(/\.[^.]+$/,'').slice(0,110)||'Joke video',inFrame:0,outFrame:meta.times.length,start:0,end:meta.end}});
 return {id:await cutProjectId(origin),origin,output:{blob:file,name,format,verified:{frames:meta.times.length,duration:meta.end,width:meta.width,height:meta.height,audio:meta.audio}}};
}
export async function openVideoProject(api,file,meta,progress=()=>{}){
 const source=await videoProjectSource(file,meta);
 const existing=await matchingCutVideo(source.origin.source.sha256);
 if(existing)return publishCutProject(api,existing.id,progress);
 beginCutQueue(source.origin.source.sha256,[source.origin],{append:true});
 await stageCutProject(source.origin,source.output);
 return publishCutProject(api,source.id,progress);
}
