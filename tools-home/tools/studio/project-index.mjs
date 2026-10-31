import {cutPassVersion} from '../../shared/cut-passes.mjs?v=4';
// Stable project identity comes from the saved manifest or the production ledger.
export const PROJECT_ROOT='/Grill Sergeant/JokeLab Productions';
export const isVideo=a=>/\.(mp4|webm|mov)$/i.test(a.name||a.src||a.path||'');
export function indexedJokes(ledger,catalog){
 const rows=new Map((catalog.catalog||[]).map(a=>[a.id,a]));
 return (ledger.existingGroups||[]).map(g=>{
  const assets=(g.assets||[]).map(a=>({...rows.get(a.id),...a,role:'bed',name:(a.src||'').split('/').pop()})).filter(a=>isVideo(a)&&a.src);
  const text=assets.map(a=>a.text).find(t=>t&&t!=='Preserved joke and complete reaction.')||'';
  return {id:g.canonicalId,title:g.title,text,assets,path:PROJECT_ROOT+'/'+g.canonicalId,catalog:true};
 }).filter(p=>p.assets.length);
}
export function projectFolders(entries){
 const ids=new Map();for(const e of entries||[]){const path=e.path_display||e.path||'';if(!path.startsWith(PROJECT_ROOT+'/'))continue;const id=path.slice(PROJECT_ROOT.length+1).split('/')[0];if(/^[a-z0-9][a-z0-9-]{5,99}$/.test(id))ids.set(id,{id,path:PROJECT_ROOT+'/'+id});}return [...ids.values()];
}
export function projectAssets(p){
 const result=[],paths=new Set();for(const a of p.assets||[]){if(a.path&&!paths.has(a.path)){result.push(a);paths.add(a.path);}for(const pass of [...(a.cutHistory||[]),a.cuts].filter(Boolean))for(const c of pass.clips||[]){if(c.path&&!paths.has(c.path)){result.push({...c,name:c.name||c.number+'.webm',role:'caption component',parent:a.id,cutPassVersion:cutPassVersion(a,pass)});paths.add(c.path);}}}return result;
}
export function preferredBed(p){return (p.assets||[]).find(a=>a.path===p.caplock?.media?.path)||(p.assets||[]).filter(a=>a.role==='bed').at(-1)||null;}
export function fitPortrait(width,height){const w=Math.max(0,Math.min(width,height*9/16));return {width:w,height:w*16/9};}

