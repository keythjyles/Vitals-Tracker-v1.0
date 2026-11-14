import {createHash, randomUUID} from 'node:crypto';
import {AudioError, DRIVE_LIBRARY_FOLDER, MAX_AUDIO_BYTES, audioSaveInput, validateAudioSave, validAudioAssetId, validClassification, validName} from './audio-store.mjs';

const drive = 'https://www.googleapis.com/drive/v3/files';
const upload = 'https://www.googleapis.com/upload/drive/v3/files';
const fields = 'id,name,parents,mimeType,size,sha256Checksum,appProperties,description,trashed';
const schema = 'SoundScrubberDrive-1';
const mimeTypes = {wav: 'audio/wav', mp3: 'audio/mpeg', flac: 'audio/flac', m4a: 'audio/mp4', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg'};
const sha = data => createHash('sha256').update(data).digest('hex');
const extension = name => name.split('.').at(-1).toLowerCase();

export function driveAudioClient(token, fetcher = fetch) {
 async function request(url, options = {}, allowMissing = false) {
  const response = await fetcher(url, {
   ...options, headers: {...options.headers, authorization: 'Bearer ' + token}, signal: AbortSignal.timeout(45000),
  });
  if (response.ok) return response;
  if (response.status === 404 && allowMissing) return null;
  const error = (await response.json().catch(() => ({}))).error;
  const reason = error?.errors?.[0]?.reason;
  if (response.status === 401) throw new AudioError(401, 'Reconnect Google Drive to finish saving.');
  if (reason === 'storageQuotaExceeded') throw new AudioError(507, 'Google Drive is full. Approved audio is kept on this device.');
  if (response.status === 429 || ['rateLimitExceeded', 'userRateLimitExceeded'].includes(reason)) {
   throw new AudioError(429, 'Google Drive is busy. Try saving again shortly.');
  }
  if (response.status === 403 || response.status === 404) {
   throw new AudioError(403, 'Reconnect Google Drive and grant access to the Sound Effects folder.');
  }
  if (response.status === 409) throw new AudioError(409, 'Google Drive changed during the save. Retry this sound.');
  throw new AudioError(502, 'Google Drive is temporarily unavailable. Your original is kept on this device.');
 }

 const json = payload => ({headers: {'content-type': 'application/json'}, body: JSON.stringify(payload)});
 const fileUrl = id => drive + '/' + encodeURIComponent(id);
 const fileQuery = '?supportsAllDrives=true&fields=' + encodeURIComponent(fields);
 return {
  async list(assetId) {
   const q = `'${DRIVE_LIBRARY_FOLDER}' in parents and trashed = false and appProperties has { key='gsSoundId' and value='${assetId}' }`;
   const found = [];
   let pageToken;
   do {
    const params = new URLSearchParams({q, spaces: 'drive', pageSize: '100', fields: 'nextPageToken,files(' + fields + ')'});
    if (pageToken) params.set('pageToken', pageToken);
    const page = await (await request(drive + '?' + params)).json();
    found.push(...(page.files || []));
    pageToken = page.nextPageToken;
   } while (pageToken);
   return found;
  },
  async get(id) {
   return (await request(fileUrl(id) + fileQuery, {}, true))?.json();
  },
  async create(record, data) {
   const metadata = {
    name: record.name, mimeType: mimeTypes[extension(record.name)], parents: [DRIVE_LIBRARY_FOLDER],
    description: JSON.stringify(record), appProperties: {gsSoundId: record.assetId, sha256: record.sha256},
   };
   const boundary = 'gs-sound-' + randomUUID();
   const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\n\r\n`),
    data, Buffer.from(`\r\n--${boundary}--\r\n`),
   ]);
   return (await request(upload + fileQuery + '&uploadType=multipart', {
    method: 'POST', headers: {'content-type': 'multipart/related; boundary=' + boundary}, body,
   })).json();
  },
  async update(id, changes) {
   return (await request(fileUrl(id) + fileQuery, {method: 'PATCH', ...json(changes)})).json();
  },
  async bytes(id) {
   const response = await request(fileUrl(id) + '?alt=media&supportsAllDrives=true');
   return Buffer.from(await response.arrayBuffer());
  },
  async rootWritable() {
   const response = await request(fileUrl(DRIVE_LIBRARY_FOLDER) + '?supportsAllDrives=true&fields=id,trashed,capabilities(canAddChildren)');
   return (await response.json()).capabilities?.canAddChildren === true;
  },
 };
}

function isManagedFile(file, assetId) {
 return file?.parents?.includes(DRIVE_LIBRARY_FOLDER) && file.appProperties?.gsSoundId === assetId;
}

async function find(db, assetId) {
 const files = await db.list(assetId);
 if (files.length > 1) throw new AudioError(409, 'More than one managed Drive copy was found. Originals are retained.');
 if (!files.length) return null;
 const file = await db.get(files[0].id);
 if (!isManagedFile(file, assetId) || file.trashed) {
  throw new AudioError(409, 'The managed audio moved or changed in Drive. Original retained.');
 }
 return file;
}

async function verify(db, file, assetId) {
 let record;
 try { record = JSON.parse(file.description); } catch {}
 if (record?.schema !== schema || record.assetId !== assetId || !validName(record.name) ||
     file.name !== record.name || file.appProperties?.sha256 !== record.sha256 ||
     !/^[a-f0-9]{64}$/.test(record.sha256) || !Number.isSafeInteger(record.bytes) ||
     record.bytes < 1 || record.bytes > MAX_AUDIO_BYTES || Number(file.size) !== record.bytes) {
  throw new AudioError(409, 'Google Drive audio identity could not be verified. Original retained.');
 }
 const checksum = file.sha256Checksum || sha(await db.bytes(file.id));
 if (checksum !== record.sha256) throw new AudioError(409, 'Google Drive audio differs from the original. Original retained.');
 const receipt = {
  verified: true, provider: 'drive', fileId: file.id, folderId: DRIVE_LIBRARY_FOLDER, rootFolderId: DRIVE_LIBRARY_FOLDER,
  name: file.name, bytes: record.bytes, sha256: checksum, verifiedAt: new Date().toISOString(),
 };
 return {...record, recordPath: file.id, cloudReceipts: {drive: receipt}, cloudSaveStatus: 'verified', persisted: true};
}

export async function saveDriveAudio(db, input) {
 const {assetId, name, data, info = {}, sha256} = input;
 validateAudioSave(input);
 const existing = await find(db, assetId);
 if (existing) {
  const prior = await verify(db, existing, assetId);
  if (prior.sha256 !== sha256) throw new AudioError(409, 'Original differs; existing Drive recording preserved.');
  if (prior.name === name) return prior;
  return rename(db, existing, prior, name);
 }
 const record = {
  schema, assetId, name, sha256, bytes: data.length, status: 'approved', originalName: info.originalName || name,
  approvedAt: info.approvedAt || new Date().toISOString(), metadata: info, classification: info.classification || null,
  renameHistory: Array.isArray(info.renameHistory) ? info.renameHistory : [],
 };
 const created = await db.create(record, data);
 const file = created?.id && await db.get(created.id);
 if (!file?.parents?.includes(DRIVE_LIBRARY_FOLDER) || file.trashed || file.appProperties?.gsSoundId !== assetId) {
  throw new AudioError(502, 'Drive save could not be verified. Retry this sound.');
 }
 return verify(db, file, assetId);
}

async function update(db, file, previous, updates) {
 const {recordPath, cloudReceipts, cloudSaveStatus, persisted, ...record} = previous;
 const value = {...record, ...updates};
 await db.update(file.id, {name: value.name, description: JSON.stringify(value)});
 const saved = await db.get(file.id);
 if (!isManagedFile(saved, record.assetId) || saved.trashed) throw new AudioError(502, 'Drive update could not be verified.');
 const verified = await verify(db, saved, record.assetId);
 if (verified.name !== value.name || JSON.stringify(verified.classification) !== JSON.stringify(value.classification)) {
  throw new AudioError(502, 'Drive update could not be verified.');
 }
 return verified;
}

function rename(db, file, record, name) {
 if (!validName(name) || extension(name) !== extension(record.name)) throw new AudioError(400, 'Keep the original audio extension.');
 if (record.name === name) return record;
 const renameHistory = [...(record.renameHistory || []).slice(-19), {from: record.name, to: name, at: new Date().toISOString()}];
 return update(db, file, record, {name, renameHistory});
}

async function remove(db, assetId, expected, fileId) {
 const file = fileId ? await db.get(fileId) : await find(db, assetId);
 if (file) {
  if (!isManagedFile(file, assetId)) throw new AudioError(409, 'The file is outside the managed Sound Effects folder.');
  const record = await verify(db, file, assetId);
  if (record.sha256 !== expected) throw new AudioError(409, 'Saved Drive original differs; deletion stopped.');
  if (!file.trashed) {
   await db.update(file.id, {trashed: true});
   const trash = await db.get(file.id);
   if (!trash?.trashed || !isManagedFile(trash, assetId)) {
    throw new AudioError(502, 'Google Drive Trash could not be verified. Retry Delete.');
   }
  }
  return {assetId, requestId: file.id, persisted: true, complete: true, destinations: {drive: {verified: true, status: 'trashed'}}};
 }
 if (!await db.rootWritable()) throw new AudioError(403, 'Reconnect Google Drive and grant access to the Sound Effects folder.');
 return {assetId, requestId: assetId, persisted: true, complete: true, destinations: {drive: {verified: true, status: 'absent'}}};
}

let mutation = false;
export async function handleDriveAudio(req, res, url, auth, credential) {
 const action = url.pathname.slice('/api/audio-drive-'.length);
 const send = (status, value) => {
  res.writeHead(status, {
   'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': 'https://keythjyles.github.io',
  });
  res.end(JSON.stringify(value));
 };
 if (req.headers.origin && req.headers.origin !== 'https://keythjyles.github.io') return send(403, {error: 'origin_not_allowed'});
 const reading = ['record', 'original'].includes(action);
 if (req.method !== (reading ? 'GET' : 'POST')) return send(405, {error: 'method_not_allowed'});
 if (!reading) {
  if (mutation) return send(409, {error: 'Another sound is finishing its Drive save. Try again shortly.'});
  mutation = true;
 }
 try {
  const db = driveAudioClient(await auth.accessToken(credential));
  if (reading) {
   const assetId = url.searchParams.get('assetId') || '';
   if (!validAudioAssetId(assetId)) throw new AudioError(400, 'Invalid audio identity.');
   const fileId = url.searchParams.get('fileId');
   if (fileId && !/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) throw new AudioError(400, 'Invalid Drive file identity.');
   const file = fileId ? await db.get(fileId) : await find(db, assetId);
   if (!isManagedFile(file, assetId) || file.trashed && action === 'record') {
    throw new AudioError(404, 'Google Drive audio record not found.');
   }
   if (action === 'record') return send(200, await verify(db, file, assetId));
   const expected = url.searchParams.get('sha256');
   if (!/^[a-f0-9]{64}$/.test(expected || '') || file.appProperties?.sha256 !== expected) {
    throw new AudioError(409, 'The requested audio identity does not match.');
   }
   const size = Number(file.size);
   if (!Number.isSafeInteger(size) || size < 1 || size > MAX_AUDIO_BYTES || !validName(file.name)) {
    throw new AudioError(409, 'Invalid Google Drive audio.');
   }
   const data = await db.bytes(file.id);
   if (data.length !== size || sha(data) !== expected) throw new AudioError(502, 'Drive audio readback could not be verified.');
   res.writeHead(200, {'content-type': mimeTypes[extension(file.name)], 'content-length': data.length,
    'x-content-type-options': 'nosniff', 'cache-control': 'no-store', 'access-control-allow-origin': 'https://keythjyles.github.io'});
   return res.end(data);
  }

  const parts = [];
  let size = 0;
  for await (const part of req) {
   size += part.length;
   if (size > (action === 'save' ? MAX_AUDIO_BYTES : 10000)) throw new AudioError(413, 'Audio request too large.');
   parts.push(part);
  }
  const data = Buffer.concat(parts);
  if (action === 'save') return send(200, await saveDriveAudio(db, audioSaveInput(req.headers, data)));
  let input;
  try { input = JSON.parse(data.toString()); } catch {}
  if (!validAudioAssetId(input?.assetId) || !/^[a-f0-9]{64}$/.test(input?.sha256 || '')) {
   throw new AudioError(400, 'Invalid audio identity.');
  }
  const {assetId, sha256, name, classification, fileId} = input;
  if (fileId && !/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) throw new AudioError(400, 'Invalid Drive file identity.');
  if (action === 'delete') return send(200, await remove(db, assetId, sha256, fileId));
  const file = await find(db, assetId);
  if (!file) throw new AudioError(404, 'Google Drive audio record not found.');
  const record = await verify(db, file, assetId);
  if (record.sha256 !== sha256) throw new AudioError(409, 'Saved Drive original differs. Original retained.');
  if (action === 'rename') return send(200, await rename(db, file, record, name));
  if (!validClassification(classification) || classification.method !== 'owner') throw new AudioError(400, 'Invalid sound classification.');
  return send(200, await update(db, file, record, {classification, metadata: {...record.metadata, classification}}));
 } catch (error) {
  return send(error instanceof AudioError ? error.status : 502, {
   error: error instanceof AudioError ? error.message : 'Google Drive request failed. Your original is kept on this device.',
  });
 } finally {
  if (!reading) mutation = false;
 }
}
