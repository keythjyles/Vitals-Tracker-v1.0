/* 
Vitals Tracker — BOF (Prime Pass Header)



NEXT FILE TO FETCH (PP-20260121-001): js/state.js



Beacon Drift Control Note (for this Prime Pass run only; ends at the next divider)
- Beacon, focus on THIS pasted file and THIS chat message only.
- Follow only the instructions/prompts inside THIS paste and THIS message.
- Do NOT use or “blend” prior chat messages for decisions in this step.
End Beacon Drift Control Note
------------------------------------------------------------

File: js/store.js
App Version Authority: js/version.js
ImplementationId: PP-20260121-001
Prime Pass: Step 7 of 23
Prev (this run): js/storage.js
Next (this run): js/state.js
FileEditId: 1
Edited: 2026-01-21

Role / Ownership (LOCKED)
- Canonical data access layer for the app.
- Delegates persistence to storage.js.
- Normalizes records for consumers (charts, log, reports).
- Owns init sequencing and in-memory cache.
- Must NOT render UI.
- Must NOT own panels or gestures.

Implemented (facts only)
- VTStore.update() exists for Add/Edit mode and persists via VTStorage.putRecord when available
- Unknown fields (distress, meds, symptom selections, etc.) preserved pass-through
- getAll() remains synchronous and returns an array snapshot
- add() persists via current VTStorage API when present, with legacy fallback

Drift locks (do not change without intentional decision)
- Do not add UI rendering here
- Do not move persistence ownership away from VTStorage
- Keep “minimal normalization” posture (do not invent values)
------------------------------------------------------------ */

(function () {
  "use strict";

  var ready = false;
  var initPromise = null;
  var cache = [];

  function dbgInit() {
    try {
      if (!window.__VTDBG) window.__VTDBG = {};
      if (!window.__VTDBG.store) window.__VTDBG.store = {};
    } catch (_) {}
  }

  function dbgSet(k, v) {
    try {
      dbgInit();
      window.__VTDBG.store[k] = v;
    } catch (_) {}
  }

  function clone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); }
    catch (_) { return obj; }
  }

  function isThenable(v) {
    return !!v && (typeof v === "object" || typeof v === "function") && typeof v.then === "function";
  }

  function normalizeRecord(r) {
    // Minimal normalization; do NOT invent values.
    if (!r || typeof r !== "object") return r;

    var out = {
      ts: (typeof r.ts === "number" && isFinite(r.ts)) ? r.ts :
          (typeof r.time === "number" && isFinite(r.time)) ? r.time :
          (typeof r.timestamp === "number" && isFinite(r.timestamp)) ? r.timestamp :
          (typeof r.date === "number" && isFinite(r.date)) ? r.date :
          r.ts,

      sys: (typeof r.sys === "number" && isFinite(r.sys)) ? r.sys :
           (typeof r.systolic === "number" && isFinite(r.systolic)) ? r.systolic :
           (typeof r.sbp === "number" && isFinite(r.sbp)) ? r.sbp :
           r.sys,

      dia: (typeof r.dia === "number" && isFinite(r.dia)) ? r.dia :
           (typeof r.diastolic === "number" && isFinite(r.diastolic)) ? r.diastolic :
           (typeof r.dbp === "number" && isFinite(r.dbp)) ? r.dbp :
           r.dia,

      hr:  (typeof r.hr === "number" && isFinite(r.hr)) ? r.hr :
           (typeof r.heartRate === "number" && isFinite(r.heartRate)) ? r.heartRate :
           (typeof r.pulse === "number" && isFinite(r.pulse)) ? r.pulse :
           r.hr,

      notes: (typeof r.notes === "string") ? r.notes :
             (typeof r.note === "string") ? r.note :
             (typeof r.text === "string") ? r.text :
             ""
    };

    // Preserve any other fields (symptoms, distress, meds, etc.) without altering them.
    for (var k in r) {
      if (!Object.prototype.hasOwnProperty.call(r, k)) continue;
      if (k === "ts" || k === "sys" || k === "dia" || k === "hr" || k === "notes") continue;
      if (k === "time" || k === "timestamp" || k === "date" || k === "systolic" || k === "diastolic" || k === "heartRate" || k === "pulse") continue;
      out[k] = r[k];
    }

    return out;
  }

  function normalizeArray(arr) {
    if (!Array.isArray(arr)) return [];
    var out = [];
    for (var i = 0; i < arr.length; i++) out.push(normalizeRecord(arr[i]));
    return out;
  }

  function hasStorage() {
    return !!window.VTStorage;
  }

  function pickStorageReadAPI() {
    try {
      if (!window.VTStorage) return "none";
      if (typeof window.VTStorage.getAllRecords === "function") return "getAllRecords";
      if (typeof window.VTStorage.loadAll === "function") return "loadAll";
      return "none";
    } catch (_) {
      return "none";
    }
  }

  function pickStorageWriteAPI() {
    try {
      if (!window.VTStorage) return "none";
      if (typeof window.VTStorage.putRecord === "function") return "putRecord";
      if (typeof window.VTStorage.saveAll === "function") return "saveAll";
      return "none";
    } catch (_) {
      return "none";
    }
  }

  async function readAllFromStorage() {
    if (!window.VTStorage) return [];

    var readApi = pickStorageReadAPI();
    dbgSet("readApi", readApi);

    try {
      if (readApi === "getAllRecords") {
        var recs = window.VTStorage.getAllRecords();
        if (isThenable(recs)) recs = await recs;
        return Array.isArray(recs) ? recs : [];
      }
      if (readApi === "loadAll") {
        var data = window.VTStorage.loadAll();
        if (isThenable(data)) data = await data;
        return Array.isArray(data) ? data : [];
      }
    } catch (_) {}

    return [];
  }

  async function writeOneToStorage(record) {
    if (!window.VTStorage) return false;

    var writeApi = pickStorageWriteAPI();
    dbgSet("writeApi", writeApi);

    try {
      if (writeApi === "putRecord") {
        var r = window.VTStorage.putRecord(record);
        if (isThenable(r)) r = await r;
        return !!(r && r.ok);
      }
    } catch (_) {}

    return false;
  }

  async function writeAllToStorage(arr) {
    if (!window.VTStorage) return false;

    var writeApi = pickStorageWriteAPI();
    dbgSet("writeApi", writeApi);

    try {
      if (writeApi === "saveAll") {
        var res = window.VTStorage.saveAll(arr);
        if (isThenable(res)) await res;
        return true;
      }

      if (writeApi === "putRecord") {
        if (typeof window.VTStorage.deleteRecordById === "function") {
          try {
            var existing = await readAllFromStorage();
            if (Array.isArray(existing) && existing.length) {
              for (var i = 0; i < existing.length; i++) {
                try { await window.VTStorage.deleteRecordById(existing[i]); } catch (_) {}
              }
            }
          } catch (_) {}
        }

        for (var j = 0; j < arr.length; j++) {
          try { await writeOneToStorage(arr[j]); } catch (_) {}
        }
        return true;
      }
    } catch (_) {}

    return false;
  }

  async function clearStorageAll() {
    if (!window.VTStorage) return false;

    try {
      if (typeof window.VTStorage.clear === "function") {
        var r0 = window.VTStorage.clear();
        if (isThenable(r0)) await r0;
        return true;
      }

      if (typeof window.VTStorage.deleteRecordById === "function") {
        var existing = await readAllFromStorage();
        if (Array.isArray(existing) && existing.length) {
          for (var i = 0; i < existing.length; i++) {
            try { await window.VTStorage.deleteRecordById(existing[i]); } catch (_) {}
          }
        }
        return true;
      }

      if (typeof window.VTStorage.saveAll === "function") {
        var r1 = window.VTStorage.saveAll([]);
        if (isThenable(r1)) await r1;
        return true;
      }
    } catch (_) {}

    return false;
  }

  async function init() {
    if (ready) return;
    if (initPromise) return initPromise;

    initPromise = (async function () {
      dbgInit();
      dbgSet("storagePresent", hasStorage() ? "YES" : "NO");

      if (!hasStorage()) {
        try { console.warn("VTStore: storage layer not available"); } catch (_) {}
        cache = [];
        ready = true;
        dbgSet("cacheLen", 0);
        return;
      }

      try {
        if (typeof window.VTStorage.detect === "function") {
          var det = window.VTStorage.detect();
          if (isThenable(det)) det = await det;
          try {
            dbgSet("detectBest", det && det.best && det.best.source ? String(det.best.source) : "");
            dbgSet("detectBestCount", det && det.best && typeof det.best.count === "number" ? det.best.count : "");
          } catch (_) {}
        }
      } catch (_) {}

      try {
        var data = await readAllFromStorage();
        if (Array.isArray(data)) cache = normalizeArray(data);
        else cache = [];
      } catch (e) {
        try { console.error("VTStore init failed", e); } catch (_) {}
        cache = [];
      }

      ready = true;
      dbgSet("cacheLen", Array.isArray(cache) ? cache.length : 0);
    })();

    return initPromise;
  }

  function getAll() {
    if (!ready) { try { init(); } catch (_) {} }
    return clone(Array.isArray(cache) ? cache : []);
  }

  function findIndexByKey(key, rec) {
    var ts = null;
    if (key && typeof key === "object") {
      if (typeof key.ts === "number" && isFinite(key.ts)) ts = key.ts;
      else if (typeof key.id === "number" && isFinite(key.id)) ts = key.id;
    }
    if (ts == null && rec && typeof rec.ts === "number" && isFinite(rec.ts)) ts = rec.ts;
    if (ts == null) return -1;

    for (var i = 0; i < cache.length; i++) {
      var r = cache[i];
      if (!r) continue;
      var rts = (typeof r.ts === "number" && isFinite(r.ts)) ? r.ts : null;
      if (rts != null && rts === ts) return i;
      if (r && (r.id === ts || r._id === ts)) return i;
    }
    return -1;
  }

  async function add(record) {
    await init();

    var rec = normalizeRecord(record);
    cache.push(rec);

    try {
      var ok = false;

      if (window.VTStorage && typeof window.VTStorage.putRecord === "function") {
        var r = window.VTStorage.putRecord(rec);
        if (isThenable(r)) r = await r;
        ok = !!(r && r.ok);
      } else if (window.VTStorage && typeof window.VTStorage.saveAll === "function") {
        var res = window.VTStorage.saveAll(cache);
        if (isThenable(res)) await res;
        ok = true;
      }

      dbgSet("lastAddOk", ok ? "YES" : "NO");
    } catch (_) {}

    return rec;
  }

  async function update(key, record) {
    await init();

    var rec = normalizeRecord(record);

    // Preserve timestamp if caller provided a key.ts (edit should not move the record in time)
    try {
      if (key && typeof key === "object" && typeof key.ts === "number" && isFinite(key.ts)) {
        rec.ts = key.ts;
      } else if (key && typeof key === "object" && typeof key.id === "number" && isFinite(key.id)) {
        rec.ts = key.id;
      }
    } catch (_) {}

    var idx = findIndexByKey(key, rec);
    if (idx >= 0) cache[idx] = rec;
    else cache.push(rec);

    try {
      var ok = false;

      if (window.VTStorage && typeof window.VTStorage.putRecord === "function") {
        var r = window.VTStorage.putRecord(rec);
        if (isThenable(r)) r = await r;
        ok = !!(r && r.ok);
      } else if (window.VTStorage && typeof window.VTStorage.saveAll === "function") {
        var res = window.VTStorage.saveAll(cache);
        if (isThenable(res)) await res;
        ok = true;
      }

      dbgSet("lastUpdateOk", ok ? "YES" : "NO");
    } catch (_) {}

    return rec;
  }

  async function replaceAll(arr) {
    await init();
    if (!Array.isArray(arr)) return;

    cache = normalizeArray(arr);

    try {
      await writeAllToStorage(cache);
      dbgSet("lastReplaceAll", "OK");
    } catch (_) {
      dbgSet("lastReplaceAll", "NO");
    }
  }

  async function clear() {
    await init();

    cache = [];

    try {
      await clearStorageAll();
      dbgSet("lastClear", "OK");
    } catch (_) {
      dbgSet("lastClear", "NO");
    }
  }

  window.VTStore = {
    init: init,
    getAll: getAll,
    add: add,
    update: update,
    replaceAll: replaceAll,
    clear: clear
  };

  try { init(); } catch (_) {}

})();

/* 
Vitals Tracker — EOF (Prime Pass Footer)
File: js/store.js
App Version Authority: js/version.js
ImplementationId: PP-20260121-001
Prime Pass: Step 7 of 23
Prev (this run): js/storage.js
Next (this run): js/state.js
FileEditId: 1
Edited: 2026-01-21

Implementation Fetch Aid (ONE-TIME ONLY; NOT A MASTER ORDER)
Meaning:
- This block exists ONLY to tell the human operator which file to paste NEXT during this one run.
- This is NOT an instruction set, NOT a schema, and NOT an ordering guarantee.
- Future AI/editors MUST IGNORE this block once PP-20260121-001 is complete.

Current file (pasted/edited in this step): js/store.js
Next file to fetch/paste (this run): js/state.js

Acceptance checks
- window.VTStore exists; getAll() remains synchronous
- add()/update() preserve pass-through fields and persist via VTStorage when present
- No UI rendering logic introduced
*/ 
