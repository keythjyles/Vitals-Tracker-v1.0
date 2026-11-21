import {createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';

const DRIVE = 'https://www.googleapis.com/drive/v3/';
const SCOPE = 'https://www.googleapis.com/auth/drive';
const FOLDER = 'application/vnd.google-apps.folder';
const SESSION = '__Host-vt-drive';
const STATE = '__Host-vt-drive-state';
const STATE_PREFIX = 'vt-drive-manager.';
const FILE_FIELDS = 'id,name,mimeType,size,modifiedTime,parents,trashed,explicitlyTrashed,starred,webViewLink,resourceKey,shortcutDetails,capabilities(canAddChildren,canRename,canMoveItemWithinDrive,canTrash,canUntrash,canDownload,canCopy),owners(displayName,emailAddress),shared';
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim().split(/=(.*)/s)).filter(x => x.length > 1));
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const escapeQuery = s => s.replaceAll('\\', '\\\\').replaceAll("'", "\\'");

export class DriveManagerError extends Error {
 constructor(status, message) { super(message); this.status = status; }
}

export function createDriveManager({key, clientId, clientSecret, baseURL = 'https://gs-previewlock-api.onrender.com', allowedEmails = ['kjiles71@gmail.com', 'keythjyles2@gmail.com'], fetcher = fetch, clock = Date.now}) {
 const origin = new URL(baseURL).origin;
 // Reuse the registered callback, without changing the existing audio/Field Guide flows.
 const callback = origin + '/oauth/google/callback';
 const configured = Boolean(key && clientId && clientSecret);
 const secret = configured ? createHmac('sha256', clientSecret).update('VT Drive Manager R1 ' + key).digest() : null;
 const cache = new Map();
 const operations = new Map();
 const sign = value => createHmac('sha256', secret).update(value).digest('base64url');
 const cookie = (name, value, age) => `${name}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`;
 const clearCookie = cookie(SESSION, '', 0);

 function seal(value) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', secret, iv);
  const bytes = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString('base64url');
 }
 function unseal(value) {
  try {
   if (!configured || !/^[\w-]{40,6000}$/.test(value || '')) throw Error();
   const bytes = Buffer.from(value, 'base64url');
   const cipher = createDecipheriv('aes-256-gcm', secret, bytes.subarray(0, 12));
   cipher.setAuthTag(bytes.subarray(12, 28));
   const result = JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString());
   if (!(result.expires > clock())) throw Error();
   return result;
  } catch { throw new DriveManagerError(401, 'Connect Google Drive to open your files.'); }
 }
 function identity(req) {
  const session = cookies(req)[SESSION], data = unseal(session);
  if (data.kind !== 'session' || !data.refreshToken || !allowedEmails.includes(data.email)) throw new DriveManagerError(401, 'Reconnect your Google Drive account.');
  return {...data, session};
 }
 function json(res, status, data, headers = {}) {
  res.writeHead(status, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', ...headers});
  res.end(JSON.stringify(data)); return true;
 }
 function redirect(res, location, headers = {}) {
  res.writeHead(303, {location, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', ...headers}); res.end(); return true;
 }
 async function exchange(parameters) {
  const response = await fetcher('https://oauth2.googleapis.com/token', {method: 'POST', body: new URLSearchParams({client_id: clientId, client_secret: clientSecret, ...parameters}), signal: AbortSignal.timeout(20000)});
  const result = await response.json().catch(() => ({}));
  if (result.error === 'invalid_grant') throw new DriveManagerError(401, 'Google requires you to reconnect this Drive account.');
  if (!response.ok || !result.access_token) throw new DriveManagerError(502, 'Google sign-in is temporarily unavailable. Try again.');
  if (result.scope && !result.scope.split(' ').includes(SCOPE)) throw new DriveManagerError(401, 'Approve access to manage your Drive files. The selected-file permission is too limited.');
  return result;
 }
 async function access(auth) {
  const hash = createHash('sha256').update(auth.session).digest('hex');
  const prior = cache.get(hash);
  if (prior?.until > clock()) return prior.token;
  if (prior?.pending) return prior.pending;
  const pending = exchange({grant_type: 'refresh_token', refresh_token: auth.refreshToken}).then(data => {
   cache.set(hash, {token: data.access_token, until: clock() + Math.max(0, (Number(data.expires_in) || 3600) - 90) * 1000});
   return data.access_token;
  }).catch(error => { cache.delete(hash); throw error; });
  if (cache.size > 16) cache.delete(cache.keys().next().value);
  cache.set(hash, {pending}); return pending;
 }
 function id(value, root = false) {
  if ((root && value === 'root') || /^[A-Za-z0-9_-]{8,200}$/.test(value || '')) return value;
  throw new DriveManagerError(400, 'Choose a valid Drive file or folder.');
 }
 function name(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 255 || /[\x00-\x1f\x7f]/.test(value)) throw new DriveManagerError(400, 'Enter a name of 1 to 255 characters.');
  return value.trim();
 }
 async function google(auth, path, {method = 'GET', parameters = {}, body, headers = {}} = {}) {
  const url = new URL(path, DRIVE);
  if (url.origin !== new URL(DRIVE).origin || !url.pathname.startsWith('/drive/v3/')) throw new DriveManagerError(400, 'Invalid Drive operation.');
  for (const [k, v] of Object.entries(parameters)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  const response = await fetcher(url, {method, headers: {authorization: 'Bearer ' + await access(auth), ...(body ? {'content-type': 'application/json'} : {}), ...headers}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(40000)});
  if (!response.ok) {
   const data = await response.json().catch(() => ({}));
   const reason = data.error?.errors?.[0]?.reason;
   const message = response.status === 404 ? 'Google Drive could not find this item in the connected account.' : response.status === 403 ? 'This account does not have permission for that action.' : response.status === 429 ? 'Google Drive is busy. Wait a moment, then refresh.' : 'Google Drive did not complete the request. Refresh to check the current result.';
   throw new DriveManagerError([401,403,404,409,429].includes(response.status) ? response.status : 502, reason === 'insufficientPermissions' ? 'Reconnect and approve full Drive management access.' : message);
  }
  return response.status === 204 ? {} : response.json();
 }
 const file = (auth, fileId) => google(auth, 'files/' + id(fileId, true), {parameters: {fields: FILE_FIELDS, supportsAllDrives: true}});
 async function lineage(auth, current) {
  const result = [current], seen = new Set([current.id]);
  for (let i = 0; i < 40 && result.at(-1).parents?.length; i++) {
   const parentId = result.at(-1).parents[0]; if (seen.has(parentId)) break;
   seen.add(parentId);
   try { result.push(await file(auth, parentId)); } catch (error) { if (error.status === 403 || error.status === 404) break; throw error; }
  }
  return result.reverse();
 }
 async function body(req, max = 40000) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > max) throw new DriveManagerError(413, 'This request is too large.'); chunks.push(chunk); }
  return Buffer.concat(chunks);
 }
 async function data(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new DriveManagerError(415, 'Send the operation as JSON.');
  try { return JSON.parse((await body(req)).toString()); } catch (e) { if (e instanceof DriveManagerError) throw e; throw new DriveManagerError(400, 'The request could not be read.'); }
 }
 function writeOrigin(req) {
  if (req.headers.origin !== origin) throw new DriveManagerError(403, 'Open Drive Manager to make this change.');
 }
 async function operation(req, auth, payload, fn) {
  const requestId = req.headers['x-request-id'];
  if (!/^[\w-]{16,100}$/.test(requestId || '')) throw new DriveManagerError(400, 'This change needs a request identifier.');
  for (const [k, v] of operations) if (v.expires < clock()) operations.delete(k);
  if (operations.size > 800) throw new DriveManagerError(429, 'Finish the current changes, then try again.');
  const k = auth.email + ':' + requestId;
  const fingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const prior = operations.get(k);
  if (prior) {
   if (prior.fingerprint !== fingerprint) throw new DriveManagerError(409, 'This request identifier already belongs to a different change.');
   return prior.promise;
  }
  const promise = fn(); operations.set(k, {fingerprint, promise, expires: clock() + 1800000});
  return promise;
 }
 async function targetFolder(auth, folderId) {
  const folder = await file(auth, id(folderId, true));
  if (folder.mimeType !== FOLDER || folder.trashed) throw new DriveManagerError(409, 'Choose an active folder. Restore a folder from Trash before using it.');
  if (folder.capabilities?.canAddChildren === false) throw new DriveManagerError(403, 'You cannot add files to this folder.');
  return folder;
 }
 async function change(auth, itemId, action, input) {
  const before = await file(auth, itemId); let after;
  const expected=input.expected?.[itemId];
  if(expected&&Object.keys(expected).some(k=>!['name','parents','trashed','starred'].includes(k)||JSON.stringify(before[k])!==JSON.stringify(expected[k])))throw new DriveManagerError(409,'This item changed after you opened it. Refresh before applying the change.');
  if (action === 'rename') after = await google(auth, 'files/' + itemId, {method: 'PATCH', parameters: {fields: FILE_FIELDS, supportsAllDrives: true}, body: {name: name(input.name)}});
  else if (action === 'star') after = await google(auth, 'files/' + itemId, {method: 'PATCH', parameters: {fields: FILE_FIELDS, supportsAllDrives: true}, body: {starred: Boolean(input.starred)}});
  else if (action === 'trash' || action === 'restore') {
   after = await google(auth, 'files/' + itemId, {method: 'PATCH', parameters: {fields: FILE_FIELDS, supportsAllDrives: true}, body: {trashed: action === 'trash'}});
   if (action === 'restore' && after.trashed) throw new DriveManagerError(409, 'The parent folder is still in Trash. Restore its location first.');
  } else if (action === 'move') {
   const target = await targetFolder(auth, input.targetId);
   if (before.trashed) throw new DriveManagerError(409, 'Restore this item before moving it.');
   if ((await lineage(auth, target)).some(x => x.id === before.id)) throw new DriveManagerError(409, 'A folder cannot be moved inside itself.');
   if (before.parents?.includes(target.id)) return {id: itemId, before, after: before, unchanged: true};
   after = await google(auth, 'files/' + itemId, {method: 'PATCH', parameters: {addParents: target.id, removeParents: (before.parents || []).join(','), fields: FILE_FIELDS, supportsAllDrives: true}, body: {}});
   if (!after.parents?.includes(target.id)) throw new DriveManagerError(409, 'Drive has not verified the new location. Refresh before trying again.');
  } else throw new DriveManagerError(400, 'Choose a supported change.');
  return {id: itemId, before, after};
 }
 async function streamFile(req, res, auth, url) {
  const item = await file(auth, id(url.searchParams.get('id')));
  const native = item.mimeType?.startsWith('application/vnd.google-apps.');
  if (item.mimeType === FOLDER) throw new DriveManagerError(400, 'Open the folder to browse its files.');
  const source = new URL(native ? 'files/' + item.id + '/export' : 'files/' + item.id, DRIVE);
  source.searchParams.set(native ? 'mimeType' : 'alt', native ? 'application/pdf' : 'media');
  if (!native) source.searchParams.set('supportsAllDrives', 'true');
  const headers = {authorization: 'Bearer ' + await access(auth)};
  if (!native && /^bytes=\d*-\d*(?:,\d*-\d*)?$/.test(req.headers.range || '')) headers.range = req.headers.range;
  if (item.resourceKey) headers['x-goog-drive-resource-keys'] = item.id + '/' + item.resourceKey;
  const upstream = await fetcher(source, {headers, signal: AbortSignal.timeout(180000)});
  if (!upstream.ok) throw new DriveManagerError(upstream.status === 403 ? 403 : 502, 'Drive could not open this file. Google documents exported as PDF have a 10 MB export limit.');
  const type = native ? 'application/pdf' : item.mimeType || 'application/octet-stream';
  const safeInline = /^(application\/pdf|text\/plain|image\/(?:png|jpeg|gif|webp|avif)|audio\/[\w.+-]+|video\/[\w.+-]+)$/.test(type);
  const disposition = url.searchParams.get('download') === '1' || !safeInline ? 'attachment' : 'inline';
  const filename = item.name + (native ? '.pdf' : '');
  const responseHeaders = {'content-type': type, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'content-disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`, 'content-security-policy': "default-src 'none'; frame-ancestors 'self'"};
  for (const key of ['content-length','content-range','accept-ranges']) if (upstream.headers.get(key)) responseHeaders[key] = upstream.headers.get(key);
  res.writeHead(upstream.status, responseHeaders);
  if (upstream.body) Readable.fromWeb(upstream.body).on('error',()=>res.destroy()).pipe(res); else res.end(); return true;
 }

 async function route(req, res, url) {
  const path = url.pathname;
  const ownCallback = path === '/oauth/google/callback' && (url.searchParams.get('state') || '').startsWith(STATE_PREFIX);
  if (!path.startsWith('/drive/') && path !== '/drive' && !path.startsWith('/api/drive-manager/') && !ownCallback) return false;
  try {
   if (path === '/drive' && req.method === 'GET') return redirect(res, '/drive/');
   const assets = {'/drive/':'app.html', '/drive/manager.mjs':'manager.mjs', '/drive/manager.css':'manager.css', '/drive/manifest.webmanifest':'manifest.webmanifest', '/drive/icon.svg':'icon.svg'};
   if (assets[path] && req.method === 'GET') {
    const bytes = await readFile(new URL('../../tools/drive-manager/' + assets[path], import.meta.url));
    const types = {'html':'text/html; charset=utf-8','mjs':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8','webmanifest':'application/manifest+json','svg':'image/svg+xml'};
    res.writeHead(200, {'content-type': types[assets[path].split('.').at(-1)], 'cache-control':'no-cache', 'x-content-type-options':'nosniff', 'referrer-policy':'no-referrer', 'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'", 'x-frame-options':'SAMEORIGIN'}); res.end(bytes); return true;
   }
   if (path === '/drive/connect' && req.method === 'GET') {
    if (!configured) return redirect(res, '/drive/?connection=unavailable');
    const value = STATE_PREFIX + clock() + '.' + randomBytes(24).toString('hex');
    const state = value + '.' + sign(value);
    const query = new URLSearchParams({client_id:clientId,redirect_uri:callback,response_type:'code',scope:SCOPE,state,access_type:'offline',prompt:'consent',include_granted_scopes:'true',login_hint:allowedEmails[0]});
    return redirect(res, 'https://accounts.google.com/o/oauth2/v2/auth?' + query, {'set-cookie':cookie(STATE, state, 600)});
   }
   if (ownCallback && req.method === 'GET') {
    const state = url.searchParams.get('state'), at = state.lastIndexOf('.'), value = state.slice(0, at), mac = state.slice(at + 1);
    const time = Number(value.slice(STATE_PREFIX.length).split('.')[0]);
    if (!configured || !equal(state, cookies(req)[STATE]) || !equal(mac, sign(value)) || time > clock() || clock() - time > 600000) return redirect(res, '/drive/?connection=expired');
    const stateClear = cookie(STATE, '', 0);
    if (!url.searchParams.get('code')) return redirect(res, '/drive/?connection=canceled', {'set-cookie':stateClear});
    try {
     const tokens = await exchange({grant_type:'authorization_code',redirect_uri:callback,code:url.searchParams.get('code')});
     const account = await fetcher(DRIVE + 'about?fields=user(emailAddress,displayName,permissionId)', {headers:{authorization:'Bearer ' + tokens.access_token},signal:AbortSignal.timeout(15000)});
     const user = account.ok ? (await account.json()).user : null;
     if (!allowedEmails.includes(user?.emailAddress?.toLowerCase())) return redirect(res, '/drive/?connection=account', {'set-cookie':stateClear});
     if (!tokens.refresh_token) return redirect(res, '/drive/?connection=offline', {'set-cookie':stateClear});
     const session = seal({kind:'session',email:user.emailAddress.toLowerCase(),displayName:user.displayName,refreshToken:tokens.refresh_token,expires:clock()+365*86400000});
     return redirect(res, '/drive/?connection=ready', {'set-cookie':[stateClear,cookie(SESSION,session,365*86400)]});
    } catch { return redirect(res, '/drive/?connection=failed', {'set-cookie':stateClear}); }
   }
   if (path === '/api/drive-manager/status' && req.method === 'GET') {
    try { const auth=identity(req); await access(auth); return json(res,200,{connected:true,email:auth.email,displayName:auth.displayName,configured,version:1}); }
    catch (e) { if (e.status !== 401) throw e; return json(res,200,{connected:false,configured,version:1}); }
   }
   if (!path.startsWith('/api/drive-manager/')) return json(res,404,{error:'This Drive Manager page was not found.'});
   if (!['GET','POST','PUT'].includes(req.method)) return json(res,405,{error:'This request method is not supported.'});
   const auth = identity(req);
   if (req.method !== 'GET') writeOrigin(req);
   if (path === '/api/drive-manager/disconnect' && req.method === 'POST') return json(res,200,{disconnected:true},{'set-cookie':clearCookie});
   if (path === '/api/drive-manager/content' && req.method === 'GET') return await streamFile(req,res,auth,url);
   if (path === '/api/drive-manager/item' && req.method === 'GET') {
    const item=await file(auth,id(url.searchParams.get('id'),true));
    return json(res,200,{item,path:await lineage(auth,item)});
   }
   if (path === '/api/drive-manager/files' && req.method === 'GET') {
    const view=url.searchParams.get('view')||'folder', query=(url.searchParams.get('query')||'').trim();
    if (!['folder','all','recent','starred','trash','shared'].includes(view)||query.length>500) throw new DriveManagerError(400,'Choose a valid view or shorter search.');
    const folderId=id(url.searchParams.get('folder')||'root',true);
    const clauses=[view==='trash'?'trashed = true':'trashed = false'];
    if (view==='folder'&&!query) clauses.push(`'${escapeQuery(folderId)}' in parents`);
    if (view==='starred') clauses.push('starred = true');
    if (view==='shared') clauses.push('sharedWithMe = true');
    if (query) clauses.push(`(name contains '${escapeQuery(query)}' or fullText contains '${escapeQuery(query)}')`);
    if (url.searchParams.get('foldersOnly')==='1') clauses.push(`mimeType = '${FOLDER}'`);
    const sort={name:'folder,name_natural',modified:'folder,modifiedTime desc',oldest:'folder,modifiedTime',type:'mimeType,name_natural',size:'quotaBytesUsed desc'}[url.searchParams.get('sort')||'name'];
    if (!sort) throw new DriveManagerError(400,'Choose a valid sort order.');
    const token=url.searchParams.get('page')||'';if(token.length>8000)throw new DriveManagerError(400,'The page cursor is invalid.');
    const result=await google(auth,'files',{parameters:{q:clauses.join(' and '),pageSize:100,pageToken:token,orderBy:view==='recent'?'modifiedTime desc':sort,fields:`nextPageToken,incompleteSearch,files(${FILE_FIELDS})`,supportsAllDrives:true,includeItemsFromAllDrives:true}});
    let location=null;
    if(view==='folder'&&!query){const item=await file(auth,folderId);location={item,path:await lineage(auth,item)};}
    return json(res,200,{...result,location,view,query});
   }
   if (path === '/api/drive-manager/change' && req.method === 'POST') {
    const input=await data(req);
    if(!Array.isArray(input.ids)||!input.ids.length||input.ids.length>100)throw new DriveManagerError(400,'Select between 1 and 100 items.');
    const ids=[...new Set(input.ids.map(x=>id(x)))];
    if(!['rename','move','trash','restore','star'].includes(input.action))throw new DriveManagerError(400,'Choose a supported action.');
    if(input.action==='rename'&&ids.length!==1)throw new DriveManagerError(400,'Rename one item at a time.');
    const result=await operation(req,auth,input,async()=>{
     const results=[];
     // Preserve caller order: the restoration dialog orders parents before descendants.
     for(const itemId of ids){try{results.push({ok:true,...await change(auth,itemId,input.action,input)});}catch(e){results.push({ok:false,id:itemId,error:e instanceof DriveManagerError?e.message:'Drive did not verify this change. Refresh before trying again.'});}}
     return {results,complete:results.every(x=>x.ok)};
    });
    return json(res,200,result);
   }
   if(path==='/api/drive-manager/folder'&&req.method==='POST'){
    const input=await data(req);const folderName=name(input.name);
    return json(res,200,await operation(req,auth,input,async()=>{const parent=await targetFolder(auth,input.parentId||'root');return {item:await google(auth,'files',{method:'POST',parameters:{fields:FILE_FIELDS,supportsAllDrives:true},body:{name:folderName,mimeType:FOLDER,parents:[parent.id]}})};}));
   }
   if(path==='/api/drive-manager/copy'&&req.method==='POST'){
    const input=await data(req),itemId=id(input.id);
    return json(res,200,await operation(req,auth,input,async()=>{const before=await file(auth,itemId);if(before.mimeType===FOLDER)throw new DriveManagerError(400,'Choose files to copy. Folders can be moved.');const parent=await targetFolder(auth,input.targetId||'root');return {item:await google(auth,'files/'+itemId+'/copy',{method:'POST',parameters:{fields:FILE_FIELDS,supportsAllDrives:true},body:{name:name(input.name||before.name),parents:[parent.id]}})};}));
   }
   if(path==='/api/drive-manager/upload'&&req.method==='POST'){
    const input=await data(req);const filename=name(input.name),size=Number(input.size);
    if(!Number.isSafeInteger(size)||size<0||size>5*1024**3)throw new DriveManagerError(400,'Choose a file smaller than 5 GB.');
    if(typeof input.mimeType!=='string'||input.mimeType.length>160||/[\r\n]/.test(input.mimeType))throw new DriveManagerError(400,'The file type is invalid.');
    return json(res,200,await operation(req,auth,input,async()=>{
     const parent=await targetFolder(auth,input.parentId||'root');
     const endpoint=new URL('https://www.googleapis.com/upload/drive/v3/files');endpoint.searchParams.set('uploadType','resumable');endpoint.searchParams.set('fields',FILE_FIELDS);endpoint.searchParams.set('supportsAllDrives','true');
     const response=await fetcher(endpoint,{method:'POST',headers:{authorization:'Bearer '+await access(auth),'content-type':'application/json','x-upload-content-type':input.mimeType||'application/octet-stream','x-upload-content-length':String(size)},body:JSON.stringify({name:filename,mimeType:input.mimeType||'application/octet-stream',parents:[parent.id]}),signal:AbortSignal.timeout(30000)});
     const location=response.headers.get('location');
     if(!response.ok||!location||new URL(location).origin!=='https://www.googleapis.com')throw new DriveManagerError(502,'Drive did not start the upload.');
     return {ticket:seal({kind:'upload',email:auth.email,location,size,expires:clock()+86400000}),offset:0};
    }));
   }
   if(path==='/api/drive-manager/upload-chunk'&&req.method==='PUT'){
    const ticket=unseal(req.headers['x-upload-ticket']);
    if(ticket.kind!=='upload'||ticket.email!==auth.email||new URL(ticket.location).origin!=='https://www.googleapis.com')throw new DriveManagerError(403,'This upload belongs to a different connection.');
    const raw=await body(req,8*1024**2);const range=req.headers['content-range'];
    const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(range||'');
    const probe=range===`bytes */${ticket.size}`&&raw.length===0;
    if(!probe&&(!match||Number(match[3])!==ticket.size||Number(match[2])-Number(match[1])+1!==raw.length||Number(match[2])>=ticket.size||Number(match[1])%262144!==0))throw new DriveManagerError(400,'The upload chunk is invalid.');
    const response=await fetcher(ticket.location,{method:'PUT',headers:{authorization:'Bearer '+await access(auth),'content-range':range,'content-type':'application/octet-stream'},body:raw,signal:AbortSignal.timeout(120000)});
    if(response.status===308){const m=/bytes=0-(\d+)/.exec(response.headers.get('range')||'');return json(res,200,{complete:false,offset:m?Number(m[1])+1:0});}
    if(response.ok){const item=await response.json();if(!item.id||Number(item.size)!==ticket.size)throw new DriveManagerError(409,'Drive has not verified the completed upload size. Refresh before retrying.');return json(res,200,{complete:true,item});}
    throw new DriveManagerError(response.status===404?410:502,response.status===404?'The upload session expired. Start the file upload again.':'The upload paused. Resume to check how much Drive received.');
   }
   return json(res,404,{error:'This Drive Manager operation was not found.'});
  } catch(error) {
   if(res.headersSent){res.destroy();return true;}
   const status=error instanceof DriveManagerError?error.status:502;
   return json(res,status,{error:error instanceof DriveManagerError?error.message:'Drive Manager could not complete this request. Refresh to check the result.'},status===401?{'set-cookie':clearCookie}:{});
  }
 }
 return {route,configured};
}
