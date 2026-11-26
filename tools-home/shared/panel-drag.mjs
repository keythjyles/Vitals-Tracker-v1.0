// Drag a floating settings card by its heading; keep controls and content scrolling native.
export function mountPanelDrag(panel, handle) {
 if (!panel || !handle) return;
 let drag = null, positioned = false;
 const grip=document.createElement('span');
 grip.className='gs-panel-grip';grip.textContent='⠿';grip.tabIndex=0;grip.setAttribute('role','button');
 grip.setAttribute('aria-label','Move panel with arrow keys or drag');handle.prepend(grip);
 handle.style.touchAction = 'none';
 handle.style.cursor = 'move';
 handle.title = 'Drag to move panel';
 const viewport = window.visualViewport;
 const bounds = () => ({left:viewport?.offsetLeft||0, top:viewport?.offsetTop||0,
  width:viewport?.width||innerWidth, height:viewport?.height||innerHeight});
 function place(left, top) {
  const b=bounds(), r=panel.getBoundingClientRect();
  panel.style.position='fixed';panel.style.inset='auto';panel.style.margin='0';
  panel.style.left=Math.max(b.left+4,Math.min(left,b.left+b.width-r.width-4))+'px';
  panel.style.top=Math.max(b.top+4,Math.min(top,b.top+b.height-Math.min(r.height,b.height-8)-4))+'px';
  panel.style.maxHeight=Math.max(100,b.top+b.height-parseFloat(panel.style.top)-4)+'px';
 }
 handle.addEventListener('pointerdown',e=>{
  if(e.button!==0 || drag || e.target.closest('button,input,select,textarea,a,summary'))return;
  const r=panel.getBoundingClientRect();
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};
  // Freeze the responsive width before dropping the automatic insets.
  panel.style.width=r.width+'px';
  positioned=true;place(r.left,r.top);try{handle.setPointerCapture(e.pointerId);}catch{}e.preventDefault();
 });
 handle.addEventListener('pointermove',e=>{
  if(drag?.id!==e.pointerId)return;
  place(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);e.preventDefault();
 });
 grip.addEventListener('keydown',e=>{
  const step={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];
  if(!step)return;
  e.preventDefault();e.stopPropagation();const r=panel.getBoundingClientRect();
  panel.style.width=r.width+'px';positioned=true;place(r.left+step[0],r.top+step[1]);
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,e=>{
  if(drag?.id===e.pointerId)drag=null;
 });
 const resize=()=>{if(panel.open&&positioned){const r=panel.getBoundingClientRect();panel.style.width=Math.min(r.width,bounds().width-8)+'px';place(r.left,r.top);}};
 window.addEventListener('resize',resize);viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize);
 function reset(){
  drag=null;positioned=false;
  for(const key of ['position','inset','margin','left','top','width','maxHeight'])panel.style[key]='';
 }
 panel.addEventListener('beforetoggle',e=>{if(e.newState==='closed')reset();});
 panel.addEventListener('close',()=>{if(!panel.open)reset();});
 return reset;
}
