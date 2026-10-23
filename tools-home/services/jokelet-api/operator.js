import {CUES,cueText,silenceMarker,planScript,assemblePcm,encodeWav,SAMPLE_RATE} from './performance.js';
const $=id=>document.getElementById(id),status=message=>{$('status').textContent=message;};
let selection=[0,0],busy=false;
for(const event of ['select','keyup','click','input','blur']) $('script').addEventListener(event,()=>selection=[$('script').selectionStart,$('script').selectionEnd]);
function insert(value){
  const field=$('script'),[start,end]=selection,updated=field.value.slice(0,start)+value+field.value.slice(end);
  if(updated.length>1000)throw Error('Script exceeds 1000 characters.');
  field.value=updated;field.focus();field.setSelectionRange(start+value.length,start+value.length);selection=[start+value.length,start+value.length];
}
function action(id,fn){$(id).onclick=()=>{try{fn();}catch(e){status(e.message);}};}
for(const [label,cues] of Object.entries(CUES)){
  const group=document.createElement('optgroup');group.label=label;
  for(const cue of cues)group.append(new Option(cue,cue));$('cue').append(group);
}
action('insertCue',()=>insert(cueText($('cue').value)));
action('insertCustom',()=>insert(cueText($('customCue').value)));
action('insertSilence',()=>insert(silenceMarker($('silence').value)));
action('applyEmphasis',()=>{
  const text=$('script').value.slice(...selection);if(!text)throw Error('Select a word or phrase in the script first.');
  const mode=$('emphasis').value;insert(mode==='caps'?text.toUpperCase():text+(mode==='question'?'?':'!'));
});
const presetKey='gs-tested-performance-v1';let presets=[];
try{presets=JSON.parse(localStorage.getItem(presetKey)||'[]');if(!Array.isArray(presets))presets=[];}catch{}
function showPresets(){$('preset').replaceChildren(new Option('Choose a tested combination',''));presets.forEach((p,i)=>$('preset').append(new Option(p.name,String(i))));}
showPresets();
action('savePreset',()=>{
  planScript($('script').value);
  const name=prompt('Name this combination after listening to a successful take:');if(!name?.trim())return;
  presets.push({name:name.trim().slice(0,100),script:$('script').value,model:$('model').value,testedAt:new Date().toISOString()});
  localStorage.setItem(presetKey,JSON.stringify(presets));showPresets();status('Saved on this device. Preserve production files separately.');
});
action('loadPreset',()=>{const p=presets[$('preset').value];if(!p)return;if($('script').value&&!confirm('Replace the current script with this combination?'))return;$('script').value=p.script;$('model').value=p.model;selection=[0,0];});
async function call(path,options={}){
  const token=$('token').value.trim();if(!token)throw Error('Enter the private operator token.');
  const res=await fetch(path,{...options,headers:{...(options.headers||{}),Authorization:'Bearer '+token},cache:'no-store'});
  if(!res.ok){let detail='';try{const d=await res.json();detail=d.error||'';if(d.upstreamStatus)detail+=' (provider status '+d.upstreamStatus+')';}catch{}throw Error(detail||'Request failed: '+res.status);}return res;
}
$('load').onclick=async()=>{try{status('Loading voices…');const data=await(await call('/api/voices')).json();$('voice').replaceChildren(new Option('Select the approved GS voice',''));for(const v of data.voices)$('voice').append(new Option(v.name+' ('+v.category+')',v.voiceId));status(data.voices.length+' voices loaded. Select the approved GS identity.');}catch(e){status(e.message);}};
function link(parent,blob,filename,label){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.textContent=label;parent.append(a);return a;}
async function hash(blob){const b=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());return [...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('');}
$('generate').onclick=async()=>{
  if(busy)return;
  let plan;try{plan=planScript($('script').value);if(!$('voice').value)throw Error('Select an approved voice.');if(!$('token').value.trim())throw Error('Enter the private operator token.');}catch(e){status(e.message);return;}
  if(!confirm(`This take requires ${plan.requests} paid ElevenLabs request(s). Exact cost is unknown. The server permits at most three requests per process, including earlier takes. No automatic retries. Continue?`))return;
  busy=true;$('generate').disabled=true;
  const record={schema:'GS-VoiceJob-1',jobId:'VOICE-'+crypto.randomUUID(),createdAt:new Date().toISOString(),script:$('script').value,voiceId:$('voice').value,modelId:$('model').value,voiceSettings:'provider defaults',plan,attempts:[],approval:'Review',cost:{status:'unknown',actual:null},durableStorage:null};
  const card=document.createElement('article'),title=document.createElement('h3');title.textContent=record.jobId;card.append(title);$('takes').prepend(card);
  const note=document.createElement('p');card.append(note);
  let context;
  try{
    // Initialize decoder before making any paid call.
    context=new AudioContext({sampleRate:SAMPLE_RATE});await context.resume();
    const decoded=[];
    for(const part of plan.parts){
      if(part.type!=='speech')continue;
      const attempt={number:record.attempts.length+1,text:part.text,status:'requested',cost:'unknown'};record.attempts.push(attempt);status('Generating segment '+attempt.number+' of '+plan.requests+'…');
      const res=await call('/api/voice/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:part.text,voiceId:record.voiceId,modelId:record.modelId})});
      const blob=await res.blob(),filename=record.jobId+'-segment-'+attempt.number+'.mp3';
      link(card,blob,filename,'Save original segment '+attempt.number+' (MP3)');attempt.status='received';attempt.file=filename;attempt.sha256=await hash(blob);
      const audio=await context.decodeAudioData(await blob.arrayBuffer());
      if(audio.sampleRate!==SAMPLE_RATE)throw Error('Decoder sample rate mismatch; original retained.');
      // Preserve channel 0 for mono voice; reject unexpected multichannel rather than silently remix.
      if(audio.numberOfChannels!==1)throw Error('Unexpected multichannel voice. Original retained for explicit conversion.');
      decoded.push(audio.getChannelData(0));
    }
    const assembled=assemblePcm(plan,decoded),wav=new Blob([encodeWav(assembled.samples)],{type:'audio/wav'});
    const filename=record.jobId+'.wav';link(card,wav,filename,'Save PCM WAV for video');
    const player=document.createElement('audio');player.controls=true;player.src=URL.createObjectURL(wav);card.append(player);
    record.output={file:filename,sha256:await hash(wav),sampleRate:SAMPLE_RATE,channels:1,encoding:'PCM16',samples:assembled.samples.length,timeline:assembled.timeline};record.status='generated_review_required';
    note.textContent='Listen and compare. Not approved or durably archived.';status('Take assembled. Save WAV, every original MP3 and job record.');
  }catch(e){record.status='incomplete';record.error=e.message;note.textContent='Stopped: '+e.message+'. Completed originals are retained below. Check provider usage before starting another paid take.';status(note.textContent);}
  finally{
    if(context)await context.close().catch(()=>{});
    link(card,new Blob([JSON.stringify(record,null,2)],{type:'application/json'}),record.jobId+'.json','Save job record (JSON)');
    busy=false;$('generate').disabled=false;
  }
};
