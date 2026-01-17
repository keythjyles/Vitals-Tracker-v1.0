/*
Vitals Tracker (Modular) — js/storage.js
App Version: v2.001

Purpose:
- Data persistence layer with strict “do not destroy existing data” guarantees.
- Reads/writes the ORIGINAL v1 storage key so the modular app continues using the same dataset:
    STORAGE_KEY = "vitals_tracker_records_v1"
- Provides safe load/save/clear helpers with defensive parsing and stable sorting.

Latest Update (v2.001):
- Initial modular storage module.
- Guarantees compatibility with v1.19Bx records:
  { ts:number, sys:number|null, dia:number|null, hr:number|null, notes:string, symptoms:string[] }
- Clear operation removes only STORAGE_KEY.
*/

import { STORAGE_KEY } from "./state.js";

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
      // v1 behavior sorts newest-first
      .sort((a,b)=> b.ts - a.ts);
  }catch{
    return [];
  }
}

export function saveRecords(recs){
  // expect newest-first ordering, but normalize just in case
  const safe = Array.isArray(recs) ? recs.slice() : [];
  safe
    .filter(r => r && typeof r.ts === "number")
    .sort((a,b)=> b.ts - a.ts);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
}

export function upsertRecord(record){
  const recs = loadRecords();
  const idx = recs.findIndex(r => r.ts === record.ts);
  if(idx >= 0) recs[idx] = record;
  else recs.unshift(record);
  saveRecords(recs);
}

export function deleteRecordByTs(ts){
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
- This module intentionally continues to use the v1 key so your current data remains intact.
- If you later want a new v2 key, we will add a one-time “import/migrate” routine with a user-visible confirmation.
*/
