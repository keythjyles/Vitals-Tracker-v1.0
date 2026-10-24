import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {verifyGithubIdentity,AI_AUDIENCE,REPOSITORY} from './github-identity.js';
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'fixture',alg:'RS256',use:'sig'};
const now=2000000000;
const claims={iss:'https://token.actions.githubusercontent.com',aud:AI_AUDIENCE,sub:`repo:${REPOSITORY}:ref:refs/heads/main`,repository:REPOSITORY,repository_id:'1122008805',repository_owner_id:'251250579',ref:'refs/heads/main',event_name:'push',workflow_ref:REPOSITORY+'/.github/workflows/jokelet-preflight.yml@refs/heads/main',runner_environment:'github-hosted',exp:now+300,iat:now,nbf:now,jti:'fixture-id',sha:'a'.repeat(40),workflow_sha:'a'.repeat(40),run_id:'123'};
function token(payload,header={alg:'RS256',typ:'JWT',kid:'fixture'}){
 const parts=[header,payload].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url'));return 'Bearer '+parts.join('.')+'.'+sign('RSA-SHA256',Buffer.from(parts.join('.')),privateKey).toString('base64url');
}
const options={getKeys:async()=>[jwk],now};
test('only signed, scoped repository workflow identity can run preflight',async()=>{
 assert.equal((await verifyGithubIdentity(token(claims),options)).runId,'123');
 const immutable={...claims,sub:'repo:keythjyles@251250579/Vitals-Tracker-v1.0@1122008805:ref:refs/heads/main'};
 assert.equal((await verifyGithubIdentity(token(immutable),options)).commit,claims.sha);
 const voice={...claims,workflow_ref:REPOSITORY+'/.github/workflows/jokelet-voice.yml@refs/heads/main'};
 assert.equal((await verifyGithubIdentity(token(voice),options)).workflowRef,voice.workflow_ref);
});
test('reject wrong audience, fork, branch, event, workflow, owner, runner and expiry',async()=>{
 for(const [key,value] of Object.entries({aud:'other',sub:'wrong',repository_id:'999',repository:'fork/repo',repository_owner_id:'999',ref:'refs/heads/evil',event_name:'pull_request',workflow_ref:'other.yml',runner_environment:'self-hosted',exp:now-1,iat:now-601,nbf:now+60,workflow_sha:'b'.repeat(40)}))await assert.rejects(verifyGithubIdentity(token({...claims,[key]:value}),options));
 await assert.rejects(verifyGithubIdentity(token({...claims,exp:now+601}),options));
});
test('reject algorithm substitution, bad signature, absent and malformed bearer',async()=>{
 await assert.rejects(verifyGithubIdentity(token(claims,{alg:'none',typ:'JWT',kid:'fixture'}),options));
 const good=token(claims);await assert.rejects(verifyGithubIdentity(good.slice(0,-10)+'aaaaaaaaaa',options));
 for(const bad of [undefined,'Bearer abc','Bearer '+'.'.repeat(4),'Bearer '+'a'.repeat(16001)])await assert.rejects(verifyGithubIdentity(bad,options));
});
