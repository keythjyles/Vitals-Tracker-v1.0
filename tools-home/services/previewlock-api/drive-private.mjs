// Private Google Drive read-only OAuth. Never exposes tokens in public routes.
// Requires a Google OAuth web client configured in Render, plus one-time refresh token.
import {randomBytes} from 'node:crypto';
export const FG01_MASTER_ID='1JiPRsOsiLZzZZXIHgzgey2pDHmYJh1cW';
const callback='https://gs-previewlock-api.onrender.com/oauth/google/callback';
const scope='https://www.googleapis.com/auth/drive.readonly';
const states=new Map();
const driveErrorReasons=new Set([
 'SERVICE_DISABLED','accessNotConfigured','API_DISABLED','ACCESS_TOKEN_SCOPE_INSUFFICIENT',
 'insufficientPermissions','notFound','appNotAuthorizedToFile','fileNotDownloadable',
 'cannotDownloadFile','domainPolicy','downloadRestrictedForRevision','rateLimitExceeded',
 'userRateLimitExceeded','storageQuotaExceeded','forbidden','PERMISSION_DENIED',
]);
const send=(res,status,html)=>{res.writeHead(status,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'});res.end(html);return true};
export function googleDriveReady(){return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID&&process.env.GOOGLE_OAUTH_CLIENT_SECRET&&process.env.GOOGLE_DRIVE_REFRESH_TOKEN)}
async function driveError(response){
 const {error}=await response.json().catch(()=>({}));
 const reasons=[...Array.from(error?.details??[],d=>d.reason),...Array.from(error?.errors??[],d=>d.reason),error?.status];
 const reason=reasons.find(value=>driveErrorReasons.has(value));
 return 'drive_asset_http_'+response.status+(reason?'_'+reason:'');
}
export async function driveFile(fileId,{minBytes=1000,maxBytes=10000000}={}){
 if(!googleDriveReady())throw Error('private_drive_not_connected');
 const body=new URLSearchParams({client_id:process.env.GOOGLE_OAUTH_CLIENT_ID,client_secret:process.env.GOOGLE_OAUTH_CLIENT_SECRET,refresh_token:process.env.GOOGLE_DRIVE_REFRESH_TOKEN,grant_type:'refresh_token'});
 const auth=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body,signal:AbortSignal.timeout(15000)});
 if(!auth.ok)throw Error('drive_refresh_failed');const data=await auth.json();
 const r=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(fileId)+'?alt=media&supportsAllDrives=true',{headers:{authorization:'Bearer '+data.access_token},signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(await driveError(r));const bytes=Buffer.from(await r.arrayBuffer());
 if(bytes.length<minBytes||bytes.length>maxBytes)throw Error('drive_asset_size_invalid');
 return bytes;
}
export async function googleOAuthRoutes(req,res,u){
 if(u.pathname==='/oauth/google/status'&&req.method==='GET'){
  let reason='credentials_missing';
  if(googleDriveReady()){
   try{await driveFile(FG01_MASTER_ID);reason='approved_master_retrieved'}
   catch(error){
    const code=error.message;
    reason=/^drive_(?:refresh_failed|asset_size_invalid|asset_http_\d{3}(?:_[A-Za-z_]+)?)$/.test(code)?code:'drive_verification_failed';
   }
  }
  const verified=reason==='approved_master_retrieved';
  return send(res,verified?200:503,'<!doctype html><meta name="viewport" content="width=device-width"><title>Private Drive status</title><h2>Private Drive: '+(verified?'CONNECTED':'NOT VERIFIED')+'</h2><p>FG-01 approved master: '+reason+'</p>');
 }
 if(u.pathname==='/oauth/google/start'&&req.method==='GET'){
  if(!process.env.GOOGLE_OAUTH_CLIENT_ID||!process.env.GOOGLE_OAUTH_CLIENT_SECRET)return send(res,503,'<!doctype html><meta name="viewport" content="width=device-width"><title>GS private Drive setup</title><style>body{font:18px system-ui;max-width:650px;margin:30px auto;padding:18px;line-height:1.5}code{overflow-wrap:anywhere}</style><h2>One-time private Google Drive connection</h2><p>The backend is deployed. Google OAuth credentials are the remaining setup requirement.</p><ol><li>Open <a href="https://console.cloud.google.com/apis/credentials">Google Cloud Credentials</a> using the Google account that owns the Field Guide asset.</li><li>Select or create a Google Cloud project and enable the <a href="https://console.cloud.google.com/apis/library/drive.googleapis.com">Google Drive API</a>.</li><li>Configure the OAuth consent screen for your account. Add yourself as a test user if the app is in testing.</li><li>Create an OAuth client of type <b>Web application</b> with this exact authorized redirect URI:<p><code>'+callback+'</code></p></li><li>In <a href="https://dashboard.render.com/web/srv-dberk21srm7s73d4kqr0/env">Render environment</a>, set <code>GOOGLE_OAUTH_CLIENT_ID</code> and <code>GOOGLE_OAUTH_CLIENT_SECRET</code> to the values from Google. Never paste either into ChatGPT.</li><li>After Render redeploys, return to <a href="/oauth/google/start">Connect private Drive</a> and approve the Google permission request.</li></ol><p>Drive remains private. The app requests read-only Drive access for source files.</p>');
  const state=randomBytes(24).toString('hex');states.set(state,Date.now()+600000);
  const p=new URLSearchParams({client_id:process.env.GOOGLE_OAUTH_CLIENT_ID,redirect_uri:callback,response_type:'code',scope,access_type:'offline',prompt:'consent',state});
  res.writeHead(302,{location:'https://accounts.google.com/o/oauth2/v2/auth?'+p.toString(),'cache-control':'no-store'});res.end();return true;
 }
 if(u.pathname==='/oauth/google/callback'&&req.method==='GET'){
  const state=u.searchParams.get('state'),expiry=states.get(state);states.delete(state);
  if(!expiry||expiry<Date.now()||!u.searchParams.get('code'))return send(res,400,'<h2>Invalid or expired authorization</h2>');
  const body=new URLSearchParams({client_id:process.env.GOOGLE_OAUTH_CLIENT_ID,client_secret:process.env.GOOGLE_OAUTH_CLIENT_SECRET,redirect_uri:callback,grant_type:'authorization_code',code:u.searchParams.get('code')});
  try{const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body});if(!r.ok)throw Error('exchange_failed');const t=await r.json();if(!t.refresh_token)return send(res,409,'<h2>Google did not issue an offline refresh token</h2>');
   // One-time private setup. Never send the token to ChatGPT or a public URL.
   return send(res,200,'<!doctype html><meta name="viewport" content="width=device-width"><meta name="referrer" content="no-referrer"><h2>Google Drive authorized</h2><p>Save this one-time token as GOOGLE_DRIVE_REFRESH_TOKEN in the existing Render service Environment page. Do not paste it into chat.</p><textarea readonly style="width:95%;height:120px">'+t.refresh_token.replace(/[<>&]/g,'')+'</textarea>');
  }catch{return send(res,502,'<h2>Google authorization failed</h2>')}
 }
 return false;
}
