/* Audio navigation v1: reuse live same-origin tools without reloading editors. */
(() => {
 'use strict';
 const nav=document.querySelector('[data-audio-tool]');
 if(!nav)return;
 window.name='gs-audio-'+nav.dataset.audioTool;
 nav.addEventListener('click',event=>{
  const link=event.target.closest('a');
  if(!link||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const url=new URL(link.href,location.href);
  if(url.origin!==location.origin)return;
  const tab=window.open('',link.target);
  if(!tab)return;
  event.preventDefault();
  try{
   if(tab.location.href==='about:blank'||new URL(tab.location.href).pathname!==url.pathname)tab.location.href=url.href;
   tab.focus();
  }catch{tab.location.href=url.href;}
 });
})();
