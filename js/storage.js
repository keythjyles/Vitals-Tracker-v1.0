/*
Vitals Tracker (Modular) — js/storage.js
App Version: v2.001
Purpose:
- Local-only persistence layer.
- MUST NOT destroy or overwrite existing user data.
- Keeps the same storage key used by v1 so the modular app reads the existing dataset seamlessly.
- Normalizes records defensively (null-safe fields, sorts newest-first).

Latest Update (v2.001):
- Initial modular storage module created.
- Uses STORAGE_KEY = "vitals_tracker_records_v1" to preserve v1 data.
- Adds strict record normalization + stable sorting.
*/

export const STORAGE_KEY = "vitals_tracker_records_v1";

function numOrNull(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function loadRecords(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr)) return [];

    return arr
      .filter(r => r && typeof r.ts === "number")
      .map(r => ({
        ts: r.ts,
        sys: numOrNull(r.sys),
        dia: numOrNull(r.dia),
        hr:  numOrNull(r.hr),
        notes: (r.notes ?? "").toString(),
        symptoms: Array.isArray(r.symptoms) ? r.symptoms.map(String) : []
      }))
      .sort((a,b)=> b.ts - a.ts); // newest first
  }catch{
    return [];
  }
}

export function saveRecords(records){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records || []));
}

/* Utility used for “Clear Data” (explicit user action only) */
export function clearAllRecords(){
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
}

/*
Vitals Tracker (Modular) — js/storage.js (EOF)
App Version: v2.001
Notes:
- Storage key is intentionally unchanged from v1 to ensure zero data loss.
- Next expected file: js/utils.js (date formatting, escaping, helpers)
*/
