import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=await fs.readFile(new URL('../app/jokelab.ts',import.meta.url),'utf8');
const bundle=await fs.readFile(new URL('../../assets/jokelab.js',import.meta.url),'utf8');
const policy=JSON.parse(source.match(/export const OPERATOR_INSTRUCTIONS=(.*);\n/)[1]);
const version=source.match(/PROMPT_VERSION='([^']+)'/)[1];
let fn=source.slice(source.indexOf('export function buildPrompt('),source.indexOf('export function parseCandidates('));
fn=fn.replace(/export function buildPrompt\([^\n]+\):string \{/,"function buildPrompt(joke,notes,s,active=null,run='JL-'+new Date().toISOString()) {");
const sourceBuild=new Function('OPERATOR_INSTRUCTIONS','PROMPT_VERSION','TONES',fn+';return buildPrompt;')(policy,version,[]);
const compiled=bundle.slice(bundle.indexOf('function Em('),bundle.indexOf('function Um('));
const bundleBuild=new Function('GS_JL_OPERATOR_INSTRUCTIONS','no','_f',compiled+';return Em;')(policy,version,[]);
const text='Exact source\n“Words stay unchanged.”';
const settings={stage:'script',locked:false,tones:[],count:1,performer:'GS',customTone:'restrained',toneNotes:'Final silence',source:'test source',tense:'Keep source tense',qualifiers:''};
for(const stage of ['script','voice','video','package']){
 const opts={...settings,stage};const a=sourceBuild(text,'Source notes',opts,null,'test-run'),b=bundleBuild(text,'Source notes',opts,null,'test-run');
 assert.equal(a,b,'source and portable bundle must agree for '+stage);
 assert(a.includes('Direct production')&&a.includes(JSON.stringify(text)));
 assert(!a.includes('METHOD\n1.')&&!a.includes('Then a compact analysis per treatment'));
 for(const rule of ['canonical joke','counts as produced','voice-only','burned captions','exact cued script','each original ambient','pause at each meaningful stage','Missing references must be explicit'])assert(a.includes(rule),rule);
 assert(a.includes('Do not assert a completed duplicate check'));
}
const study={...settings,stage:'joke',count:3};
assert.equal(sourceBuild(text,'',study,null,'study'),bundleBuild(text,'',study,null,'study'));
assert(bundleBuild(text,'',study,null,'study').includes('Optional craft study'));
assert(bundleBuild(text,'',{...study,locked:true},null,'locked').includes('Direct production'));
assert.throws(()=>bundleBuild(' ','',settings));
assert(source.includes("count:1,stage:'script'"));
assert(bundle.includes('count:1,stage:"script"'));
console.log('PASS: source/bundle prompt parity; direct script/voice/video/package; optional study; wording lock; source integrity, duplicate, coaching and spending rules; direct-production defaults.');
