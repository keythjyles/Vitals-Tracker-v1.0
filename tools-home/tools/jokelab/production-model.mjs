// Production identities and source references are immutable; decisions are overrides.
export function productionItems(ledger){
 const groups=new Map((ledger.existingGroups||[]).map(g=>[g.canonicalId,g]));
 const items=new Map();
 for(const p of ledger.currentProductions||[])items.set(p.id,{...p,priority:0});
 for(const run of [...(ledger.selectedBatch||[])].reverse()){
  if(['not_started','completed_archived','selection_withdrawn'].includes(run.state))continue;
  const id=run.canonicalId||run.runId;if(items.has(id))continue;const group=groups.get(id);
  items.set(id,{id,name:group?.title||run.runId,state:run.reviewStatus||run.state,assets:group?.assets||[],runId:run.runId,priority:1});
 }
 for(const group of [...groups.values()].reverse())if(!items.has(group.canonicalId))items.set(group.canonicalId,{id:group.canonicalId,name:group.title,state:group.state,assets:group.assets||[],priority:2});
 return [...items.values()];
}
export function assetURL(asset,base){
 if(!asset?.src)return null;
 const u=new URL(asset.src,base);return ['https:','http:'].includes(u.protocol)?u.href:null;
}
export function visibleItems(items,overrides,view,query){
 const q=query.trim().toLowerCase();return items.filter(p=>{
  const edit=overrides[p.id]||{},decision=edit.decision||'';
  if(view==='current'&&(decision==='REMOVED'||decision==='HOLD'||p.priority===2))return false;
  if(view==='all'&&decision==='REMOVED')return false;
  if(['HOLD','REMOVED'].includes(view)&&decision!==view)return false;
  return !q||[edit.name||p.name,p.id,p.state].join(' ').toLowerCase().includes(q);
 });
}
