import {createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
import {AudioError, DRIVE_LIBRARY_FOLDER} from './audio-store.mjs';

const appOrigin = 'https://keythjyles.github.io';
const callback = 'https://gs-previewlock-api.onrender.com/oauth/google/callback';
const owner = 'kjiles71@gmail.com';
const scope = 'https://www.googleapis.com/auth/drive.file';
const stateCookie = '__Host-gs-audio-drive';
const verifierPattern = /^[a-f0-9]{64}$/;
const prefix = 'gs-audio-drive.';

export function audioDriveAuth({key, clientId, clientSecret, fetcher = fetch}) {
 const configured = Boolean(key && clientId && clientSecret);
 const signingKey = configured ? createHmac('sha256', clientSecret).update('Sound Scrubber Drive ' + key).digest() : null;
 const sign = value => createHmac('sha256', signingKey).update(value).digest('base64url');
 let cached = null;
 let pending = null;

 function seal(refreshToken) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', signingKey, iv);
  const data = Buffer.concat([cipher.update(refreshToken, 'utf8'), cipher.final()]);
  return prefix + Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
 }

 function unseal(session) {
  try {
   if (!configured || !session?.startsWith(prefix) || session.length > 2048) throw Error();
   const bytes = Buffer.from(session.slice(prefix.length), 'base64url');
   const cipher = createDecipheriv('aes-256-gcm', signingKey, bytes.subarray(0, 12));
   cipher.setAuthTag(bytes.subarray(12, 28));
   const token = Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString();
   if (!token) throw Error();
   return token;
  } catch {
   throw new AudioError(401, 'Connect Google Drive to save approved sounds.');
  }
 }

 async function exchange(parameters) {
  const body = new URLSearchParams({client_id: clientId, client_secret: clientSecret, ...parameters});
  const response = await fetcher('https://oauth2.googleapis.com/token', {method: 'POST', body, signal: AbortSignal.timeout(15000)});
  const data = await response.json().catch(() => ({}));
  if (data.error === 'invalid_grant') throw new AudioError(401, 'Reconnect Google Drive to finish saving.');
  if (!response.ok || !data.access_token) throw new AudioError(502, 'Google Drive sign-in is temporarily unavailable.');
  if (data.scope && !data.scope.split(' ').includes(scope)) throw new AudioError(401, 'Allow Sound Scrubber to save files in Google Drive.');
  return data;
 }

 async function accessToken(session) {
  if (!session) throw new AudioError(401, 'Connect Google Drive to save approved sounds.');
  if (cached?.session === session && cached.until > Date.now()) return cached.token;
  if (pending?.session === session) return pending.promise;
  const refreshToken = unseal(session);
  const promise = exchange({grant_type: 'refresh_token', refresh_token: refreshToken}).then(data => {
   cached = {session, token: data.access_token, until: Date.now() + Math.max(0, (Number(data.expires_in) || 3600) - 60) * 1000};
   return cached.token;
  });
  pending = {session, promise};
  try {
   return await promise;
  } finally {
   if (pending?.promise === promise) pending = null;
  }
 }

 function page(res, status, message, result = null) {
  const nonce = randomBytes(18).toString('base64');
  const script = result ? `<script nonce="${nonce}">window.opener?.postMessage(${JSON.stringify(result)},${JSON.stringify(appOrigin)});window.close();</script>` : '';
  res.writeHead(status, {
   'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer',
   'x-content-type-options': 'nosniff', 'content-security-policy': `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'`,
   'set-cookie': `${stateCookie}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`,
  });
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sound Scrubber Google Drive</title><p>${message}</p>${script}</html>`);
  return true;
 }

 async function route(req, res, url) {
  if (req.method !== 'GET') return false;
  if (url.pathname === '/oauth/audio-drive/start') {
   const verifier = url.searchParams.get('verifier') || '';
   if (!configured || !verifierPattern.test(verifier)) return page(res, 503, 'Google Drive connection could not start. Return to Sound Scrubber and try again.');
   const value = `${prefix}${Date.now()}.${verifier}.${randomBytes(16).toString('hex')}`;
   const state = value + '.' + sign(value);
   const query = new URLSearchParams({
    client_id: clientId, redirect_uri: callback, response_type: 'code', scope, state, login_hint: owner,
    prompt: 'consent', access_type: 'offline', trigger_onepick: 'true', allow_folder_selection: 'true',
    mimetypes: 'application/vnd.google-apps.folder', file_ids: DRIVE_LIBRARY_FOLDER,
   });
   res.writeHead(302, {
    location: 'https://accounts.google.com/o/oauth2/v2/auth?' + query, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer',
    'set-cookie': `${stateCookie}=${state}; Path=/; Max-Age=600; Secure; HttpOnly; SameSite=Lax`,
   });
   res.end();
   return true;
  }

  const state = url.searchParams.get('state') || '';
  if (url.pathname !== '/oauth/google/callback' || !state.startsWith(prefix)) return false;
  const [, time, verifier, nonce, mac, extra] = state.split('.');
  const age = Date.now() - Number(time);
  const cookie = (req.headers.cookie || '').split('; ').find(item => item.startsWith(stateCookie + '='))?.slice(stateCookie.length + 1);
  const value = `${prefix}${time}.${verifier}.${nonce}`;
  if (!configured || extra !== undefined || !verifierPattern.test(verifier || '') || !/^\d{13}$/.test(time || '') ||
      !/^[a-f0-9]{32}$/.test(nonce || '') || !/^[A-Za-z0-9_-]{43}$/.test(mac || '') ||
      age < 0 || age > 600000 || cookie !== state || !timingSafeEqual(Buffer.from(mac), Buffer.from(sign(value)))) {
   return page(res, 400, 'Google Drive connection expired. Open it again from Sound Scrubber.');
  }
  const fail = (status, error) => page(res, status, error, {verifier, error});
  const code = url.searchParams.get('code');
  if (!code) return fail(400, 'Google Drive connection was canceled.');
  const picked = url.searchParams.get('picked_file_ids');
  if (picked && picked !== DRIVE_LIBRARY_FOLDER) return fail(403, 'Select the existing Sound Effects folder.');
  try {
   const data = await exchange({grant_type: 'authorization_code', redirect_uri: callback, code});
   const headers = {authorization: 'Bearer ' + data.access_token};
   const options = {headers, signal: AbortSignal.timeout(15000)};
   const [account, folder] = await Promise.all([
    fetcher('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', options),
    fetcher('https://www.googleapis.com/drive/v3/files/' + DRIVE_LIBRARY_FOLDER + '?fields=id,mimeType,trashed,capabilities(canAddChildren)&supportsAllDrives=true', options),
   ]);
   if (!account.ok || (await account.json()).user?.emailAddress?.toLowerCase() !== owner) {
    return fail(403, 'Use the Grill Sergeant Google account to connect Sound Effects.');
   }
   const target = folder.ok ? await folder.json() : null;
   if (target?.id !== DRIVE_LIBRARY_FOLDER || target.mimeType !== 'application/vnd.google-apps.folder' ||
       target.trashed || !target.capabilities?.canAddChildren) return fail(403, 'Grant access to the existing Sound Effects folder in Google Drive.');
   if (!data.refresh_token) return fail(409, 'Google Drive did not grant background saving. Connect again and accept the folder access.');
   const session = seal(data.refresh_token);
   cached = {session, token: data.access_token, until: Date.now() + Math.max(0, (Number(data.expires_in) || 3600) - 60) * 1000};
   return page(res, 200, 'Google Drive is connected. Return to Sound Scrubber.', {verifier, session});
  } catch (error) {
   return fail(error instanceof AudioError ? error.status : 502, error instanceof AudioError ? error.message : 'Google Drive connection failed. Try again.');
  }
 }

 return {route, accessToken, configured};
}
