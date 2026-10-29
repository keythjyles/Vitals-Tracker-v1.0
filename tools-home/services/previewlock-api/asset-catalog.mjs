// Read every Dropbox page; a partial catalog must never masquerade as complete.
export async function listAssets(token,{fetcher=fetch}={}){
 const entries=[],seen=new Set();let cursor=null;
 for(let page=0;page<100;page++){
  const r=await fetcher('https://api.dropboxapi.com/2/files/'+(cursor?'list_folder/continue':'list_folder'),{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(cursor?{cursor}:{path:'/Grill Sergeant',recursive:true,limit:2000}),signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error('asset_catalog_failed');const d=await r.json();
  entries.push(...(d.entries||[]));if(!d.has_more)return {entries,cursor:d.cursor,has_more:false};
  if(!d.cursor||seen.has(d.cursor))throw Error('asset_catalog_cursor_invalid');seen.add(d.cursor);cursor=d.cursor;
 }
 throw Error('asset_catalog_page_limit');
}
