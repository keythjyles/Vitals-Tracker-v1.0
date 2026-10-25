// GS PreviewLock — practical Dropbox upload and playback service.
import http from 'node:http';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
const PORT=Number(process.env.PORT||3101);
const BASE='https://gs-previewlock-api.onrender.com';
const KEY=process.env.DROPBOX_APP_KEY||'';
const SECRET=process.env.DROPBOX_APP_SECRET||'';
const REFRESH=process.env.DROPBOX_REFRESH_TOKEN||'';
const ADMIN=process.env.PREVIEWLOCK_SETUP_KEY||'';
const states=new Map();
const send=(r,s,o)=>{r.writeHead(s,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'});r.end(JSON.stringify(o));};
const eq=(a,b)=>{if(!a||!b)return false;let x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
async function token(refresh=REFRESH){
 const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:refresh,client_id:KEY,client_secret:SECRET});
 const r=await fetch('https://api.dropbox.com/oauth2/token',{method:'POST',body});if(!r.ok)throw Error('Dropbox authorization failed');return (await r.json()).access_token;
}
async function metadata(path,t){const r=await fetch('https://api.dropboxapi.com/2/files/get_metadata',{method:'POST',headers:{authorization:'Bearer '+t,'content-type':'application/json'},body:JSON.stringify({path})});if(!r.ok)throw Error('Dropbox metadata failed');return r.json()}
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url||'/',BASE);
 if(req.method==='GET'&&['/','/health'].includes(u.pathname))return send(res,200,{service:'gs-previewlock-api',status:'ok',dropboxReady:Boolean(KEY&&SECRET&&REFRESH)});
 if(req.method==='GET'&&u.pathname==='/setup'){
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'});
  return res.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PreviewLock Dropbox setup</title><style>body{font:20px system-ui;background:#151515;color:white;max-width:560px;margin:40px auto;padding:16px}input,button{box-sizing:border-box;width:100%;font:20px system-ui;padding:16px;margin:12px 0;border-radius:8px}button{background:#fff;color:#111;font-weight:700}label{display:block;margin-top:20px}</style><h1>Connect Dropbox</h1><p>Paste the PreviewLock setup key from Render. It is submitted securely and will not be added to the address bar.</p><form action="/setup" method="post"><label for="key">Setup key</label><input id="key" name="key" type="password" required autocomplete="off"><button type="submit">Connect Dropbox</button></form></html>`);
 }
 if(req.method==='POST'&&u.pathname==='/setup'){
  let data='';for await(const chunk of req){data+=chunk.toString();if(data.length>4096)return send(res,413,{error:'request_too_large'});}
  const key=new URLSearchParams(data).get('key')||'';
  if(!eq(key,ADMIN)){res.writeHead(401,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end('<h2>Setup key not accepted</h2><p>Check that you copied PREVIEWLOCK_SETUP_KEY from Render, then <a href="/setup">try again</a>.</p>');}
  if(!KEY||!SECRET)return send(res,503,{error:'configure_dropbox_app_credentials'});
  const state=randomBytes(24).toString('hex');states.set(state,Date.now()+600000);
  const q=new URLSearchParams({client_id:KEY,response_type:'code',token_access_type:'offline',redirect_uri:BASE+'/oauth/dropbox/callback',state,scope:'files.metadata.read files.metadata.write files.content.read files.content.write sharing.read sharing.write'});
  res.writeHead(303,{location:'https://www.dropbox.com/oauth2/authorize?'+q.toString(),'cache-control':'no-store','referrer-policy':'no-referrer'});return res.end();
 }
 if(req.method==='GET'&&u.pathname==='/oauth/dropbox/start'){
  if(!eq(u.searchParams.get('setup'),ADMIN))return send(res,401,{error:'unauthorized'});
  if(!KEY||!SECRET)return send(res,503,{error:'configure_dropbox_app_credentials'});
  const state=randomBytes(24).toString('hex');states.set(state,Date.now()+600000);
  const q=new URLSearchParams({client_id:KEY,response_type:'code',token_access_type:'offline',redirect_uri:BASE+'/oauth/dropbox/callback',state,scope:'files.metadata.read files.metadata.write files.content.read files.content.write sharing.read sharing.write'});
  res.writeHead(302,{location:'https://www.dropbox.com/oauth2/authorize?'+q.toString()});return res.end();
 }
 if(req.method==='GET'&&u.pathname==='/oauth/dropbox/callback'){
  const state=u.searchParams.get('state');const expiry=states.get(state);states.delete(state);
  if(!expiry||expiry<Date.now()||!u.searchParams.get('code'))return send(res,400,{error:'invalid_authorization'});
  const body=new URLSearchParams({code:u.searchParams.get('code'),grant_type:'authorization_code',client_id:KEY,client_secret:SECRET,redirect_uri:BASE+'/oauth/dropbox/callback'});
  try{const r=await fetch('https://api.dropbox.com/oauth2/token',{method:'POST',body});if(!r.ok)throw Error('Dropbox authorization failed');const d=await r.json();
   // Token displayed only once in private OAuth browser; user saves directly to Render environment.
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer'});
   return res.end('<!doctype html><meta name="viewport" content="width=device-width"><title>GS PreviewLock</title><h2>Dropbox authorized</h2><p>Copy the refresh token below directly into Render environment variable DROPBOX_REFRESH_TOKEN. Do not send it in chat.</p><textarea style="width:95%;height:120px" readonly>'+d.refresh_token+'</textarea><p>After saving the Render environment variable, close this page.</p>');
  }catch{return send(res,502,{error:'dropbox_authorization_failed'})}
 }
 if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type,x-asset-name','access-control-allow-methods':'GET,POST,OPTIONS'});return res.end()}
 if(u.pathname.startsWith('/api/')){
  if(!eq(req.headers.authorization?.replace(/^Bearer /,''),ADMIN))return send(res,401,{error:'unauthorized'});
  if(!KEY||!SECRET||!REFRESH)return send(res,503,{error:'dropbox_not_configured'});
  try{
   const t=await token();
   if(req.method==='GET'&&u.pathname==='/api/assets'){
    const r=await fetch('https://api.dropboxapi.com/2/files/list_folder',{method:'POST',headers:{authorization:'Bearer '+t,'content-type':'application/json'},body:JSON.stringify({path:'/Grill Sergeant',recursive:true})});if(!r.ok)throw Error('list failed');return send(res,200,await r.json());
   }
   if(req.method==='POST'&&u.pathname==='/api/upload'){
    const name=String(req.headers['x-asset-name']||'').trim();
    if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,150}\.mp4$/i.test(name))return send(res,400,{error:'invalid_mp4_name'});
    const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>140*1024*1024)return send(res,413,{error:'file_too_large'});chunks.push(c)}
    const data=Buffer.concat(chunks);if(data.length<12||data.toString('ascii',4,8)!=='ftyp')return send(res,415,{error:'not_mp4'});
    const path='/Grill Sergeant/Timmy Motion Library/'+name;
    const r=await fetch('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{authorization:'Bearer '+t,'content-type':'application/octet-stream','dropbox-api-arg':JSON.stringify({path,mode:'add',autorename:false,mute:true})},body:data});if(!r.ok)return send(res,502,{error:'dropbox_upload_failed',detail:(await r.text()).slice(0,400)});
    const d=await r.json();const m=await metadata(d.id,t);return send(res,201,{id:d.id,path:d.path_display,size:m.size,rev:m.rev,sha256:createHash('sha256').update(data).digest('hex'),dropbox_content_hash:m.content_hash});
   }
   if(req.method==='POST'&&u.pathname==='/api/rename'){
    let raw='';for await(const c of req){raw+=c.toString();if(raw.length>4096)return send(res,413,{error:'request_too_large'})}
    let data;try{data=JSON.parse(raw)}catch{return send(res,400,{error:'invalid_json'})}
    const from=String(data.from||''),name=String(data.name||'').trim();
    if(!from.startsWith('/Grill Sergeant/')||!from.toLowerCase().endsWith('.mp4')||from.includes('..'))return send(res,400,{error:'invalid_source'});
    if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,150}\.mp4$/i.test(name))return send(res,400,{error:'invalid_mp4_name'});
    const parent=from.slice(0,from.lastIndexOf('/'));const to=parent+'/'+name;
    if(to===from)return send(res,200,{path:from,unchanged:true});
    const r=await fetch('https://api.dropboxapi.com/2/files/move_v2',{method:'POST',headers:{authorization:'Bearer '+t,'content-type':'application/json'},body:JSON.stringify({from_path:from,to_path:to,autorename:false,allow_shared_folder:false})});
    if(!r.ok){const detail=await r.text();return send(res,409,{error:'rename_failed',detail:detail.slice(0,600)})}
    const d=await r.json();return send(res,200,{path:d.metadata.path_display,name:d.metadata.name,id:d.metadata.id});
   }
   if(req.method==='GET'&&u.pathname==='/api/playback'){
    const path=u.searchParams.get('path');if(!path?.startsWith('/Grill Sergeant/'))return send(res,400,{error:'invalid_path'});
    const r=await fetch('https://api.dropboxapi.com/2/files/get_temporary_link',{method:'POST',headers:{authorization:'Bearer '+t,'content-type':'application/json'},body:JSON.stringify({path})});if(!r.ok)throw Error('link failed');return send(res,200,{url:(await r.json()).link,temporary:true});
   }
  }catch{return send(res,502,{error:'dropbox_operation_failed'})}
 }
 return send(res,404,{error:'not_found'});
});server.listen(PORT,'0.0.0.0',()=>console.log('PreviewLock listening'));
