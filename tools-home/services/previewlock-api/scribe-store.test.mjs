import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import test from 'node:test';
import {AudioError, contentHash} from './audio-store.mjs';
import {scribeAuth} from './scribe-auth.mjs';
import {handleScribe, SCRIBE_PATH} from './scribe-store.mjs';

function response() {
 return {writeHead(status, headers) { Object.assign(this, {status, headers}); }, end(body) { this.body = body; }};
}

test('Scribe keeps concurrent revisions, verifies retries, and pages older notes', async () => {
 const files = new Map();
 let folder = false;
 const db = {
  async folder(path) { assert.equal(path, SCRIBE_PATH); folder = true; },
  async write(path, bytes) {
   if (!folder || files.has(path)) throw new AudioError(409, 'conflict');
   files.set(path, bytes);
  },
  async read(path) { return files.has(path) ? {data: JSON.parse(files.get(path))} : null; },
  async list() { return {entries: [...files.keys()].map(path => ({'.tag': 'file', name: path.split('/').at(-1)}))}; },
  async meta(path) {
   const bytes = files.get(path);
   return bytes && {id: 'test', rev: '1', size: bytes.length, content_hash: contentHash(bytes)};
  },
 };
 async function call(method, entry, query = '', origin) {
  const req = Object.assign(Readable.from(entry ? [Buffer.from(JSON.stringify(entry))] : []), {method, headers: {origin}});
  const res = response();
  await handleScribe(req, res, new URL('https://example.test/api/scribe-history' + query), 'fixture', db);
  return {status: res.status, ...JSON.parse(res.body)};
 }
 const time = 1794585071326;
 const entries = Array.from({length: 15}, (_, i) => ({id: `${time + i}-${'1'.repeat(32)}`, at: new Date(time + i).toISOString(), video: 'Sample.mp4', text: `[F228 | 0:09.120 | 25 fps] note ${i} 📝`}));
 const writes = await Promise.all(entries.map(entry => call('POST', entry)));
 assert(writes.every((receipt, i) => receipt.persisted && receipt.id === entries[i].id));
 assert.equal((await call('POST', entries[0])).persisted, true);
 assert.equal((await call('POST', {...entries[0], text: 'replacement'})).status, 409);
 assert.equal((await call('POST', {...entries[0], id: '../another-file'})).status, 400);
 assert.equal((await call('GET', null, '', 'https://elsewhere.test')).status, 403);
 assert.equal(files.size, entries.length);
 const newest = await call('GET');
 const older = await call('GET', null, '?before=' + newest.next);
 assert.deepEqual([...newest.entries, ...older.entries], entries.reverse());
 assert.equal(older.next, null);
});

test('Google sign-in requires the signed state cookie and verified owner account', async () => {
 let account = {email: 'other@example.test', email_verified: true};
 let providerCalls = 0;
 const auth = scribeAuth({key: 'fixture-key', clientId: 'fixture-id', clientSecret: 'fixture-secret', fetcher: async url => {
  providerCalls++;
  return Response.json(url.endsWith('/token') ? {access_token: 'fixture-token'} : account);
 }});
 const start = response();
 const verifier = 'a'.repeat(64);
 await auth.route({method: 'GET'}, start, new URL('https://example.test/oauth/scribe/start?verifier=' + verifier));
 assert.equal(start.status, 302);
 const state = new URL(start.headers.location).searchParams.get('state');
 const url = new URL('https://example.test/oauth/google/callback?code=fixture&state=' + encodeURIComponent(state));
 const cookie = start.headers['set-cookie'].split(';')[0];
 async function callback(headers) {
  const res = response();
  await auth.route({method: 'GET', headers}, res, url);
  return res;
 }
 assert.equal((await callback({})).status, 400);
 assert.equal(providerCalls, 0);
 assert.equal((await callback({cookie})).status, 403);
 account = {email: 'kjiles71@gmail.com', email_verified: true};
 const connected = await callback({cookie});
 const token = connected.body.match(/"session":"([^"]+)"/)[1];
 assert.equal(auth.verify(token), true);
 assert.equal(auth.verify(token + 'x'), false);
 assert.equal(auth.verify(token.replace(/\d{10}/, '1000000000')), false);
});
