import {createProject} from './core.mjs?v=22';
import {startCaptionSequence} from './placement.mjs?v=19-named';

// A new caption pass belongs to the current joke; it must not reset its scene.
export function withCaptionBatch(saved,project,asset){
 const next=saved?structuredClone(saved):createProject();
 if(next.workspace?.id&&next.workspace.id!==project.id)throw Error('Caption batch belongs to another joke project.');
 const cut=asset.cuts;if(cut?.status!=='complete')throw Error('Finish saving the caption components first.');
 const same=next.captionSequence?.source?.cutId===cut.id&&next.workspace?.assetId===asset.id;
 if(same)return next;
 const bed=project.assets.find(a=>a.id===project.cutOrigin?.bedAssetId)||project.assets.find(a=>a.role==='bed');
 if(!next.media&&bed)next.media={kind:'previewlock',name:bed.name,path:bed.path,size:bed.size};
 const frame=next.workspace?.playhead||0;
 next.workspace={...next.workspace,id:project.id,assetId:asset.id,playhead:frame};
 const ids=[];
 for(const c of cut.clips){
  const id=cut.id+'-'+c.number;ids.push(id);
  const existing=next.clips.find(item=>item.id===id);if(existing){existing.captionNumber=c.number;existing.placed??=!!existing.visible;continue;}
  next.clips.push({id,name:c.name||c.number+'.webm',captionNumber:c.number,phraseId:'',type:'video',ref:{kind:'previewlock',name:c.name||c.number+'.webm',path:c.path,size:c.size},inFrame:frame,outFrame:frame+c.frames,trimInFrame:0,trimOutFrame:c.frames,playbackRate:1,x:50,y:75,width:90,rotation:0,opacity:1,volume:0,visible:false,placed:false,locked:false,loop:false});
 }
 startCaptionSequence(next,ids,{source:{kind:'previewlock',id:asset.id,cutId:cut.id,name:asset.name,path:asset.path},folder:asset.path.slice(0,asset.path.lastIndexOf('/')),frame});
 return next;
}
