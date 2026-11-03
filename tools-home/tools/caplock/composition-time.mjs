export function compositionFrames(project,bedFrames=0){return Math.max(0,bedFrames,...project.clips.filter(c=>c.visible&&(!c.captionNumber||c.placed)).map(c=>c.outFrame));}
export function bedTime(frame,videoEnd,fps=25){return Math.max(0,Math.min(frame/fps,Math.max(0,videoEnd-.000002)));}
export class TailClock{
 constructor(now=()=>performance.now()){this.now=now;this.running=false;}
 start(frame){this.anchor=frame;this.at=this.now();this.running=true;}
 current(fps=25){return this.anchor+(this.now()-this.at)/1000*fps;}
 stop(){this.running=false;}
}
