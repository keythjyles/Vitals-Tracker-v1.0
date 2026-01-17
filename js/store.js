/*
Vitals Tracker (Modular) — js/store.js
App Version: v2.001
Purpose:
- Provides non-destructive data storage for v2 using IndexedDB.
- Safely reads legacy v1 data (localStorage) and copies it forward on first run only.
- Never deletes, overwrites, or mutates v1 storage.
- Exposes CRUD operations for vitals records.
- Supports JSON backup/export and restore for v2 data.

Latest Update (v2.001):
- Initial IndexedDB store created (vitals_tracker_v2 / records).
- Read-only import from legacy localStorage key(s).
- Record normalization and validation added for safety.
*/

const DB_NAME = "vitals_tracker_v2";
const DB_VERSION = 1;
const STORE_NAME = "records";

/* Legacy v1 localStorage keys (read-only) */
const LEGACY_KEYS = [
  "vitals_tracker_records_v1",
  "vitals_tracker_records"
];

let _db = null;

/* ---------- IndexedDB Core ---------- */

function openDB(){
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)){
        const store = db.createObjectStore(STORE_NAME, { keyPath: "ts" });
        store.createIndex("ts", "ts", { unique: true });
      }
    };

    req.onsuccess = e => {
      _db = e.target.result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode="readonly"){
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

/* ---------- Utilities ---------- */

function normalizeRecord(r){
  if (!r) return null;

  const ts = Number(r.ts || r.time || r.timestamp);
  if (!ts || !Number.isFinite(ts)) return null;

  return {
    ts,
    sys: r.sys != null ? Number(r.sys) : null,
    dia: r.dia != null ? Number(r.dia) : null,
    hr: r.hr != null ? Number(r.hr) : null,
    notes: typeof r.notes === "string" ? r.notes : "",
    symptoms: Array.isArray(r.symptoms) ? r.symptoms.slice() : []
  };
}

function safeParseJSON(str){
  try { return JSON.parse(str); }
  catch { return null; }
}

/* ---------- CRUD ---------- */

export async function getAllRecords(){
  const store = await tx(STORE_NAME);
  return new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

export async function getRecordsInRange(startTs, endTs){
  const all = await getAllRecords();
  return all.filter(r => r.ts >= startTs && r.ts <= endTs);
}

export async function saveRecord(record){
  const norm = normalizeRecord(record);
  if (!norm) return;

  const store = await tx(STORE_NAME, "readwrite");
  return new Promise((resolve, reject) => {
    const req = store.put(norm);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteRecord(ts){
  const store = await tx(STORE_NAME, "readwrite");
  return new Promise(resolve => {
    const req = store.delete(ts);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

export async function clearV2Data(){
  const store = await tx(STORE_NAME, "readwrite");
  return new Promise(resolve => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

/* ---------- Legacy Import (Read-Only) ---------- */

function readLegacyRecords(){
  for (const key of LEGACY_KEYS){
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    const parsed = safeParseJSON(raw);
    if (Array.isArray(parsed) && parsed.length){
      return parsed;
    }
  }
  return [];
}

export async function importFromLegacyIfEmpty(){
  const existing = await getAllRecords();
  if (existing.length) return { imported: 0, skipped: true };

  const legacy = readLegacyRecords();
  if (!legacy.length) return { imported: 0, skipped: true };

  let imported = 0;
  for (const r of legacy){
    const norm = normalizeRecord(r);
    if (!norm) continue;
    await saveRecord(norm);
    imported++;
  }
  return { imported, skipped: false };
}

/* ---------- Backup / Restore ---------- */

export async function exportJSON(){
  const records = await getAllRecords();
  return JSON.stringify({
    app: "Vitals Tracker",
    version: "v2.001",
    exportedAt: Date.now(),
    records
  }, null, 2);
}

export async function restoreFromJSON(jsonText){
  const parsed = safeParseJSON(jsonText);
  if (!parsed || !Array.isArray(parsed.records)) return false;

  for (const r of parsed.records){
    const norm = normalizeRecord(r);
    if (!norm) continue;
    await saveRecord(norm);
  }
  return true;
}

/*
Vitals Tracker (Modular) — js/store.js (EOF)
App Version: v2.001
Notes:
- Legacy data is read but never altered.
- v2 data lives exclusively in IndexedDB.
- Import occurs only when v2 store is empty.
- Next expected file: js/state.js
*/
