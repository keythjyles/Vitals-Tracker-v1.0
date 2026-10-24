import {createPublicKey,verify} from 'node:crypto';
const issuer='https://token.actions.githubusercontent.com';
export const AI_AUDIENCE='https://jokelet-api.onrender.com/ai-preflight';
export const REPOSITORY='keythjyles/Vitals-Tracker-v1.0';
const workflow=REPOSITORY+'/.github/workflows/jokelet-preflight.yml@refs/heads/main';
let cachedKeys,keysUntil=0;
async function githubKeys(){
  if(cachedKeys&&Date.now()<keysUntil)return cachedKeys;
  const r=await fetch(issuer+'/.well-known/jwks',{signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!r.ok)throw Error('Identity keys unavailable');
  const data=await r.json();if(!Array.isArray(data.keys))throw Error('Invalid identity keys');
  cachedKeys=data.keys;keysUntil=Date.now()+300000;return cachedKeys;
}
// This identity grants read-only preflight only. Never use it for paid routes.
export async function verifyGithubIdentity(authorization,{getKeys=githubKeys,now=Math.floor(Date.now()/1000)}={}){
  if(typeof authorization!=='string'||!authorization.startsWith('Bearer ')||authorization.length>16000)throw Error('Unauthorized');
  const jwt=authorization.slice(7),pieces=jwt.split('.');
  if(pieces.length!==3||pieces.some(s=>!s||!/^[a-zA-Z0-9_-]+$/.test(s)))throw Error('Unauthorized');
  const header=JSON.parse(Buffer.from(pieces[0],'base64url').toString());
  if(header.alg!=='RS256'||header.typ!=='JWT'||typeof header.kid!=='string'||header.crit!==undefined)throw Error('Unauthorized');
  const jwk=(await getKeys()).find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
  if(!jwk||!verify('RSA-SHA256',Buffer.from(pieces[0]+'.'+pieces[1]),createPublicKey({key:jwk,format:'jwk'}),Buffer.from(pieces[2],'base64url')))throw Error('Unauthorized');
  const p=JSON.parse(Buffer.from(pieces[1],'base64url').toString());
  const subjects=[`repo:${REPOSITORY}:ref:refs/heads/main`,'repo:keythjyles@251250579/Vitals-Tracker-v1.0@1122008805:ref:refs/heads/main'];
  if(p.iss!==issuer||p.aud!==AI_AUDIENCE||!subjects.includes(p.sub)||p.repository!==REPOSITORY||p.repository_id!=='1122008805'||p.repository_owner_id!=='251250579'||p.ref!=='refs/heads/main'||p.event_name!=='push'||p.workflow_ref!==workflow||p.runner_environment!=='github-hosted')throw Error('Unauthorized');
  if(!['exp','iat','nbf'].every(k=>Number.isSafeInteger(p[k]))||p.exp<=now||p.nbf>now+10||p.iat>now+10||p.iat<now-600||p.exp-p.iat>600||p.exp<=p.iat)throw Error('Unauthorized');
  if(typeof p.sha!=='string'||!/^[a-f0-9]{40}$/.test(p.sha)||p.workflow_sha!==p.sha||!/^\d+$/.test(p.run_id||'')||typeof p.jti!=='string'||!p.jti)throw Error('Unauthorized');
  return {repository:REPOSITORY,commit:p.sha,runId:p.run_id};
}
