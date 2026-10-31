const validVersion=n=>Number.isSafeInteger(n)&&n>0;
export function cutPassVersion(asset,pass=asset?.cuts){
 if(!pass)return 1;if(validVersion(pass.version))return pass.version;
 const all=[...(asset?.cutHistory||[]),asset?.cuts].filter(Boolean),index=all.indexOf(pass);return index<0?1:index+1;
}
export function nextCutPassVersion(asset){
 const all=[...(asset?.cutHistory||[]),asset?.cuts].filter(Boolean);
 return Math.max(0,...all.map((p,i)=>validVersion(p.version)?p.version:i+1))+1;
}
export function captionCutLabel(asset){
 if(asset?.cutPassVersion)return 'Clip · v'+asset.cutPassVersion;
 if(asset?.role!=='caption'&&!asset?.cuts)return '';
 const current=asset.cuts,history=(asset.cutHistory||[]).filter(p=>p.status==='complete');
 if(!current)return history.length?'Cut · v'+cutPassVersion(asset,history.at(-1)):'Uncut';
 const version=cutPassVersion(asset),count=current.clips?.length||0;
 if(current.status==='complete')return 'Cut · v'+version+' · '+count+' clips';
 if(current.status==='running')return 'Cutting · v'+version;
 if(current.status==='failed')return 'Cut incomplete · v'+version;
 return 'Draft · v'+version+(history.length?' · v'+cutPassVersion(asset,history.at(-1))+' cut':'');
}
