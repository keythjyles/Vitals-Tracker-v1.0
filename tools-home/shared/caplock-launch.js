/* CapLock navigation R1. Navigation only: no source or project mutation. */
(()=>{
 const nav=document.createElement('nav');nav.setAttribute('aria-label','Caption production tools');
 nav.style.cssText='display:flex;justify-content:flex-end;flex-wrap:wrap;gap:4px;padding:5px;font:12px system-ui';
 for(const [name,url,target] of [['CapLock','../caplock/','gs-caplock'],['AspectLock','../aspectlock/','gs-aspectlock'],['SxLock','../sxlock/','gs-audio-sxlock'],['PreviewLock','../previewlock/cloud-test.html','gs-previewlock'],['Tools','../../','gs-audio-tools']]){
  const a=document.createElement('a');a.href=url;a.target=target;a.textContent=name;a.style.cssText='display:inline-flex;align-items:center;min-height:44px;padding:5px 8px;color:#ffda8a;background:#20364b;border:1px solid #59738a;border-radius:5px;text-decoration:none';nav.append(a);
 }
 nav.addEventListener('click',event=>{const a=event.target.closest('a');if(!a||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const tab=window.open('',a.target);if(!tab)return;event.preventDefault();try{if(tab.location.href==='about:blank'||new URL(tab.location.href).pathname!==new URL(a.href).pathname)tab.location.href=a.href;tab.focus();}catch{tab.location.href=a.href;}});
 const anchor=document.querySelector('#editorDock,.stageWorkspace')||document.querySelector('header');
 if(anchor)anchor.after(nav);else (document.querySelector('main')||document.body).append(nav);
})();
