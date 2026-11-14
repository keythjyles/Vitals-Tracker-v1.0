function hex(hue,saturation,value) {
 const h=(hue+360)%360;
 const c=value*saturation;
 const x=c*(1-Math.abs((h/60)%2-1));
 const m=value-c;
 const [r,g,b]=[[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(h/60)];
 return '#'+[r,g,b].map(channel=>Math.round((channel+m)*255).toString(16).padStart(2,'0')).join('');
}

function hsv(color) {
 const [r,g,b]=[1,3,5].map(index=>parseInt(color.slice(index,index+2),16)/255);
 const max=Math.max(r,g,b),delta=max-Math.min(r,g,b);
 if(!delta)return[0,0,max];
 let hue;
 if(max===r)hue=(g-b)/delta;
 else if(max===g)hue=2+(b-r)/delta;
 else hue=4+(r-g)/delta;
 return[(hue*60+360)%360,delta/max,max];
}


export function addColorWheel(input) {
 const open = document.createElement('button');
 open.type = 'button';
 open.textContent = 'Color wheel';
 open.setAttribute('aria-haspopup','dialog');
 input.parentElement.after(open);

 const dialog = document.createElement('dialog');
 dialog.className = 'gs-color-picker';
 dialog.setAttribute('aria-label','Background color wheel');
 dialog.innerHTML = '<header><strong>Background color</strong><button type="button" data-wheel-close>Done</button></header><div class="gs-wheel-area"><canvas width="232" height="232" tabindex="0" role="group" aria-label="Color wheel. Left and right change hue. Up and down change saturation."></canvas><span aria-hidden="true"></span></div><label>Brightness <input type="range" min="0" max="100" value="100" data-gs-continuous></label><label>Hex <input type="text" maxlength="7" aria-label="Background hex color"></label>';
 document.body.append(dialog);

 const canvas = dialog.querySelector('canvas');
 const context = canvas.getContext('2d');
 const pointer = dialog.querySelector('.gs-wheel-area span');
 const brightness = dialog.querySelector('input[type=range]');
 const exact = dialog.querySelector('input[type=text]');
 let color;
 let initial;
 let paintedValue;

 function update(apply = false) {
  const [hue,saturation,value] = color;
  const r = canvas.width / 2;
  if (paintedValue !== value) {
   context.clearRect(0,0,canvas.width,canvas.height);
   context.save();
   context.beginPath();
   context.arc(r,r,r-1,0,Math.PI*2);
   context.clip();
   const hueGradient = context.createConicGradient(0,r,r);
   for(let step=0;step<=6;step++) hueGradient.addColorStop(step/6,hex(step*60,1,value));
   context.fillStyle=hueGradient;
   context.fillRect(0,0,canvas.width,canvas.height);
   const neutral = context.createRadialGradient(r,r,0,r,r,r);
   neutral.addColorStop(0,hex(0,0,value));
   neutral.addColorStop(1,hex(0,0,value)+'00');
   context.fillStyle=neutral;
   context.fillRect(0,0,canvas.width,canvas.height);
   context.restore();
   paintedValue=value;
  }
  const angle=hue*Math.PI/180;
  pointer.style.left=(50+49*saturation*Math.cos(angle))+'%';
  pointer.style.top=(50+49*saturation*Math.sin(angle))+'%';
  brightness.value=Math.round(value*100);
  exact.value=hex(...color);
  if(apply && input.value!==exact.value){
   input.value=exact.value;
   input.dispatchEvent(new Event('input',{bubbles:true}));
  }
 }
 function choose(event) {
  const {left,top,width,height}=canvas.getBoundingClientRect();
  const x=(event.clientX-left)*2/width-1, y=(event.clientY-top)*2/height-1;
  color[0]=(Math.atan2(y,x)*180/Math.PI+360)%360;
  color[1]=Math.min(1,Math.hypot(x,y));
  if(color[2]===0)color[2]=1;
  update(true);
 }
 open.onclick=()=>{
  if(input.disabled)return;
  initial=input.value;
  color=hsv(initial);
  update();
  dialog.showModal();
  canvas.focus();
 };
 const locked = () => { open.disabled=input.disabled; };
 new MutationObserver(locked).observe(input,{attributes:true,attributeFilter:['disabled']});
 locked();
 canvas.onpointerdown=event=>{canvas.setPointerCapture(event.pointerId);choose(event);};
 canvas.onpointermove=event=>{if(canvas.hasPointerCapture(event.pointerId))choose(event);};
 canvas.onkeydown=event=>{
  const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
  if(!keys.includes(event.key))return;
  event.preventDefault();
  if(event.key==='ArrowLeft'||event.key==='ArrowRight')color[0]=(color[0]+(event.key==='ArrowLeft'?355:5))%360;
  else color[1]=Math.max(0,Math.min(1,color[1]+(event.key==='ArrowDown'?-.05:.05)));
  update(true);
 };
 brightness.oninput=()=>{color[2]=Number(brightness.value)/100;update(true);};
 exact.onchange=()=>{
  if(!/^#[0-9a-f]{6}$/i.test(exact.value)){exact.value=hex(...color);return;}
  color=hsv(exact.value);
  update(true);
 };
 dialog.querySelector('[data-wheel-close]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{
  if(input.value!==initial)input.dispatchEvent(new Event('change',{bubbles:true}));
 });
}
