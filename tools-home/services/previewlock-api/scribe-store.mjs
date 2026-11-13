import {AudioError, contentHash, dropboxClient} from './audio-store.mjs';

export const SCRIBE_PATH = '/Grill Sergeant/SxLock Scribe History';
const endpoint = '/api/scribe-history';
const pagesOrigin = 'https://keythjyles.github.io';
const keyPattern = /^\d{13}-[a-f0-9]{32,64}$/;
const pageSize = 12;
const maxBytes = 1024 * 1024;

function validate(input) {
 if (!input || typeof input.id !== 'string' || !keyPattern.test(input.id) ||
     input.at !== new Date(Number(input.id.slice(0, 13))).toISOString() ||
     typeof input.text !== 'string' || !input.text.trim() ||
     (input.video !== null && (typeof input.video !== 'string' || input.video.length > 1000))) {
  throw new AudioError(400, 'Invalid Scribe entry');
 }
 return {id: input.id, at: input.at, video: input.video, text: input.text};
}

async function readBody(req) {
 const chunks = [];
 let size = 0;
 for await (const chunk of req) {
  size += chunk.length;
  if (size > maxBytes) throw new AudioError(413, 'Scribe entry exceeds the upload size');
  chunks.push(chunk);
 }
 try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
 catch { throw new AudioError(400, 'Invalid Scribe JSON'); }
}

async function append(db, entry) {
 const path = `${SCRIBE_PATH}/${entry.id}.json`;
 const bytes = Buffer.from(JSON.stringify(entry));
 let receipt;
 try {
  receipt = await db.write(path, bytes);
 } catch (error) {
  if (error.status !== 409) throw error;
  const existing = await db.read(path);
  if (!existing) {
   await db.folder(SCRIBE_PATH);
   try { receipt = await db.write(path, bytes); }
   catch (retry) { if (retry.status !== 409) throw retry; }
  }
 }
 receipt ??= await db.meta(path);
 if (!receipt?.id || !receipt.rev) throw new AudioError(502, 'Scribe receipt is unavailable');
 if (receipt.size !== bytes.length || receipt.content_hash !== contentHash(bytes)) {
  throw new AudioError(409, 'Scribe entry could not be verified');
 }
 return {id: entry.id, persisted: true};
}

async function history(db, before) {
 const {entries} = await db.list(SCRIBE_PATH);
 const ids = entries.filter(file => file['.tag'] === 'file' && file.name.endsWith('.json'))
  .map(file => file.name.slice(0, -5))
  .filter(id => keyPattern.test(id) && (!before || id < before))
  .sort().reverse();
 const page = ids.slice(0, pageSize);
 const records = await Promise.all(page.map(async id => {
  const stored = await db.read(`${SCRIBE_PATH}/${id}.json`);
  if (stored?.data?.id !== id) throw Error('Stored Scribe entry is missing or invalid');
  return validate(stored.data);
 }));
 return {entries: records, next: ids.length > pageSize ? page.at(-1) : null};
}

export async function handleScribe(req, res, url, token, db = dropboxClient(token)) {
 const send = (status, data) => {
  res.writeHead(status, {'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': pagesOrigin});
  res.end(JSON.stringify(data));
 };
 if (url.pathname !== endpoint) return false;
 if (req.headers.origin && req.headers.origin !== pagesOrigin) {
  send(403, {error: 'Origin not allowed'});
  return true;
 }
 try {
  if (req.method === 'POST') send(200, await append(db, validate(await readBody(req))));
  else if (req.method === 'GET') {
   const before = url.searchParams.get('before');
   if (before !== null && !keyPattern.test(before)) throw new AudioError(400, 'Invalid Scribe history cursor');
   send(200, await history(db, before));
  } else send(405, {error: 'Method not allowed'});
 } catch (error) {
  const status = [400, 409, 413].includes(error.status) ? error.status : 502;
  send(status, {error: status < 500 ? error.message : 'Scribe storage is temporarily unavailable'});
 }
 return true;
}
