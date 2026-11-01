/** Copy the complete queued list, independent of the visible/scrolling rows. */
export function cutListText({source,totalFrames,cuts,copiedAt=new Date().toISOString(),timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}){
 const clean=value=>String(value??'').replace(/[\t\r\n]+/g,' ').trim();
 const local=new Date(copiedAt).toLocaleString('en-US',{timeZone,dateStyle:'medium',timeStyle:'long'});
 const lines=['ClipLock · queued cut list','Source file: '+clean(source.name),'Source SHA-256: '+(source.sha256||'Not recorded'),'Source frames: '+totalFrames,'Copied: '+copiedAt,'Local date/time: '+local+' ('+timeZone+')','Cuts: '+cuts.length,'Frame convention: IN inclusive; OUT exclusive.','', '#\tJoke name\tIN frame\tOUT frame\tFrames'];
 for(const [i,c]of cuts.entries())lines.push([i+1,c.autoName?String(i+1):clean(c.name)||String(i+1),c.inFrame,c.outFrame,c.outFrame-c.inFrame].join('\t'));
 return lines.join('\n');
}
