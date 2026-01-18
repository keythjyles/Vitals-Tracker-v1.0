/* File: js/storage.js */
/*
Vitals Tracker — Storage Engine (Local-Only)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023
Base: v2.021 (user-provided working copy)
Date: 2026-01-18

This file is: 3 of 10 (v2.023 phase)
Touched in this release: YES
Module owner: ALL persistence I/O (localStorage + IndexedDB), plus legacy imports.

v2.023 Scope Anchor (do not drift)
- Restore a reliable local-only storage layer compatible with prior versions.
- Do NOT change record meaning. Do NOT “auto-fix” data beyond safe timestamp normalization.
- Read-first safety: never delete/overwrite legacy stores unless user explicitly triggers Clear Data.

Contract (used by index.html and later modules)
- window.VTStorage.loadAll() -> Promise<{ records: Array, source: string }>
- window.VTStorage.saveAll(records:Array) -> Promise<void>
- window.VTStorage.add(record:Object) -> Promise<Object savedRecord>
- window.VTStorage.update(id:String, patch:Object) -> Promise<Object updatedRecord|null>
- window.VTStorage.remove(id:String) -> Promise<boolean>
- window.VTStorage.generateId() -> String
- window.VTStorage.normalizeRecord(any) -> Object

Legacy compatibility (READ-ONLY imports; preferred order)
1) IndexedDB databases (common names used in prior builds)
2) localStorage JSON arrays (common keys used in prior builds)

Known legacy localStorage keys (read if present)
- vitals_tracker_records_v1
- vitals_tracker_records_v2
- vt_records
- vitals_records
- records
- vitals_tracker_records
- vitals_tracker_data
- vt_data

Known legacy IndexedDB names (read if present)
- vitals_tracker_db
- VitalsTrackerDB
- vitals_tracker

Indexing / Schema
- DB: vitals_tracker_db
- Object store: records
- keyPath: id (string)
- index: ts (number, ms)

Record minimum fields (not enforced; normalized on load/save)
- id: string (generated if missing)
- ts: number (ms since epoch; generated if missing)
- sys: number|null
- dia: number|null
- hr: number|null
- notes: string
- symptoms: array|string|object (preserved as-is)

IMPORTANT FOR YOU (mobile/blind workflow)
- BOF and EOF include full notes + version so you can verify immediately after paste.
*/

(function(){
  "use strict";

  const APP_VERSION = "v2.023";
  const BASE_VERSION = "v2.021";

  // ===== IndexedDB constants =====
  const DB_NAME = "vitals_tracker_db";
  const DB_VERSION = 1;
  const STORE_NAME = "records";

  // ===== LocalStorage fallbacks =====
  const LS_PRIMARY_KEY = "vitals_tracker_records_v2"; // our current chosen canonical key (array)
  const LS_LEGACY_KEYS = [
    "vitals_tracker_records_v2",
    "vitals_tracker_records_v1",
    "vitals_tracker_records",
    "vitals_tracker_data",
    "vt_records",
    "vitals_records",
    "records",
    "vt_data"
  ];

  // ===== Legacy IndexedDB names to probe (read-only import) =====
  const IDB_LEGACY_NAMES = [
    DB_NAME,
    "VitalsTrackerDB",
    "vitals_tracker"
  ];

  // ===== Utilities =====
  function nowMs(){ return Date.now(); }

  function safeNum(x){
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function toStringSafe(x){
    if(x == null) return "";
    try{ return String(x); }catch(_){ return ""; }
  }

  function parseDateToMs(val){
    // Accept: number ms, number seconds, ISO string, Date, or null.
    if(val == null) return null;
    if(typeof val === "number" && Number.isFinite(val)){
      // Heuristic: if it looks like seconds, convert.
      if(val > 0 && val < 100000000000) return Math.floor(val * 1000); // seconds range
      return Math.floor(val);
    }
    if(val instanceof Date){
      const t = val.getTime();
      return Number.isFinite(t) ? t : null;
    }
    if(typeof val === "string"){
      // Accept numeric strings or ISO.
      const trimmed = val.trim();
      if(!trimmed) return null;
      const asNum = Number(trimmed);
      if(Number.isFinite(asNum)) return parseDateToMs(asNum);
      const t = new Date(trimmed).getTime();
      return Number.isFinite(t) ? t : null;
    }
    // Unknown
    return null;
  }

  function generateId(){
    // Compact stable-ish id for offline use.
    // Example: "r_1705590000000_ab12cd"
    const t = nowMs();
    const rand = Math.random().toString(16).slice(2, 8);
    return `r_${t}_${rand}`;
  }

  function normalizeRecord(r){
    // Preserve unknown fields. Only normalize the known ones safely.
    const obj = (r && typeof r === "object") ? { ...r } : {};

    if(!obj.id) obj.id = generateId();

    // Timestamp: accept many legacy names.
    const tsCandidate =
      obj.ts ?? obj.time ?? obj.timestamp ?? obj.date ?? obj.createdAt ?? obj.created_at ?? obj.iso ?? null;

    const tms = parseDateToMs(tsCandidate);
    obj.ts = (tms != null) ? tms : nowMs();

    // BP/HR normalization (do not force if absent)
    // Support nested bp or vitals objects seen in older builds.
    const sys =
      obj.sys ?? obj.systolic ?? (obj.bp && (obj.bp.sys ?? obj.bp.systolic)) ?? null;
    const dia =
      obj.dia ?? obj.diastolic ?? (obj.bp && (obj.bp.dia ?? obj.bp.diastolic)) ?? null;
    const hr =
      obj.hr ?? obj.heartRate ?? obj.pulse ?? (obj.vitals && (obj.vitals.hr ?? obj.vitals.pulse)) ?? null;

    obj.sys = safeNum(sys);
    obj.dia = safeNum(dia);
    obj.hr  = safeNum(hr);

    // Notes normalization
    if(obj.notes == null){
      obj.notes = obj.note ?? obj.symptomsNote ?? obj.text ?? "";
    }
    obj.notes = toStringSafe(obj.notes);

    // Symptoms: preserve as-is; do not reshape.
    if(obj.symptoms == null && obj.symptom != null) obj.symptoms = obj.symptom;

    return obj;
  }

  function normalizeArray(arr){
    if(!Array.isArray(arr)) return [];
    const out = [];
    for(const r of arr){
      out.push(normalizeRecord(r));
    }
    // Keep stable ascending by ts by default (modules can sort however they want)
    out.sort((a,b) => (a.ts||0) - (b.ts||0));
    return out;
  }

  // ===== IndexedDB helpers =====
  function idbOpen(dbName){
    return new Promise((resolve, reject) => {
      if(!window.indexedDB) return resolve(null);

      const req = indexedDB.open(dbName, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        // Create only if missing; do not drop existing stores.
        if(!db.objectStoreNames.contains(STORE_NAME)){
          const store = db.createObjectStore(STORE_NAME, { keyPath:"id" });
          store.createIndex("ts", "ts", { unique:false });
        }else{
          // Ensure index exists (best effort; cannot easily change without version bump)
          try{
            const tx = req.transaction;
            const store = tx.objectStore(STORE_NAME);
            if(store && !store.indexNames.contains("ts")){
              store.createIndex("ts", "ts", { unique:false });
            }
          }catch(_){}
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
    });
  }

  function idbGetAll(db){
    return new Promise((resolve, reject) => {
      if(!db) return resolve([]);
      try{
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
        req.onerror = () => reject(req.error || new Error("IndexedDB getAll failed"));
      }catch(err){
        resolve([]); // treat as empty, not fatal
      }
    });
  }

  function idbPutAll(db, records){
    return new Promise((resolve, reject) => {
      if(!db) return resolve();
      try{
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        // Clear then put (authoritative replace). This is safe because user asked to save the full dataset locally.
        const clearReq = store.clear();
        clearReq.onerror = () => reject(clearReq.error || new Error("IndexedDB clear failed"));
        clearReq.onsuccess = () => {
          for(const r of records){
            store.put(r);
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("IndexedDB tx failed"));
      }catch(err){
        reject(err);
      }
    });
  }

  // ===== LocalStorage helpers =====
  function lsReadKey(key){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed;
    }catch(_){
      return null;
    }
  }

  function lsWriteKey(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }catch(_){
      return false;
    }
  }

  function lsFindFirstArray(){
    for(const k of LS_LEGACY_KEYS){
      const v = lsReadKey(k);
      if(Array.isArray(v)) return { key:k, arr:v };
      // Some versions stored an object wrapper {records:[...]}
      if(v && typeof v === "object" && Array.isArray(v.records)) return { key:k, arr:v.records };
    }
    return null;
  }

  // ===== Load strategy =====
  async function loadAll(){
    // 1) Try canonical DB first.
    const db = await safeOpenPreferredDB();
    if(db){
      const arr = await idbGetAll(db);
      if(arr && arr.length){
        const records = normalizeArray(arr);
        return { records, source:`indexeddb:${DB_NAME}` };
      }
    }

    // 2) Try legacy DB names (read-only import)
    for(const name of IDB_LEGACY_NAMES){
      if(name === DB_NAME) continue;
      const legacyDb = await safeOpenLegacyDB(name);
      if(!legacyDb) continue;
      const arr = await idbGetAllFromAnyStore(legacyDb);
      if(arr && arr.length){
        const records = normalizeArray(arr);
        return { records, source:`indexeddb:${name}` };
      }
    }

    // 3) Try localStorage arrays
    const hit = lsFindFirstArray();
    if(hit){
      const records = normalizeArray(hit.arr);
      return { records, source:`localStorage:${hit.key}` };
    }

    // Nothing found
    return { records: [], source:"none" };
  }

  async function safeOpenPreferredDB(){
    try{
      return await idbOpen(DB_NAME);
    }catch(_){
      return null;
    }
  }

  async function safeOpenLegacyDB(name){
    try{
      // Open WITHOUT upgrade behavior surprises:
      // We attempt DB_VERSION=1. If legacy used a higher version, open will still work at its existing version.
      return await new Promise((resolve) => {
        if(!window.indexedDB) return resolve(null);
        const req = indexedDB.open(name);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
    }catch(_){
      return null;
    }
  }

  async function idbGetAllFromAnyStore(db){
    // Legacy DBs might not use STORE_NAME. We will try reasonable candidates.
    if(!db) return [];
    const candidates = [];

    try{
      for(let i=0;i<db.objectStoreNames.length;i++){
        candidates.push(db.objectStoreNames.item(i));
      }
    }catch(_){}

    // Prefer common names if present.
    const preferred = ["records", "vitals", "entries", "log", "data"];
    preferred.forEach(p => {
      if(db.objectStoreNames && db.objectStoreNames.contains && db.objectStoreNames.contains(p)){
        candidates.unshift(p);
      }
    });

    const tried = new Set();
    for(const storeName of candidates){
      if(!storeName || tried.has(storeName)) continue;
      tried.add(storeName);
      const arr = await new Promise((resolve) => {
        try{
          const tx = db.transaction(storeName, "readonly");
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
          req.onerror = () => resolve([]);
        }catch(_){
          resolve([]);
        }
      });
      if(arr && arr.length) return arr;
    }
    return [];
  }

  // ===== Save strategy =====
  async function saveAll(records){
    const normalized = normalizeArray(records);

    // 1) Write to IndexedDB canonical
    const db = await safeOpenPreferredDB();
    if(db){
      try{
        await idbPutAll(db, normalized);
      }catch(_){
        // fall through to localStorage
      }
    }

    // 2) Also write a localStorage mirror for resilience.
    // (This is safe and makes recovery easier even if IDB fails.)
    lsWriteKey(LS_PRIMARY_KEY, normalized);

    return;
  }

  // ===== CRUD helpers (load-modify-save) =====
  async function add(record){
    const { records } = await loadAll();
    const r = normalizeRecord(record || {});
    records.push(r);
    await saveAll(records);
    return r;
  }

  async function update(id, patch){
    if(!id) return null;
    const { records } = await loadAll();
    const idx = records.findIndex(r => r && r.id === id);
    if(idx === -1) return null;
    const next = normalizeRecord({ ...records[idx], ...(patch || {}), id });
    records[idx] = next;
    await saveAll(records);
    return next;
  }

  async function remove(id){
    if(!id) return false;
    const { records } = await loadAll();
    const before = records.length;
    const filtered = records.filter(r => r && r.id !== id);
    if(filtered.length === before) return false;
    await saveAll(filtered);
    return true;
  }

  // ===== Export global API =====
  const VTStorage = {
    APP_VERSION,
    BASE_VERSION,
    DB_NAME,
    DB_VERSION,
    STORE_NAME,
    LS_PRIMARY_KEY,
    LS_LEGACY_KEYS: LS_LEGACY_KEYS.slice(),
    IDB_LEGACY_NAMES: IDB_LEGACY_NAMES.slice(),

    generateId,
    normalizeRecord,

    loadAll,
    saveAll,

    add,
    update,
    remove
  };

  if(!window.VTStorage){
    window.VTStorage = VTStorage;
  }else{
    // Do not overwrite existing storage authority silently.
    try{ console.warn("[VTStorage] Duplicate load detected. Keeping existing authority."); }catch(_){}
  }

})();

/* EOF: js/storage.js */
/*
App Version: v2.023
Base: v2.021
Touched in this release: YES

What changed in this file (v2.023):
- Rebuilt storage engine with safe legacy imports (IDB + localStorage).
- Established canonical DB/store and localStorage mirror key.
- Added CRUD helpers (add/update/remove) using load-modify-save discipline.

Next file to deliver (on "N" / "Next"):
- File 4 of 10: js/chart.js
*/
