import {createHash} from 'node:crypto';
import {Input,ALL_FORMATS,BlobSource,EncodedPacketSink} from '../../tools/sxlock/vendor/mediabunny-1.62.1-gs1.mjs';
import {STAGES,stageFilename,captionRecipe,soundRecipe,mediaContainer,mediaType,stageAsset,pendingCaptions} from '../../shared/production-stages.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex');
export function productionAsset(p,id){return (p.assets||[]).flatMap(a=>[a,...[...(a.cutHistory||[]),a.cuts].filter(Boolean).flatMap(pass=>(pass.clips||[]).map(c=>({...c,parent:a.id,cutPassId:pass.id,passVersion:pass.version||1,role:'caption component'})))]).find(a=>a.id===id);}
export async function verifyStage(p,data,a,bytes){
 if(!STAGES[data.stage]||data.stage==='release')throw Error('Choose a supported working production stage.');
 if(!a||a.size!==bytes.length||a.sha256!==digest(bytes))throw Error('The saved stage file failed byte verification.');
 const format=mediaContainer(bytes),input=new Input({source:new BlobSource(new Blob([bytes])),formats:ALL_FORMATS});
 let media;
 try{const v=await input.getPrimaryVideoTrack();if(!v)throw Error('A production stage needs a readable video.');let frames=0,end=0;for await(const packet of new EncodedPacketSink(v).packets(undefined,undefined,{metadataOnly:true})){frames++;end=Math.max(end,packet.timestamp+packet.duration);}media={format,mimeType:mediaType(format),frames,duration:end,width:await v.getDisplayWidth(),height:await v.getDisplayHeight(),audio:!!await input.getPrimaryAudioTrack(),alpha:await v.canBeTransparent()};if(!frames||!end)throw Error('The saved video is empty.');}finally{input.dispose();}
 let recipe=null,parents=[];
 if(data.stage==='captioned'){
  if(pendingCaptions(p.caplock).length)throw Error('Place or remove the remaining caption components before marking this stage ready.');recipe=captionRecipe(p.caplock);if(!recipe?.media?.path)throw Error('Save the editable CapLock project first.');
  if(data.recipeJSON!==JSON.stringify(recipe))throw Error('Caption placements changed during export. The rendered file is retained; reopen the current edit before advancing.');
  if(!data.report?.composited||data.report.outputFrames!==media.frames||Math.abs(data.report.duration-media.duration)>.003||data.report.outputWidth!==media.width||data.report.outputHeight!==media.height)throw Error('The composite did not match its export receipt.');
  const refs=[recipe.media,...recipe.clips.map(c=>c.ref)];parents=refs.map(ref=>{const parent=(p.assets||[]).flatMap(a=>[a,...[...(a.cutHistory||[]),a.cuts].filter(Boolean).flatMap(pass=>pass.clips||[])]).find(a=>a.path===ref.path);if(!parent||parent.size!==ref.size)throw Error('A caption-render source is not saved in this joke project.');return {id:parent.id,path:parent.path,sha256:parent.sha256};});
  if(media.audio!==!!(data.report.hasSourceAudio||data.report.hasEffects))throw Error('The composite soundtrack did not match the source and placed audio.');
  if(media.format!=='mp4'||media.frames<1)throw Error('Captioned output must be the verified MP4 composite.');
 }else if(data.stage==='jokelet'){
  recipe=soundRecipe(p.studio?.modules?.sound?.session);if(!recipe||data.recipeJSON!==JSON.stringify(recipe))throw Error('Save the current sound edit before advancing.');
  const bed=stageAsset(p,'captioned');if(!bed||bed.id!==recipe.bed?.id||bed.sha256!==recipe.bed?.sha256)throw Error('The sound pass must use this joke’s current captioned video.');
  if(data.report?.outputFrames!==media.frames||Math.abs(data.report.duration-media.duration)>.003)throw Error('The sound export did not match its verified receipt.');parents=[{id:bed.id,path:bed.path,sha256:bed.sha256},...Object.values(recipe.soundRefs).map(a=>({id:a.id,path:a.path,sha256:a.sha256}))];
 }else if(data.stage==='alpha'&&(!a.parent||!media.alpha))throw Error('Choose a saved transparent caption component.');
 else if(data.stage==='animation'&&a.role!=='caption')throw Error('Choose the saved Gemini caption original.');
 const recipeJSON=recipe?JSON.stringify(recipe):null,recipeDigest=digest(recipeJSON||JSON.stringify([data.stage,a.sha256,a.parent||null]));
 const old=(p.production?.records||[]).find(r=>r.stage===data.stage&&r.sha256===a.sha256&&r.recipeDigest===recipeDigest&&r.assetId===a.id);
 if(old)return {record:old,reused:true};
 const version=a.parent?a.passVersion:1+(p.production?.records||[]).filter(r=>r.stage===data.stage).length;
 return {record:{id:'stage-'+digest(JSON.stringify([p.id,data.stage,a.id,recipeDigest])),stage:data.stage,version,assetId:a.id,path:a.path,sha256:a.sha256,bytes:a.size,media,fileName:stageFilename(p.title,data.stage,version,a.parent?a.number:null),recipeDigest,recipeJSON,parents,verified:true,created:new Date().toISOString()},reused:false};
}
