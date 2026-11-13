import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto';

const base = 'https://gs-previewlock-api.onrender.com';
const callback = `${base}/oauth/google/callback`;
const pages = 'https://keythjyles.github.io';
const owner = 'kjiles71@gmail.com';
const stateCookie = '__Host-sx-scribe-state';
const verifierPattern = /^[a-f0-9]{64}$/;
const ttl = 30 * 24 * 60 * 60;

export function scribeAuth({key, clientId, clientSecret, fetcher = fetch}) {
 const sign = (scope, value) => createHmac('sha256', key).update(`${scope}:${value}`).digest('base64url');
 function matches(a, b) {
  const value = Buffer.from(a || '');
  const expected = Buffer.from(b);
  return value.length === expected.length && timingSafeEqual(value, expected);
 }
 function verify(session) {
  if (!key || !session || !/^sx-scribe\.\d{10}\.[a-f0-9]{32}\.[A-Za-z0-9_-]{43}$/.test(session)) return false;
  const [prefix, expires, id, mac] = session.split('.');
  const value = `${prefix}.${expires}.${id}`;
  return Number(expires) > Date.now() / 1000 && matches(mac, sign('session', value));
 }
 function page(res, code, message, data = null) {
  const nonce = randomBytes(18).toString('base64');
  const script = data ? `<script nonce="${nonce}">window.opener?.postMessage(${JSON.stringify(data)},${JSON.stringify(pages)});window.close();</script>` : '';
  res.writeHead(code, {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer',
   'x-content-type-options': 'nosniff', 'content-security-policy': `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'`,
   'set-cookie': `${stateCookie}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`});
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Scribe sign-in</title><p>${message}</p>${script}</html>`);
  return true;
 }
 async function route(req, res, url) {
  const state = url.searchParams.get('state') || '';
  if (req.method === 'GET' && url.pathname === '/oauth/scribe/start') {
   const verifier = url.searchParams.get('verifier');
   if (!key || !clientId || !clientSecret || !verifierPattern.test(verifier || '')) return page(res, 503, 'Scribe sign-in is unavailable.');
   const value = `sx-scribe.${Date.now()}.${verifier}.${randomBytes(16).toString('hex')}`;
   const signed = `${value}.${sign('oauth', value)}`;
   const query = new URLSearchParams({client_id: clientId, redirect_uri: callback, response_type: 'code',
    scope: 'openid email', state: signed, login_hint: owner});
   res.writeHead(302, {location: `https://accounts.google.com/o/oauth2/v2/auth?${query}`, 'cache-control': 'no-store',
    'referrer-policy': 'no-referrer', 'set-cookie': `${stateCookie}=${signed}; Path=/; Max-Age=600; Secure; HttpOnly; SameSite=Lax`});
   res.end();
   return true;
  }
  if (req.method !== 'GET' || url.pathname !== '/oauth/google/callback' || !state.startsWith('sx-scribe.')) return false;
  const [prefix, time, verifier, nonce, mac] = state.split('.');
  const age = Date.now() - Number(time);
  const cookie = (req.headers.cookie || '').split('; ').find(item => item.startsWith(`${stateCookie}=`))?.slice(stateCookie.length + 1);
  if (!key || !clientId || !clientSecret || !verifierPattern.test(verifier || '') || !/^[a-f0-9]{32}$/.test(nonce || '') ||
      !/^\d{13}$/.test(time || '') || age < 0 || age > 600000 || cookie !== state ||
      !matches(mac, sign('oauth', `${prefix}.${time}.${verifier}.${nonce}`))) return page(res, 400, 'Scribe sign-in expired. Open it again from SxLock.');
  const code = url.searchParams.get('code');
  if (!code) return page(res, 400, 'Scribe sign-in was canceled.', {verifier, error: 'Sign-in was canceled.'});
  try {
   const body = new URLSearchParams({client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', redirect_uri: callback, code});
   const auth = await fetcher('https://oauth2.googleapis.com/token', {method: 'POST', body, signal: AbortSignal.timeout(15000)});
   if (!auth.ok) throw Error('OAuth exchange failed');
   const {access_token: accessToken} = await auth.json();
   if (!accessToken) throw Error('OAuth access token missing');
   const user = await fetcher('https://openidconnect.googleapis.com/v1/userinfo', {headers: {authorization: `Bearer ${accessToken}`}, signal: AbortSignal.timeout(15000)});
   if (!user.ok) throw Error('OAuth user info failed');
   const account = await user.json();
   if (account.email?.toLowerCase() !== owner || account.email_verified !== true) {
    return page(res, 403, 'Use the Google account that owns this Scribe history.', {verifier, error: 'Use your Grill Sergeant Google account.'});
   }
   const value = `sx-scribe.${Math.floor(Date.now() / 1000) + ttl}.${randomBytes(16).toString('hex')}`;
   return page(res, 200, 'Scribe connected. Return to SxLock.', {verifier, session: `${value}.${sign('session', value)}`});
  } catch { return page(res, 502, 'Scribe sign-in could not be completed.', {verifier, error: 'Google sign-in is unavailable. Try again.'}); }
 }
 return {route, verify};
}
