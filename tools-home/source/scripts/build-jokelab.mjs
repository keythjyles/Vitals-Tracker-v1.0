// Build only JokeLab. Never regenerate entry HTML or overwrite adjacent tools.
import {createRequire} from 'node:module';import path from 'node:path';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),esbuild=require(process.env.ESBUILD_MODULE||'esbuild');const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
await esbuild.build({absWorkingDir:root,entryPoints:['tools-home/source/portal/jokelab-entry.tsx'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,jsx:'automatic',outfile:'tools-home/assets/jokelab.js',nodePaths:process.env.JOKELAB_NODE_MODULES?[process.env.JOKELAB_NODE_MODULES]:[],define:{'process.env.NODE_ENV':'"production"'}});
