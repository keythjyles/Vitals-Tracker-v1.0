import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import vm from 'node:vm';
const manifest=JSON.parse(await fs.readFile('tools-manifest.json','utf8'));
for(const tool of manifest.tools){
 const original=await fs.readFile(tool.source_preserved);
 assert.equal(crypto.createHash('sha256').update(original).digest('hex'),tool.source_sha256,'Original tool retained unchanged');
 const text=await fs.readFile('github-pages/'+tool.hosted_path,'utf8');
 for(const match of text.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)){if(match[1].trim())new vm.Script(match[1],{filename:tool.tool});}
 assert(text.includes('window.toolsHubState='),'Tool exports actual current state');
 assert(text.includes('../../shared/tool-bridge.js?v=1.0'),'Shared bridge included');
 assert(!/data:(video|audio)\//.test(text),'No media embedded in hosted tool');
}
const bridge=await fs.readFile('public/shared/tool-bridge.js','utf8');new vm.Script(bridge);
assert(bridge.includes("window.open('https://chatgpt.com/'"));assert(bridge.includes("'handoff'"));
assert.equal((await fs.readFile('github-pages/assets/style.css','utf8')).includes('@import "tailwindcss"'),false);
for(const file of ['index.html','tools/jokelab/index.html','tools/framelock/index.html','tools/motionlock/index.html','tools/mixer/index.html','assets/hub.js','assets/jokelab.js','shared/tool-bridge.js'])assert((await fs.stat('github-pages/'+file)).isFile());
const source=await fs.readFile('app/workbench.tsx','utf8');assert(source.includes("if(localOnly)"));assert(source.includes('Export to ChatGPT'));
console.log('PASS: source hashes, imported editor JavaScript syntax, state adapters, shared export/import controls, relative static asset layout, no embedded media.');
