/* Shared classification: instant metadata fallback, AI enrichment, owner overrides. */
(() => {
 'use strict';
 const clean=s=>String(s||'').normalize('NFKC').replace(/[\u0000-\u001f<>]/g,' ').trim();
 const words=value=>[...new Set((Array.isArray(value)?value:String(value||'').split(',')).map(v=>clean(v).slice(0,80)).filter(Boolean))].slice(0,40);
 const rules=[
  ['Animals & nature','Insects',/\b(crickets?|acheta|gryll\w*|stridulat\w*)\b/i,['cricket','crickets','insect','chirping','stridulation']],
  ['Animals & nature','Insects',/\b(insects?|cicadas?|katydids?|cystosoma)\b/i,['insect','chirping']],
  ['Animals & nature','Bees',/\b(bees?|beehive|bumblebee|apis|buzzing)\b/i,['bee','bees','buzz','insect']],
  ['Animals & nature','Birds',/\b(birds?|roosters?|hens?|chickens?|ducks?|geese|goose|gulls?|crows?|ravens?|starlings?|sturnus|gallus|anser|anas|quack\w*|crowing)\b/i,['bird','birds','animal']],
  ['Animals & nature','Frogs',/\b(frogs?|toads?|croak\w*)\b/i,['frog','frogs','croak','animal']],
  ['Animals & nature','Mammals',/\b(dogs?|bark\w*|cats?|meow\w*|sheep|lambs?|pigs?|piglets?|squeal\w*|horses?|deer|giraffe|snort\w*|cows?|moo\w*)\b/i,['animal','mammal']],
  ['Aircraft','Helicopters & drones',/\b(helicopter\w*|chinook|rotor\w*|quadcopter\w*|drone\w*)\b/i,['aircraft','rotor']],
  ['Aircraft','Planes',/\b(jets?|aircraft|airplanes?|aeroplanes?|propeller\w*|airbus|boeing)\b/i,['aircraft','plane','flight']],
  ['Cars & engines','Engines & driving',/\b(cars?|engines?|motors?|mercedes|audi|exhaust|brak\w*|tires?|tyres?|vehicles?|motorcycles?)\b/i,['vehicle','car','engine']],
  ['Human reactions','Body & voice',/\b(cough\w*|sneez\w*|sniff\w*|yawn\w*|laugh\w*|chuckl\w*|giggl\w*|burp\w*|belch\w*|fart\w*|throat|applause|oops|aww|awe|gasp\w*|scream\w*)\b/i,['human','reaction']],
  ['Weather & ambience','Weather & water',/\b(rain\w*|thunder\w*|wind|storm\w*|water|waves?|ocean|river|fountain\w*|fire|crackle|ambien\w*|night)\b/i,['ambience','environment']],
  ['Bells & gongs','Bells',/\b(bells?|gongs?|chimes?)\b/i,['bell','gong','ring']],
  ['Drums & cymbals','Percussion',/\b(drums?|cymbals?|snare|rimshot|ba dum|badum)\b/i,['drum','percussion']],
  ['Music','Music',/\b(music|song|singers?|singing|piano|guitar|violin|waltz|vals)\b/i,['music']],
  ['Household & foley','Objects & machinery',/\b(door\w*|footstep\w*|machine\w*|sewing|embroidery|fireworks?|explosion\w*|glass|metal|click\w*)\b/i,['foley','object']]
 ];
 function normalize(value){
  if(!value||value.schema!==1||!clean(value.category)||clean(value.category).length>80||!['owner','ai-metadata-v1','metadata-rules-v1'].includes(value.method))return null;
  return {...value,category:clean(value.category),subcategory:clean(value.subcategory).slice(0,80),tags:words(value.tags),aliases:words(value.aliases)};
 }
 function infer(v){
  const text=[v.name,v.originalName,v.description,v.category,...words(v.tags),...words(v.aliases),v.searchTerms].filter(Boolean).join(' ').replace(/[_-]/g,' ');
  const primary=String(v.name||'').replace(/[_-]/g,' '),hit=rules.find(r=>r[2].test(primary))||rules.find(r=>r[2].test(text)),category=hit?.[0]||((v.category&&v.category!=='Approved effects')?v.category:'Other sounds');
  const tokens=clean(text.replace(/\.(ogg|oga|opus|wav|mp3|flac|m4a)\b/gi,'')).toLowerCase().match(/[\p{L}]{3,}/gu)||[];
  return {schema:1,category,subcategory:hit?.[1]||'',tags:words([...words(v.tags),...(hit?.[3]||[]),...tokens]),aliases:words(v.aliases),method:'metadata-rules-v1'};
 }
 function classify(v){return normalize(v.classification)||infer(v)}
 function enrich(v){const c=classify(v);return {...v,classification:c,category:c.category,subcategory:c.subcategory,tags:words([...c.tags,...c.aliases,c.subcategory]),aliases:c.aliases}}
 window.GSEffectClassification={classify,enrich,normalize};
})();
