export function producedJokeIds(ledger){
 const aliases=ledger.aliases||{};const canonical=id=>{const seen=new Set();while(aliases[id]&&!seen.has(id)){seen.add(id);id=aliases[id]}return id};
 const made=new Set();
 for(const group of ledger.existingGroups||[])if(group.assets?.length){made.add(canonical(group.canonicalId));for(const id of group.sourceJokeIds||[])made.add(canonical(id))}
 for(const row of [...(ledger.sourceBacklog||[]),...(ledger.selectedBatch||[])])if(/^(?:produced|jokelet_produced|voiceover_produced|existing_output)/.test(row.state||'')){made.add(canonical(row.canonicalId||row.sourceJokeId));if(row.sourceJokeId)made.add(canonical(row.sourceJokeId))}
 return new Set([...made,...Object.keys(aliases).filter(id=>made.has(canonical(id)))]);
}
export function libraryMatches(rows,decisions,filter,produced,query=''){
 const q=query.trim().toLowerCase();return rows.filter(j=>{
  if(produced.has(j.id))return false;
  const status=decisions[j.id]?.status;
  const matches=filter==='browse'?(!status||status==='browse'):filter==='saved'?(status==='saved'||status==='library'):status===filter;
  return matches&&[j.text,j.category,...(j.sources||[]).map(s=>s.source)].join(' ').toLowerCase().includes(q);
 });
}
