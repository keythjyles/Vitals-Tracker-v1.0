// Read-only Gemini connection checks. Never generates content or returns credentials.
export function geminiConfiguration(env=process.env){return {configured:Boolean(env.GEMINI_API_KEY),modelConfigured:Boolean(env.GEMINI_MODEL),enabled:env.GEMINI_ENABLED==='true'}}
export async function handleGeminiPreflight(req,res,u){
 if(u.pathname!=='/api/gemini-status')return false;
 const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'});res.end(JSON.stringify(data));return true};
 if(req.method!=='GET')return send(405,{error:'method_not_allowed'});
 if(req.headers.origin&&req.headers.origin!=='https://keythjyles.github.io')return send(403,{error:'origin_not_allowed'});
 return send(200,await checkGeminiAccess());
}
let lastCheck=null;
export function geminiHealth(){return {...geminiConfiguration(),...(lastCheck?{connection:lastCheck}:{})}}
export async function checkGeminiAccess(){
 const configuration=geminiConfiguration();if(!configuration.configured)return {...configuration,authenticated:false,reason:'gemini_credential_not_configured'};
 let result;
 try{const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',{headers:{'x-goog-api-key':process.env.GEMINI_API_KEY},signal:AbortSignal.timeout(20000)});
 if(!r.ok)result={authenticated:false,reason:'gemini_auth_or_access_failed',providerStatus:r.status};
 else {const data=await r.json(),model=process.env.GEMINI_MODEL||'';result={authenticated:true,modelAvailable:(data.models||[]).some(m=>m.name==='models/'+model),generationPerformed:false}}
 }catch{result={authenticated:false,reason:'gemini_connection_check_failed'}}
 lastCheck={...result,checkedAt:new Date().toISOString()};return {...configuration,...lastCheck};
}
