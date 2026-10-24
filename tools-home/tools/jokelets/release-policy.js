// Publication readiness and clean production reuse are separate decisions.
export function isFinishedRelease(item){
 return item?.kind==='release'||item?.role==='release'||item?.publication?.stage==='release';
}
export function separateReleases(state,fixed={}){
 const known=[...(fixed.catalog||[]),...(fixed.assets||[])].filter(isFinishedRelease);
 const normalize=item=>{
  const match=known.find(x=>x.id===item.id||(x.sha256&&x.sha256===item.sha256)||(x.src&&x.src===item.src));
  if(!match&&!isFinishedRelease(item))return item;
  return {...item,kind:'release',role:'release',folderId:'folder-release',
   publication:{...item.publication,...match?.publication,stage:'release'},
   automationReview:{...item.automationReview,status:'Blocked',note:'Finished publication with baked layers. Repost the unchanged release; do not use as a clean production source.'}};
 };
 const items=[...(state.catalog||[]),...(state.assets||[])].map(normalize);
 const unique=[...new Map(items.map(i=>[i.id,i])).values()];
 const releases=unique.filter(isFinishedRelease),ids=new Set(releases.map(i=>i.id));
 return {...state,catalog:unique.filter(i=>!isFinishedRelease(i)&&(state.catalog||[]).some(c=>c.id===i.id)),
  assets:unique.filter(i=>isFinishedRelease(i)||!(state.catalog||[]).some(c=>c.id===i.id)),
  selected:(state.selected||[]).filter(id=>!ids.has(id)),
  folders:[...(state.folders||[]).filter(f=>f.id!=='folder-release'),{id:'folder-release',name:'Finished releases',parentId:null,type:'release'}]};
}
