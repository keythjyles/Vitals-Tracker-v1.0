/* File: js/storage.js */
/*
Vitals Tracker — Storage Bridge (Read/Write Compatible)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version Authority: js/version.js
Base: v2.028a

FILE ROLE (LOCKED)
- Single storage abstraction for the app.
- Provides a SAFE, defensive bridge across legacy LocalStorage keys and possible IndexedDB layouts.
- Chart/Log must pull records via VTStorage.getAllRecords().

VERIFICATION NOTES (THIS EDIT ONLY — NOT FUTURE INSTRUCTIONS)
- Verified exported API surface: detect(), getAllRecords(), putRecord(), deleteRecordById().
- Verified canonical LocalStorage key write path is enabled and cache invalidates on write/delete.
- Verified normalization outputs canonical shape:
  { ts:number, sys:number|null, dia:number|null, hr:number|null, notes:string, symptoms:string[] }.
- Verified IndexedDB writes/deletes remain best-effort and never block LocalStorage persistence.
*/

(function () {
  "use strict";

  function vStr(){
    try{ return window.VTVersion?.getVersionString?.() || "v?.???"; }catch(_){ return "v?.???"; }
  }

  // ---- In-session cache (read stabilization) ----
  let _cache = null;          // { source, records:Array }
  let _cacheAt = 0;           // ms
  const CACHE_TTL_MS = 4000;

  function cacheSet(obj){
    _cache = obj ? { source: obj.source, records: Array.isArray(obj.records) ? obj.records.slice() : [] } : null;
    _cacheAt = Date.now();
  }
  function cacheGet(){
    if(!_cache) return null;
    if((Date.now() - _cacheAt) > CACHE_TTL_MS) return null;
    return { source: _cache.source, records: _cache.records.slice() };
  }
  function cacheClear(){
    _cache = null;
    _cacheAt = 0;
  }

  // ---- Canonical LocalStorage key (must match v1.19B44 and legacy) ----
  const CANON_LS_KEY = "vitals_tracker_records_v1";

  // ---- Known legacy LocalStorage keys (scan) ----
  const LS_KEYS = [
    "vitals_tracker_records_v1",
    "vitals_tracker_records",
    "vitals_records",
    "vitalsTrackerRecords",
    "vt_records",
    "records",
  ];

  function safeJSONParse(str) {
    try { return JSON.parse(str); } catch (_) { return null; }
  }

  function normalizeArray(maybe) {
    if (!maybe) return [];
    if (Array.isArray(maybe)) return maybe;
    if (typeof maybe === "object") {
      if (Array.isArray(maybe.records)) return maybe.records;
      if (Array.isArray(maybe.data)) return maybe.data;
      if (Array.isArray(maybe.items)) return maybe.items;
    }
    return [];
  }

  // ---- Value parsing ----
  function numOrNull(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function intOrNull(v){
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  // ---- Timestamp extraction/normalization ----
  function extractTs(r) {
    return r?.ts ?? r?.time ?? r?.timestamp ?? r?.date ?? r?.createdAt ?? r?.created_at ?? r?.iso ?? null;
  }
  function toMs(ts) {
    try {
      const t = new Date(ts || 0).getTime();
      return Number.isFinite(t) ? t : 0;
    } catch (_) {
      return 0;
    }
  }

  // ---- Record normalization (CRITICAL) ----
  // Accepts many shapes, outputs canonical v1/v2 shape.
  function normalizeRecord(r){
    if(!r || typeof r !== "object") return null;

    const tsRaw = extractTs(r);
    const ts = toMs(tsRaw);
    if(!ts) return null;

    // Common field aliases
    const sys = (r.sys ?? r.systolic ?? r.SYS ?? r.bpSys ?? r.bp_systolic ?? null);
    const dia = (r.dia ?? r.diastolic ?? r.DIA ?? r.bpDia ?? r.bp_diastolic ?? null);
    const hr  = (r.hr  ?? r.heartRate ?? r.pulse ?? r.HR ?? r.bpm ?? null);

    let notes = (r.notes ?? r.note ?? r.comment ?? r.comments ?? "");
    if(notes == null) notes = "";
    notes = String(notes);

    let symptoms = (r.symptoms ?? r.symptom ?? r.sx ?? r.symptomList ?? r.symptom_list ?? []);
    if(!Array.isArray(symptoms)){
      // tolerate comma-separated string
      if(typeof symptoms === "string") symptoms = symptoms.split(",").map(s=>s.trim()).filter(Boolean);
      else symptoms = [];
    }
    symptoms = symptoms.map(String);

    return {
      ts,
      sys: numOrNull(sys),
      dia: numOrNull(dia),
      hr:  numOrNull(hr),
      notes,
      symptoms
    };
  }

  function normalizeRecords(arr){
    const out = [];
    for(const r of (arr || [])){
      const n = normalizeRecord(r);
      if(n) out.push(n);
    }
    // newest-first canonical ordering
    out.sort((a,b)=> b.ts - a.ts);
    return out;
  }

  function newestMs(arr) {
    let m = 0;
    for (const r of arr || []) {
      const ms = toMs(extractTs(r));
      if (ms > m) m = ms;
    }
    return m;
  }

  // ---- LocalStorage read helpers ----
  function readLocalStorageCandidates() {
    const found = [];

    for (const k of LS_KEYS) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = safeJSONParse(raw);
        const arr = normalizeArray(parsed);
        if (arr.length) found.push({ source: `localStorage:${k}`, records: arr });
      } catch (_) {}
    }

    // Additional: scan some keys for array-like payloads (safe cap)
    try {
      const limit = Math.min(localStorage.length, 40);
      for (let i = 0; i < limit; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (LS_KEYS.includes(key)) continue;
        const raw = localStorage.getItem(key);
        if (!raw || raw.length < 10) continue;
        const parsed = safeJSONParse(raw);
        const arr = normalizeArray(parsed);
        if (arr.length && typeof arr[0] === "object") {
          found.push({ source: `localStorage:${key}`, records: arr });
        }
      }
    } catch (_) {}

    return found;
  }

  // ---- IndexedDB scan helpers (best-effort, never throws) ----
  const IDB_DBS = [
    "vitals_tracker_db",
    "VitalsTrackerDB",
    "vitals_tracker",
    "VT_DB",
  ];

  const IDB_STORES = [
    "records",
    "readings",
    "entries",
    "vitals",
  ];

  function idbOpen(dbName) {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
  }

  function idbReadAllFromStore(db, storeName) {
    return new Promise((resolve) => {
      try {
        if (!db.objectStoreNames || !db.objectStoreNames.contains(storeName)) return resolve([]);
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);

        if (store.getAll) {
          const req = store.getAll();
          req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
          req.onerror = () => resolve([]);
          return;
        }

        const out = [];
        const cur = store.openCursor();
        cur.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) { out.push(cursor.value); cursor.continue(); }
          else resolve(out);
        };
        cur.onerror = () => resolve([]);
      } catch (_) {
        resolve([]);
      }
    });
  }

  async function readIndexedDBCandidates() {
    const found = [];
    if (!("indexedDB" in window)) return found;

    for (const dbName of IDB_DBS) {
      const db = await idbOpen(dbName);
      if (!db) continue;

      try {
        for (const storeName of IDB_STORES) {
          const rows = await idbReadAllFromStore(db, storeName);
          if (rows && rows.length) found.push({ source: `indexedDB:${dbName}/${storeName}`, records: rows });
        }
      } catch (_) {
        // ignore
      } finally {
        try { db.close(); } catch (_) {}
      }
    }

    return found;
  }

  // ---- Choose best candidate set (prefer more records; tie-break by newest ts) ----
  function chooseBest(candidates) {
    if (!candidates || !candidates.length) return { source: "none", records: [] };

    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i];
      const aLen = best.records.length;
      const bLen = c.records.length;

      if (bLen > aLen) { best = c; continue; }
      if (bLen === aLen) {
        if (newestMs(c.records) > newestMs(best.records)) best = c;
      }
    }
    return best;
  }

  // ---- IDB "detected write target" (best-effort) ----
  async function detectWritableIDBTarget(){
    if (!("indexedDB" in window)) return null;

    for (const dbName of IDB_DBS) {
      const db = await idbOpen(dbName);
      if (!db) continue;

      try {
        for (const storeName of IDB_STORES) {
          if (db.objectStoreNames && db.objectStoreNames.contains(storeName)) {
            try { db.close(); } catch(_) {}
            return { dbName, storeName };
          }
        }
      } catch (_) {
        // ignore
      } finally {
        try { db.close(); } catch (_) {}
      }
    }
    return null;
  }

  async function idbPutRecord(target, record){
    if(!target) return { ok:false, reason:"no-idb-target" };
    const { dbName, storeName } = target;

    return new Promise(async (resolve) => {
      let db = null;
      try{
        db = await idbOpen(dbName);
        if(!db) return resolve({ ok:false, reason:"idb-open-failed" });
        if(!db.objectStoreNames || !db.objectStoreNames.contains(storeName)){
          try{ db.close(); }catch(_){}
          return resolve({ ok:false, reason:"idb-store-missing" });
        }

        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);

        let req;
        try{
          req = store.put ? store.put(record) : store.add(record);
        }catch(_){
          try{ db.close(); }catch(__){}
          return resolve({ ok:false, reason:"idb-write-throw" });
        }

        req.onsuccess = () => {
          try{ db.close(); }catch(_){}
          resolve({ ok:true });
        };
        req.onerror = () => {
          try{ db.close(); }catch(_){}
          resolve({ ok:false, reason:"idb-write-error" });
        };
      }catch(_){
        try{ db && db.close(); }catch(__){}
        resolve({ ok:false, reason:"idb-write-exception" });
      }
    });
  }

  async function idbDeleteByTs(target, ts){
    if(!target) return { ok:false, reason:"no-idb-target" };
    const { dbName, storeName } = target;

    return new Promise(async (resolve) => {
      let db = null;
      try{
        db = await idbOpen(dbName);
        if(!db) return resolve({ ok:false, reason:"idb-open-failed" });
        if(!db.objectStoreNames || !db.objectStoreNames.contains(storeName)){
          try{ db.close(); }catch(_){}
          return resolve({ ok:false, reason:"idb-store-missing" });
        }

        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);

        let req;
        try{
          req = store.delete(ts);
        }catch(_){
          try{ db.close(); }catch(__){}
          return resolve({ ok:false, reason:"idb-delete-throw" });
        }

        req.onsuccess = () => {
          try{ db.close(); }catch(_){}
          resolve({ ok:true });
        };
        req.onerror = () => {
          try{ db.close(); }catch(_){}
          resolve({ ok:false, reason:"idb-delete-error" });
        };
      }catch(_){
        try{ db && db.close(); }catch(__){}
        resolve({ ok:false, reason:"idb-delete-exception" });
      }
    });
  }

  // ---- LocalStorage write helpers (authoritative baseline) ----
  function readCanonLocal(){
    try{
      const raw = localStorage.getItem(CANON_LS_KEY);
      if(!raw) return [];
      const parsed = safeJSONParse(raw);
      const arr = normalizeArray(parsed);
      return normalizeRecords(arr);
    }catch(_){
      return [];
    }
  }

  function writeCanonLocal(records){
    try{
      localStorage.setItem(CANON_LS_KEY, JSON.stringify(records));
      return true;
    }catch(_){
      return false;
    }
  }

  // ---- Public API ----
  async function detect() {
    const ls = readLocalStorageCandidates();
    const idb = await readIndexedDBCandidates();
    const all = [...idb, ...ls];
    const best = chooseBest(all);

    return {
      appVersion: vStr(),
      candidates: all.map(x => ({ source: x.source, count: x.records.length, newestMs: newestMs(x.records) })),
      best: { source: best.source, count: best.records.length, newestMs: newestMs(best.records) },
    };
  }

  async function getAllRecords() {
    try {
      const cached = cacheGet();
      if (cached) return cached.records.slice();

      const ls = readLocalStorageCandidates();
      const idb = await readIndexedDBCandidates();
      const all = [...idb, ...ls];
      const best = chooseBest(all);

      const normalized = normalizeRecords(best.records);
      cacheSet({ source: best.source, records: normalized });
      return normalized.slice();
    } catch (_) {
      return [];
    }
  }

  async function putRecord(record) {
    try{
      const n = normalizeRecord(record);
      if(!n) return { ok:false, reason:"invalid-record" };

      const recs = readCanonLocal();
      const idx = recs.findIndex(r => r.ts === n.ts);

      if(idx >= 0) recs[idx] = n;
      else recs.unshift(n);

      recs.sort((a,b)=> b.ts - a.ts);
      const okLS = writeCanonLocal(recs);

      let okIDB = false;
      try{
        const target = await detectWritableIDBTarget();
        if(target){
          const r = await idbPutRecord(target, n);
          okIDB = !!r.ok;
        }
      }catch(_){}

      cacheClear();
      return { ok: okLS || okIDB, stored: { localStorage: okLS, indexedDB: okIDB } };
    }catch(_){
      return { ok:false, reason:"write-exception" };
    }
  }

  async function deleteRecordById(id) {
    try{
      let ts = null;
      if(typeof id === "number") ts = id;
      else if(typeof id === "string") ts = toMs(id);
      else if(id && typeof id === "object") ts = toMs(extractTs(id));
      ts = Number.isFinite(ts) ? ts : 0;
      if(!ts) return { ok:false, reason:"invalid-id" };

      const recs = readCanonLocal().filter(r => r.ts !== ts);
      const okLS = writeCanonLocal(recs);

      let okIDB = false;
      try{
        const target = await detectWritableIDBTarget();
        if(target){
          const r = await idbDeleteByTs(target, ts);
          okIDB = !!r.ok;
        }
      }catch(_){}

      cacheClear();
      return { ok: okLS || okIDB, deleted: { localStorage: okLS, indexedDB: okIDB } };
    }catch(_){
      return { ok:false, reason:"delete-exception" };
    }
  }

  window.VTStorage = {
    detect,
    getAllRecords,
    putRecord,
    deleteRecordById,
  };

})();

/*
Vitals Tracker — EOF Verification Notes
File: js/storage.js
App Version Authority: js/version.js
Base: v2.028a
Verified: API surface + write/delete + normalization + cache invalidation
*/
