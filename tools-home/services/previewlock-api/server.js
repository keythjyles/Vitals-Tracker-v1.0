// PreviewLock isolated backend — OAuth scaffolding only; no upload endpoints yet.
// No Dropbox secrets, refresh tokens, or user media are logged.
import http from 'node:http';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
const port=Number(process.env.PORT||3101);
const base=process.env.PUBLIC_BASE_URL||'';
const clientId=process.env.DROPBOX_APP_KEY||'';
const clientSecret=process.env.DROPBOX_APP_SECRET||'';
const adminKey=process.env.PREVIEWLOCK_SETUP_KEY||'';
const callbackPath='/oauth/dropbox/callback';
const stateStore=new Map();
function send(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(JSON.stringify(data));}
function secureEquals(a,b){if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function origin(req){if(!base)return '';try{const u=new URL(base);if(u.protocol!=='https:')return '';return u.origin;}catch{return '';}}
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url||'/', 'http://localhost');
  if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/health'))return send(res,200,{service:'previewlock-api',status:'ok',phase:'oauth-setup',dropboxAppConfigured:Boolean(clientId&&clientSecret),oauthCallbackConfigured:Boolean(origin(req)),uploadEnabled:false});
  if(req.method==='GET'&&u.pathname==='/oauth/dropbox/start'){
    if(!secureEquals(req.headers['x-previewlock-setup-key'],adminKey))return send(res,401,{error:'unauthorized'});
    if(!clientId||!clientSecret||!origin(req))return send(res,503,{error:'oauth_not_configured'});
    const state=randomBytes(32).toString('hex');stateStore.set(createHash('sha256').update(state).digest('hex'),Date.now()+600000);
    const q=new URLSearchParams({client_id:clientId,response_type:'code',token_access_type:'offline',redirect_uri:origin(req)+callbackPath,state,scope:'files.metadata.read files.metadata.write files.content.read files.content.write sharing.read sharing.write'});
    return send(res,200,{authorization_url:'https://www.dropbox.com/oauth2/authorize?'+q.toString(),expires_in_seconds:600});
  }
  if(req.method==='GET'&&u.pathname===callbackPath){
    const state=u.searchParams.get('state')||'';const hash=createHash('sha256').update(state).digest('hex');const expiry=stateStore.get(hash);stateStore.delete(hash);
    if(!expiry||Date.now()>expiry||!u.searchParams.has('code'))return send(res,400,{error:'invalid_or_expired_oauth_state'});
    // Intentionally do not exchange authorization codes until a secure, durable token store is configured.
    return send(res,503,{error:'token_store_not_configured',message:'OAuth callback reached, but token exchange is disabled until durable secure credential storage is configured.'});
  }
  return send(res,404,{error:'not_found'});
});
server.listen(port,'0.0.0.0',()=>console.log('PreviewLock service listening'));
