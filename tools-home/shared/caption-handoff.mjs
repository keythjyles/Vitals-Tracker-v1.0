export const caplockTarget=name=>/^gs-caplock(?:-jokelets)?$/.test(name||'')?name:'gs-caplock';
export function returnCaptions(tab,{project,caption},base=location.href){
 const url=new URL('../caplock/?v=R15-workflow&project='+encodeURIComponent(project)+'&caption='+encodeURIComponent(caption),base);
 if(!tab){location.href=url.href;return;}
 try{if(tab.location.href!=='about:blank'&&new URL(tab.location.href).pathname===url.pathname&&tab.document.title.includes('R15')){tab.postMessage({protocol:'GS-CaptionReturn-1',project,caption},url.origin);tab.focus();return;}}catch{}
 tab.location.href=url.href;tab.focus();
}
