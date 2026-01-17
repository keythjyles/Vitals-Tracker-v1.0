/*
Vitals Tracker (Modular) — js/storage.js
App Version: v2.001
Purpose:
- Single source of truth for persistence.
- CRITICAL: Preserve existing v1 data by using the SAME storage key:
    "vitals_tracker_records_v1"
  This ensures modular v2 reads the same dataset and does not overwrite/migrate unless you explicitly ask.

Data Safety Rules:
- loadRecords() is defensive: validates shape and sorts newest-first.
- saveRecords() writes JSON to the same key.
- clearAllRecords() removes only the known key.
- No automatic migrations; no schema changes; no alternate keys.

Latest Update (v2.001):
- Initial modular storage layer preserving v1 key and structure.
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
      .sort((a,b)=> b.ts - a.ts);
  }catch{
    return [];
  }
}

export function saveRecords(recs){
  // Expect newest-first; caller can sort. We will not re-order beyond a minimal sanity sort.
  const safe = Array.isArray(recs) ? recs : [];
  safe.sort((a,b)=> (b?.ts||0) - (a?.ts||0));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
}

export function upsertRecord(record){
  const recs = loadRecords();
  const ts = record?.ts;
  if(typeof ts !== "number") return;

  const idx = recs.findIndex(r => r.ts === ts);
  const clean = {
    ts,
    sys: numOrNull(record.sys),
    dia: numOrNull(record.dia),
    hr:  numOrNull(record.hr),
    notes: (record.notes ?? "").toString(),
    symptoms: Array.isArray(record.symptoms) ? record.symptoms.map(String) : []
  };

  if(idx >= 0) recs[idx] = clean;
  else recs.unshift(clean);

  recs.sort((a,b)=> b.ts - a.ts);
  saveRecords(recs);
}

export function deleteRecord(ts){
  if(typeof ts !== "number") return;
  const recs = loadRecords().filter(r => r.ts !== ts);
  saveRecords(recs);
}

export function clearAllRecords(){
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
}

/*
Vitals Tracker (Modular) — js/storage.js (EOF)
App Version: v2.001
Notes:
- Uses v1 storage key exactly to preserve all existing records.
- No migrations, no secondary keys, no schema changes.
- Next expected file: js/utils.js (helpers: $, escape, date/time formatting, clamp, etc.)
*/
