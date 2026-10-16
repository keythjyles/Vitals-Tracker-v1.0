import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),viteRequire=createRequire(require.resolve('vite'));
const esbuild=viteRequire('esbuild');
const root=path.resolve('github-pages');await fs.rm(root,{recursive:true,force:true});await fs.mkdir(root,{recursive:true});
await fs.cp('public/tools',path.join(root,'tools'),{recursive:true});await fs.cp('public/shared',path.join(root,'shared'),{recursive:true});
await fs.mkdir(path.join(root,'assets'),{recursive:true});await fs.copyFile('app/globals.css',path.join(root,'assets','style.css'));
// Styles use ordinary CSS. The sole Tailwind import is not needed for these components.
const css=(await fs.readFile(path.join(root,'assets','style.css'),'utf8')).replace('@import "tailwindcss";','');await fs.writeFile(path.join(root,'assets','style.css'),css);
await esbuild.build({entryPoints:['portal/hub-entry.tsx'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,jsx:'automatic',outfile:path.join(root,'assets','hub.js'),define:{'process.env.NODE_ENV':'"production"'}});
await esbuild.build({entryPoints:['portal/jokelab-entry.tsx'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,jsx:'automatic',outfile:path.join(root,'assets','jokelab.js'),define:{'process.env.NODE_ENV':'"production"'}});
const html=(title,base,script)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="stylesheet" href="${base}assets/style.css"></head><body><div id="root"></div><script type="module" src="${base}assets/${script}.js"></script></body></html>`;
await fs.writeFile(path.join(root,'index.html'),html('Tools Home','./','hub'));
await fs.mkdir(path.join(root,'tools','jokelab'),{recursive:true});await fs.writeFile(path.join(root,'tools','jokelab','index.html'),html('JokeLab','../../','jokelab'));
await fs.copyFile('tools-manifest.json',path.join(root,'tools-manifest.json'));await fs.writeFile(path.join(root,'.nojekyll'),'');
await fs.writeFile(path.join(root,'README.txt'),'Tools Home v1.0 — GitHub Pages static bundle\n\nPublish this directory to a separate tools path or repository. Do not overwrite an existing Vitals Tracker or its storage paths. All asset paths are relative. No generation API or secret is included. JokeLab saves here are browser-local, unlike the existing authenticated Sites deployment; download saved clusters for portability. No old data is migrated automatically.\n\nTools: JokeLab 3.3, report reader 1.0, FrameLock 1.3.12+hub.1, MotionLock 0.1.5+hub.1, audio cue mixer 2.3+hub.1. Imported tool source versions and hashes are recorded in tools-manifest.json.\n\nEach Export to ChatGPT button copies the current handoff and opens ChatGPT; paste and submit there. No selected conversation can be guaranteed. Binary media is not attached by a text link.\n\nCapLock, Angel Code and Birthday Code sources were not located. Add their actual hosted URLs from the home page once identified. The existing Vitals Tracker remains at its own original origin.\n');
console.log('Built portable GitHub Pages bundle:',root);
