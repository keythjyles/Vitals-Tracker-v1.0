export const PHASES=['joke','cut','captions','scene','sound','review'];
export const LABELS={joke:'Joke',cut:'Cut',captions:'Captions',scene:'Scene',sound:'Sound',review:'Review'};
export function canonicalId(id,ledger){
 let result=String(id||'');const seen=new Set();while(ledger.aliases?.[result]){if(seen.has(result))throw Error('Canonical identity cycle.');seen.add(result);result=ledger.aliases[result];}
 return ledger.sourceBacklog?.find(r=>r.sourceJokeId===result)?.canonicalId||result;
}
export function validProjectId(id){return typeof id==='string'&&/^[a-z0-9][a-z0-9-]{5,99}$/.test(id);}
export function moduleSession(module,projectId,values={}){if(!PHASES.includes(module)||!validProjectId(projectId))throw Error('Invalid studio identity.');return {...values,schema:'GS-StudioModule-1',module,projectId};}
export function moduleRevision(project,phase){return project.studio?.modules?.[phase]?.revision||0;}
export function nextPhase(phase){return PHASES[Math.min(PHASES.length-1,Math.max(0,PHASES.indexOf(phase))+1)];}
export function phaseSession(project,phase){const s=project.studio?.modules?.[phase]?.session;return s?.projectId===project.id&&s.module===phase?s:null;}
export function preferredBed(project){return project.assets?.find(a=>a.path===project.caplock?.media?.path)||project.assets?.filter(a=>a.role==='bed').at(-1)||null;}
export function sourcePassMatches(session,asset){return !!session?.source&&session.source.assetId===asset?.id&&session.source.sha256===asset.sha256&&(session.source.passId??null)===(asset.cuts?.id??null);}
