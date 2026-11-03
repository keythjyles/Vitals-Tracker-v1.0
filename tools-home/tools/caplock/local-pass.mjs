export function passFilename(name='Video.mp4'){
 const stem=String(name).replace(/\.[^.]+$/,'').replace(/[\\/<>:"|?*\x00-\x1f]/g,'_')||'Video',match=/^(.*)_CapLock_pass_(\d+)$/i.exec(stem);
 return (match?match[1]:stem)+'_CapLock_pass_'+String(match?Number(match[2])+1:1).padStart(2,'0')+'.mp4';
}
export function matchLocalFile(files,ref){return ref?.kind==='local'?[...files].find(f=>f.name===ref.name&&f.size===ref.size):undefined;}
export function localPassKey(project,bedUrl,media,recipe){
 return JSON.stringify({recipe,bed:bedUrl,layers:project.clips.filter(c=>c.visible&&(!c.captionNumber||c.placed)).map(c=>[c.id,media.get(c.id)?.url||null])});
}
