'use client';
import {useEffect,useState} from 'react';
import {BookOpen,Clapperboard,Copy,ExternalLink,FlaskConical,Music2,Scissors,Sparkles} from 'lucide-react';
export default function Hub({staticMode=false}:{staticMode?:boolean}){
 const [message,setMessage]=useState(''),[custom,setCustom]=useState<Record<string,string>>({}),[toolName,setToolName]=useState('CapLock'),[toolURL,setToolURL]=useState('');
 const jokePath=staticMode?'./tools/jokelab/':'/jokelab/';
 useEffect(()=>{try{setCustom(JSON.parse(localStorage.getItem('toolsHub.links.v1')||'{}'));}catch{}const p=new URLSearchParams(location.hash.slice(1));if(['report','reportz','seed','seedz'].some(k=>p.has(k)))location.replace(jokePath+location.hash);},[jokePath]);
 async function copy(text:string){try{await navigator.clipboard.writeText(text);return true;}catch{const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.left='-10000px';document.body.appendChild(t);t.select();const ok=document.execCommand('copy');t.remove();if(!ok)setMessage('Clipboard unavailable. The prompt is shown below for manual copy.');return ok;}}
 const reportOrigin=()=>new URL(jokePath,location.href).href;
 const prompt=(kind:'seeds'|'analysis'|'longform')=>`JokeGen v1.2 — ${kind==='seeds'?'produce 25 seed jokes':kind==='analysis'?'analyze the joke I provide and produce 25 tone/tense variants':'develop long-form jokes from the seed I provide'}.
${kind==='seeds'?'Use simple dad-type deadpan humor and a variety of premises and mechanisms. Give 25 standalone base specimens, not 25 minor rewrites of one premise.':'Use the supplied specimen. If I have not supplied one, ask for it before generating.'}
Examine the setup, expectation, hinge and payoff. Explore adverbs, qualifiers, attribution and placement. Preserve the premise while allowing tone to shift implications. Keep spoken rhythm natural; shortest is not automatically best. Human and AI synthesize the humor together. Do not assign grades, rankings or winners. Stop speaking after the final punchline. Carry each treatment’s tone into script, voice and video directions.
${kind==='longform'?'Expand context, characters, narrative and escalation around the seed. Distinguish a faithful expansion from a new branch. Added words must serve the construction; do not explain the payoff.':''}
Present a readable report grouped by tone and labeled by tense. Include exact joke text and concise mechanism, rhythm and provenance notes. Originality is unverified unless established.
Finish with report JSON: {"schema":"JokeReport-1.0","id":"unique-batch-id","name":"batch name","source":"source specimen or seed-batch description","notes":"batch observations","variants":[{"id":"unique-id","text":"complete spoken joke","tone":"descriptive tone","tense":"Present tense","qualifier":"operator or none","notes":"mechanism, rhythm, provenance and performance directions"}]}.
Link each joke to ${reportOrigin()}#seed= followed by URL-safe base64 of UTF-8 JSON of the same report wrapper with exactly that one variant. Link the whole report with #report= and the full wrapper. If file creation is supported, supply a standalone HTML report and JSON file. Otherwise provide the JSON for Reports → Import. Never invent a hosted URL or claim the report was saved in the tools.
No separate AI API, paid generation service, automatic publishing or changes to the tools. Use this chat’s available capabilities. If actual credit telemetry is unavailable, do not invent a credit total.`;
 const [displayPrompt,setDisplayPrompt]=useState('');
 function launch(kind:'seeds'|'analysis'|'longform'){const p=prompt(kind);setDisplayPrompt(p);void copy(p).then(ok=>{if(ok)setMessage('Prompt copied. Paste in the ChatGPT tab to run it.');});window.open('https://chatgpt.com/','_blank','noopener,noreferrer');}
 function addLink(){try{const u=new URL(toolURL);if(u.protocol!=='https:')throw Error();const name=toolName.trim();if(!name)throw Error();const next={...custom,[name]:u.href};localStorage.setItem('toolsHub.links.v1',JSON.stringify(next));setCustom(next);setToolURL('');setMessage('Link added on this browser.');}catch{setMessage('Enter a tool name and a complete https:// address.');}}
 const tools=[
  {name:'ClipLock',version:'R1',desc:'Quick video cuts: mark IN/OUT, preview and save a separate clip.',href:'./tools/cliplock/?v=R1',icon:Scissors},
  {name:'CapLock',version:'R3',desc:'Transcript-first Gemini animation briefs and transparent media layers; optional native captions.',href:'./tools/caplock/',icon:Clapperboard},
  {name:'Sound Scrubber',version:'R14',desc:'Discover and review sounds: inline play, approve, reject and rename. Dropbox save with queued verified Drive mirror.',href:'./tools/sound-scrubber/',icon:Music2},
  {name:'SxLock',version:'R1.11',desc:'Frame-based sound placement and mixing.',href:'./tools/sxlock/',icon:Music2},
  {name:'WavLock',version:'R1.3',desc:'Precision audio cutting and reusable WAV export.',href:'./tools/wavlock/',icon:Scissors},
  {name:'JokeLab',version:'3.3',desc:'Edit a specimen. Choose tone and tense. Build a prompt and save the cluster.',href:jokePath,icon:FlaskConical},
  {name:'Joke reports',version:'1.0',desc:'Open a Chat-generated batch. Browse by tone and tense. Select a joke to work.',href:jokePath+'?view=reports',icon:BookOpen},
  {name:'FrameLock with AnchorLock',version:'1.3.12 + hub.1',desc:'Clean manual frame editor and correction notes. Load your video locally.',href:'./tools/framelock/index.html',icon:Scissors},
  {name:'MotionLock',version:'0.1.5 + hub.1',desc:'Set camera cuts, Z levels and B-roll events. Carry the edit plan back to ChatGPT.',href:'./tools/motionlock/index.html',icon:Clapperboard},
  {name:'Audio cue mixer',version:'2.3 + hub.1',desc:'Preview three audio layers against video. Export volumes, cues and fade settings.',href:'./tools/mixer/index.html',icon:Music2},
  ...(staticMode?[{name:'Vitals Tracker',version:'existing app',desc:'Open your existing Vitals Tracker at its original address. Its records remain at the same origin.',href:'../index.html',icon:BookOpen},{name:'Angel Code',version:'existing app',desc:'Open the Angel Code tool already hosted on your site.',href:'../AN/index.html',icon:Sparkles},{name:'Birthday Code',version:'existing app',desc:'Open the Birthday Code tool already hosted on your site.',href:'../BC/index.html',icon:Sparkles}]:[]),
 ];
 return <div className="hub"><header className="hub-top"><h1>Tools</h1><a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT <ExternalLink size={18}/></a></header><main>
 <nav className="hub-grid" aria-label="Tools">{tools.map(t=><a key={t.name} href={t.href}><t.icon size={20}/><span>{t.name==='FrameLock with AnchorLock'?'FrameLock':t.name}</span></a>)}{Object.entries(custom).map(([name,url])=><a key={name} href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={20}/><span>{name}</span></a>)}</nav>
 <div className="hub-starts" aria-label="ChatGPT prompts"><button onClick={()=>launch('seeds')}>25 seed jokes</button><button onClick={()=>launch('analysis')}>Analyze joke</button><button onClick={()=>launch('longform')}>Long-form joke</button></div>
 <details className="hub-options"><summary>Add tool link</summary><label>Name<input value={toolName} onChange={e=>setToolName(e.target.value)}/></label><label>Address<input type="url" value={toolURL} onChange={e=>setToolURL(e.target.value)} placeholder="https://…"/></label><button onClick={addLink}>Save link</button></details>
 {displayPrompt&&<details className="hub-options"><summary>Copy latest prompt</summary><textarea readOnly value={displayPrompt} rows={6} aria-label="Launch prompt"/><button onClick={async()=>{if(await copy(displayPrompt))setMessage('Copied. Paste in ChatGPT.');}}><Copy size={17}/>Copy</button></details>}
 </main>{message&&<div className="toast" role="status">{message}<button onClick={()=>setMessage('')} aria-label="Dismiss">×</button></div>}</div>;
}
