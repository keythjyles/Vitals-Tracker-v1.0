const $=id=>document.getElementById(id),API='https://gs-previewlock-api.onrender.com',DRAFT='gs-collaboration-owner-draft-v1';
const key=()=>localStorage.getItem('gs_previewlock_key')||'';
let loading=false,sending=false,requestId=null,currentText='',lastSignature='',mediaSignature='';
try{$('opinion').value=localStorage.getItem(DRAFT)||''}catch{}
$('opinion').addEventListener('input',()=>{try{localStorage.setItem(DRAFT,$('opinion').value)}catch{};if($('opinion').value!==currentText)requestId=null});
async function api(path,options={}){if(!key())throw Error('Not sent. Your draft is kept here; use the browser with your existing PreviewLock connection.');const r=await fetch(API+path,{...options,headers:{authorization:'Bearer '+key(),...options.headers}});const data=await r.json();if(!r.ok)throw Error(data.error||'Connection unavailable');return data}
function card(event){const a=document.createElement('article'),h=document.createElement('h2'),p=document.createElement('pre');h.textContent=event.author+' · '+event.stage;p.textContent=event.text;a.append(h,p);if(event.at){const time=document.createElement('small');time.textContent=new Date(event.at).toLocaleString();a.append(time)}return a}
function showMedia(saved,live){
 const assets=[...(saved.media||[])];for(const e of live?.events||[])if(e.output?.verifiedReadback)assets.unshift({id:e.id,name:e.id+' · original',kind:'video',dropboxPath:e.output.path,status:'Generated candidate · not approved'});
 const signature=JSON.stringify(assets);if(signature===mediaSignature)return;mediaSignature=signature;$('media-items').replaceChildren();
 for(const asset of assets){const row=document.createElement('div');row.className='media-row';const name=document.createElement('p');name.textContent=asset.name+' · '+asset.status;const controls=document.createElement('div');controls.className='media-actions';const play=document.createElement('button'),download=document.createElement('button');play.textContent='Play';download.textContent='Original';const message=document.createElement('small');let player;
  const resolve=async()=>asset.url||((await api('/api/playback?path='+encodeURIComponent(asset.dropboxPath))).url);
  play.onclick=async()=>{play.disabled=true;try{if(!player){player=document.createElement(asset.kind==='audio'?'audio':'video');player.controls=true;player.playsInline=true;if(asset.alpha)player.className='alpha-preview';row.append(player)}player.src=await resolve();await player.play()}catch(e){message.textContent=e.message}finally{play.disabled=false}};
  download.onclick=async()=>{download.disabled=true;try{const url=await resolve();const r=await fetch(url);if(!r.ok)throw Error('Original file could not be retrieved');const blob=await r.blob(),local=URL.createObjectURL(blob),a=document.createElement('a');a.href=local;a.download=asset.filename||asset.name;a.click();setTimeout(()=>URL.revokeObjectURL(local),60000);message.textContent='Original file handed to your browser'}catch(e){message.textContent=e.message}finally{download.disabled=false}};
  if(['audio','video'].includes(asset.kind))controls.append(play);controls.append(download);row.append(name,controls,message);$('media-items').append(row);
 }
 if(!assets.length)$('media-items').textContent='No generated media yet.';
}
function show(saved,live,notes){
 showMedia(saved,live);
 const events=[...(saved.transcript||[])],seen=new Set(events.map(e=>e.providerEventId).filter(Boolean));
 const knownTimes=(live?.events||[]).filter(e=>seen.has(e.id)).map(e=>Date.parse(e.at)||0),boundary=Math.max(0,...knownTimes),history=[];
 for(const e of live?.events||[]){if(seen.has(e.id))continue;const event={author:'Gemini',stage:e.id+' · '+e.state,text:e.response||e.providerErrorMessage||(e.providerError?JSON.stringify(e.providerError):null)||e.error||'Request saved; waiting for result',at:e.completedAt||e.at};(Date.parse(e.at)<boundary?history:events).push(event)}
 for(const n of notes){const addressed=saved.architectNotesAddressed?.includes(n.id),item={author:'Architect',stage:addressed?'Direction · addressed':'Direction · awaiting AI review',text:n.text,at:n.at};const index=events.findIndex(e=>e.sourceNoteId===n.id||(e.author==='Architect'&&e.at===n.at));if(index>=0)events[index]=item;else events.push(item)}
 const ordered=events.reverse();
 const signature=JSON.stringify({ordered,history});if(signature!==lastSignature){lastSignature=signature;const y=scrollY;$('events').replaceChildren(...ordered.map(card));$('history').replaceChildren(...history.reverse().map(card));if(y>100)window.scrollTo({top:y})}
 $('status').textContent=live?'Live saved discussion · '+(live.events.at(-1)?.state||'ready'):'Saved checkpoint · '+saved.state;
 const reserved=live?live.events.reduce((n,e)=>n+e.reservedUsd,0):saved.reservedUsd||0;
 $('budget').textContent='$5 cap · $'+reserved.toFixed(2)+' reserved · actual charges not yet reconciled';
}
async function load(){if(loading)return;loading=true;$('refresh').disabled=true;try{const r=await fetch('runs/GS-GEMINI-20261029-01.project.json',{cache:'no-store'});if(!r.ok)throw Error('Project checkpoint unavailable');const saved=await r.json();let live=null,notes=[];if(key()){const results=await Promise.allSettled([api('/api/gemini-experiment'),api('/api/gemini-owner-notes')]);if(results[0].status==='fulfilled')live=results[0].value.experiment;if(results[1].status==='fulfilled')notes=results[1].value.notes||[];}show(saved,live,notes)}catch(e){$('status').textContent=e.message}finally{loading=false;$('refresh').disabled=false}}
$('send').onclick=async()=>{if(sending)return;const text=$('opinion').value.trim();if(!text)return;$('note-status').textContent='Sending…';sending=true;$('send').disabled=true;try{if(!requestId||currentText!==text){requestId=crypto.randomUUID();currentText=text}const result=await api('/api/gemini-owner-notes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:requestId,text})});if(!result.persisted)throw Error('Save not verified');if($('opinion').value.trim()===text){$('opinion').value='';try{localStorage.removeItem(DRAFT)}catch{}}requestId=null;$('note-status').textContent='Sent · saved for the next AI review';await load()}catch(e){$('note-status').textContent=e.message}finally{sending=false;$('send').disabled=false}};
$('refresh').onclick=async()=>{await load();window.scrollTo({top:0,behavior:'smooth'})};load();const observer=setInterval(()=>{if(!document.hidden)load()},15000);window.addEventListener('pagehide',()=>clearInterval(observer));
