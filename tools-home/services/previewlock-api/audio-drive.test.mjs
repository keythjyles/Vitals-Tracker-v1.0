import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {audioDriveAuth} from './audio-drive-auth.mjs';
import {driveAudioClient, handleDriveAudio, saveDriveAudio} from './audio-drive-store.mjs';
import {DRIVE_LIBRARY_FOLDER} from './audio-store.mjs';

const fileId = 'managed-drive-file';
const assetId = 'commons-123';
const wav = Buffer.alloc(60);
wav.write('RIFF', 0);
wav.write('WAVE', 8);
const checksum = data => createHash('sha256').update(data).digest('hex');
const sha256 = checksum(wav);
const input = {assetId, sha256, name: 'Quiet gasp.wav', data: wav, info: {sourceId: 'commons:123', license: 'CC0'}};

function provider() {
 const files = new Map();
 const calls = [];
 let loseUploadResponse = false;
 async function fetcher(url, options = {}) {
  const parsed = new URL(url);
  const method = options.method || 'GET';
  assert.equal(options.headers.authorization, 'Bearer drive-fixture');
  calls.push({path: parsed.pathname, method});
  if (parsed.pathname === '/upload/drive/v3/files') {
   const boundary = options.headers['content-type'].split('boundary=')[1];
   const body = options.body;
   const first = body.indexOf('\r\n\r\n') + 4;
   const second = body.indexOf('\r\n--' + boundary, first);
   const metadata = JSON.parse(body.subarray(first, second));
   const audioStart = body.indexOf('\r\n\r\n', second) + 4;
   const audioEnd = body.indexOf('\r\n--' + boundary, audioStart);
   const data = body.subarray(audioStart, audioEnd);
   const file = {...metadata, id: fileId, size: String(data.length), sha256Checksum: checksum(data), trashed: false};
   files.set(fileId, {file, data});
   if (loseUploadResponse) throw Error('Connection interrupted after Drive committed the file');
   return Response.json(file);
  }
  if (parsed.pathname === '/drive/v3/files') {
   assert.match(parsed.searchParams.get('q'), new RegExp(DRIVE_LIBRARY_FOLDER));
   return Response.json({files: [...files.values()].map(({file}) => file).filter(file =>
    !file.trashed && file.parents.includes(DRIVE_LIBRARY_FOLDER) && parsed.searchParams.get('q').includes(`value='${file.appProperties.gsSoundId}'`))});
  }
  const id = parsed.pathname.split('/').at(-1);
  if (id === DRIVE_LIBRARY_FOLDER) return Response.json({id, capabilities: {canAddChildren: true}});
  const entry = files.get(id);
  if (!entry) return Response.json({}, {status: 404});
  if (parsed.searchParams.get('alt') === 'media') return new Response(entry.data);
  if (method === 'PATCH') Object.assign(entry.file, JSON.parse(options.body));
  return Response.json(entry.file);
 }
 return {files, calls, fetcher, client: driveAudioClient('drive-fixture', fetcher), loseUpload(){loseUploadResponse=true}};
}

test('Drive saves and verifies original bytes, identity and provenance without Dropbox', async () => {
 const storage = provider();
 const saved = await saveDriveAudio(storage.client, input);
 assert.equal(saved.cloudReceipts.drive.verified, true);
 assert.equal(saved.cloudReceipts.drive.fileId, fileId);
 assert.equal(saved.cloudReceipts.drive.sha256, sha256);
 assert.equal(saved.cloudReceipts.drive.bytes, wav.length);
 assert.equal(saved.metadata.license, 'CC0');
 assert.deepEqual(storage.files.get(fileId).data, wav);
 const old = storage.files.get(fileId).file;
 delete old.sha256Checksum;
 assert.equal((await saveDriveAudio(storage.client, input)).cloudReceipts.drive.verified, true);
 const renamed = await saveDriveAudio(storage.client, {...input, name: 'Soft gasp.wav'});
 assert.equal(renamed.name, 'Soft gasp.wav');
 assert.equal(renamed.renameHistory[0].from, input.name);
 assert.equal(renamed.cloudReceipts.drive.fileId, fileId);
 const changed = Buffer.from(wav);
 changed[45] = 9;
 await assert.rejects(saveDriveAudio(storage.client, {...input, data: changed, sha256: checksum(changed)}), /Original differs/);
 assert.equal(storage.calls.filter(call => call.path.startsWith('/upload')).length, 1);
});

test('retry after Drive commits an interrupted upload reuses the existing copy', async () => {
 const storage = provider();
 storage.loseUpload();
 await assert.rejects(saveDriveAudio(storage.client, input), /Connection interrupted/);
 assert.equal((await saveDriveAudio(storage.client, input)).cloudReceipts.drive.fileId, fileId);
 assert.equal(storage.calls.filter(call => call.path.startsWith('/upload')).length, 1);
});

test('audio over 5 MiB uses a Drive upload session with the original bytes', async () => {
 const data = Buffer.alloc(6 * 1024 * 1024);
 const contentSha = checksum(data);
 const db = driveAudioClient('drive-fixture', async (url, options) => {
  const parsed = new URL(url);
  if (options.method === 'POST') {
   assert.equal(parsed.searchParams.get('uploadType'), 'resumable');
   assert.equal(options.headers['x-upload-content-length'], String(data.length));
   assert.deepEqual(JSON.parse(options.body).parents, [DRIVE_LIBRARY_FOLDER]);
   return new Response('', {headers: {location: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=fixture'}});
  }
  assert.equal(options.method, 'PUT');
  assert.equal(parsed.searchParams.get('upload_id'), 'fixture');
  assert.equal(checksum(options.body), contentSha);
  return Response.json({id: fileId});
 });
 assert.equal((await db.create({...input, sha256: contentSha}, data)).id, fileId);
});

test('Drive authorization selects only Sound Effects, checks the owner, and returns an encrypted refresh session', async () => {
 const calls = [];
 const config = {key: 'test-key', clientId: 'test-client', clientSecret: 'test-secret'};
 const authorizer = audioDriveAuth({...config, fetcher: async (url, options) => {
  calls.push({url, grant: options.body?.get('grant_type')});
  if (url.startsWith('https://oauth2.googleapis.com')) return Response.json({
   access_token: 'test-access', refresh_token: 'test-private-refresh-token', scope: 'https://www.googleapis.com/auth/drive.file',
  });
  if (url.includes('/about?')) return Response.json({user: {emailAddress: 'kjiles71@gmail.com'}});
  assert(url.includes(DRIVE_LIBRARY_FOLDER));
  return Response.json({id: DRIVE_LIBRARY_FOLDER, mimeType: 'application/vnd.google-apps.folder', capabilities: {canAddChildren: true}});
 }});
 const start = response();
 const verifier = 'a'.repeat(64);
 await authorizer.route({method:'GET',headers:{}}, start, new URL('https://example.test/oauth/audio-drive/start?verifier='+verifier));
 const url = new URL(start.headers.location);
 assert.equal(start.status, 302);
 assert.equal(url.searchParams.get('scope'), 'https://www.googleapis.com/auth/drive.file');
 assert.equal(url.searchParams.get('file_ids'), DRIVE_LIBRARY_FOLDER);
 assert.equal(url.searchParams.get('allow_folder_selection'), 'true');
 const callback = new URL(url.searchParams.get('redirect_uri'));
 callback.searchParams.set('state', url.searchParams.get('state'));
 callback.searchParams.set('code', 'test-code');
 callback.searchParams.set('picked_file_ids', DRIVE_LIBRARY_FOLDER);
 const cookie = start.headers['set-cookie'].split(';')[0];
 const completed = response();
 await authorizer.route({method:'GET',headers:{cookie}}, completed, callback);
 assert.equal(completed.status, 200);
 assert(!completed.body.includes('test-private-refresh-token'));
 const session = completed.body.match(/"session":"([^"]+)"/)[1];
 const restarted = audioDriveAuth({...config, fetcher: async (_, options) => {
  assert.equal(options.body.get('refresh_token'), 'test-private-refresh-token');
  return Response.json({access_token: 'refreshed-access'});
 }});
 assert.equal(await restarted.accessToken(session), 'refreshed-access');
 await assert.rejects(restarted.accessToken(session.replace(/\..{8}/, '.AAAAAAAA')), /Connect Google Drive/);
 assert.equal(calls.length, 3);
});

function response() {
 return {writeHead(status, headers){this.status=status;this.headers=headers}, end(body){this.body=body}};
}

test('Drive endpoints recover original bytes, reject a wrong hash, and verify recoverable deletion', async t => {
 const storage = provider();
 await saveDriveAudio(storage.client, input);
 t.mock.method(globalThis, 'fetch', storage.fetcher);
 const auth = {accessToken: async () => 'drive-fixture'};
 async function request(action, payload, query = '') {
  const res = response();
  const req = {method: payload ? 'POST' : 'GET', headers: {}, async *[Symbol.asyncIterator](){if(payload)yield Buffer.from(JSON.stringify(payload))}};
  await handleDriveAudio(req, res, new URL('https://example.test/api/audio-drive-'+action+query), auth, 'fixture');
  return res;
 }
 const query = '?assetId='+assetId+'&fileId='+fileId+'&sha256='+sha256;
 assert.deepEqual((await request('original', null, query)).body, wav);
 assert.equal((await request('original', null, query.replace(sha256, 'a'.repeat(64)))).status, 409);
 const deleted = await request('delete', {assetId, sha256, fileId});
 assert.equal(JSON.parse(deleted.body).destinations.drive.status, 'trashed');
 assert.equal(storage.files.get(fileId).file.trashed, true);
 assert.equal((await request('record', null, query)).status, 404);
 assert.equal((await request('delete', {assetId, sha256, fileId})).status, 200);
 assert.equal(storage.calls.filter(call => call.method === 'PATCH').length, 1);
});
