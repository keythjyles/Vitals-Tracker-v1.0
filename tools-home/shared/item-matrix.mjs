/* Read-only placement map; seeking is delegated to the editor and never plays. */
export function matrixFrame(clientX,rect,end){
 return Math.max(0,Math.min(end,Math.round((clientX-rect.left)/Math.max(1,rect.width)*end)));
}
export function paintMatrix(canvas,items,frame,end,selected=''){
 end=Math.max(1,end,...items.map(c=>c.outFrame));
 const key=JSON.stringify([frame,end,selected,items.map(c=>[c.id,c.inFrame,c.outFrame,c.visible])]);
 if(canvas._matrixKey===key)return;canvas._matrixKey=key;
 const w=1000,h=Math.max(80,28+items.length*20);canvas.width=w;canvas.height=h;canvas.style.height=Math.min(150,h)+'px';
 const g=canvas.getContext('2d');g.clearRect(0,0,w,h);g.font='14px system-ui';
 for(let i=0;i<=5;i++){const x=i*w/5;g.fillStyle='#8fa9be';g.fillText('F'+Math.round(end*i/5),Math.min(w-65,x+3),17);g.fillStyle='#34495b';g.fillRect(x,23,1,h-23);}
 items.forEach((c,i)=>{g.fillStyle=c.id===selected?'#ffda8a':c.visible===false?'#52697c':'#91c5e5';g.fillRect(c.inFrame/end*w,28+i*20,Math.max(3,(c.outFrame-c.inFrame)/end*w),15);});
 g.fillStyle='#fff';g.fillRect(Math.min(w-2,frame/end*w),22,2,h-22);
 canvas.setAttribute('aria-valuemax',String(end));canvas.setAttribute('aria-valuenow',String(frame));canvas.dataset.endFrame=String(end);
}
