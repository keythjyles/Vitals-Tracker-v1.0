File: js/storage.js

/*
Vitals Tracker (Modular) — js/storage.js
App Version: v2.004

Purpose:
- Read-only “data bridge” that safely detects and loads existing Vitals Tracker data
  from prior single-file versions (localStorage and/or IndexedDB).
- Provides metadata (count, oldest/newest timestamps, source) for UI confirmation.
- DOES NOT modify, migrate, delete, re-key, or overwrite any existing records.

Design Notes:
- This module is intentionally defensive: it tries multiple known legacy keys and
  common IndexedDB shapes, and it never throws fatal errors to the UI layer.
- It exposes a single global API: window.VTStorage (no ES module imports needed).

Latest Update (v2.004):
- Initial read-only bridge supporting multiple legacy localStorage keys.
- IndexedDB probing for common DB/store names used in v1.19-era builds (best-effort).
- Normalizes records into a stable internal shape for UI preview.

Safety Guarantees:
- No writes to localStorage.
- No writes to IndexedDB.
- No clear/delete operations.
*/

(() => {
  "use strict";

  const APP_VERSION = "v2.004";

  // ---------------------------
  // Legacy detection targets
  // ---------------------------

  // LocalStorage keys seen across v1.x variants (including common fallbacks).
  // NOTE: We do NOT assume only one exists. We pick the best candidate by record count.
  const LEGACY_LS_KEYS = [
    "vitals_tracker_records_v1",         // known canonical in some v1.18+ builds
    "vitals_tracker_records",            // generic
    "vitalsTrackerRecords",              // camel fallback
    "vitals_tracker_v1_records",         // alt order
    "vt_records",                        // short fallback
  ];

  // IndexedDB names / stores used by some v1.19+ variants (best-effort).
  // If these don’t exist, we silently skip.
  const LEGACY_IDB_CANDIDATES = [
    { dbName: "vitals_tracker_db", store: "records" },
    { dbName: "vitalsTrackerDB",   store: "records" },
    { dbName: "VitalsTrackerDB",   store: "records" },
    { dbName: "vitals_db",         store: "records" },
    { dbName: "vitals_tracker",    store: "records" },
    { dbName: "vitals_tracker_db", store: "readings" },
    { dbName: "VitalsTracker",     store: "records" },
  ];

  // ---------------------------
  // Helpers
  // ---------------------------

  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }

  function isObj(x) {
    return x && typeof x === "object" && !Array.isArray(x);
  }

  function toNumber(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function toIsoMaybe(t) {
    // Accepts epoch ms, ISO, or Date-like.
    if (t == null) return null;
    if (typeof t === "number") {
      if (!Number.isFinite(t)) return null;
      try { return new Date(t).toISOString(); } catch { return null; }
    }
    if (typeof t === "string") {
      const d = new Date(t);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
      // some builds stored "YYYY-MM-DD HH:MM" etc.
      const d2 = new Date(t.replace(" ", "T"));
      if (!Number.isNaN(d2.getTime())) return d2.toISOString();
      return null;
    }
    if (t instanceof Date) {
      if (Number.isNaN(t.getTime())) return null;
      return t.toISOString();
    }
    return null;
  }

  function epochMsFromAny(t) {
    if (t == null) return null;
    if (typeof t === "number" && Number.isFinite(t)) return t;
    if (typeof t === "string") {
      const d = new Date(t);
      if (!Number.isNaN(d.getTime())) return d.getTime();
      const d2 = new Date(t.replace(" ", "T"));
      if (!Number.isNaN(d2.getTime())) return d2.getTime();
      return null;
    }
    if (t instanceof Date && !Number.isNaN(t.getTime())) return t.getTime();
    return null;
  }

  function normalizeRecord(r) {
    // Normalizes a record into:
    // { id, t, systolic, diastolic, hr, symptoms:[], note:"", raw }
    // No assumptions about field names—tries common variants.
    if (!isObj(r)) return null;

    const id = r.id ?? r._id ?? r.key ?? r.uuid ?? null;

    const tRaw =
      r.t ?? r.ts ?? r.time ?? r.dateTime ?? r.datetime ?? r.createdAt ?? r.created ?? r.when ?? r.timestamp ?? null;

    const tMs = epochMsFromAny(tRaw);
    const tIso = toIsoMaybe(tRaw);

    const systolic =
      toNumber(r.sys ?? r.systolic ?? (isObj(r.bp) ? (r.bp.sys ?? r.bp.systolic) : null));

    const diastolic =
      toNumber(r.dia ?? r.diastolic ?? (isObj(r.bp) ? (r.bp.dia ?? r.bp.diastolic) : null));

    const hr =
      toNumber(r.hr ?? r.heartRate ?? r.pulse ?? r.bpm);

    let symptoms = [];
    const sRaw = r.symptoms ?? r.sx ?? r.flags ?? null;
    if (Array.isArray(sRaw)) symptoms = sRaw.filter(x => typeof x === "string");
    else if (typeof sRaw === "string") symptoms = sRaw.split(",").map(x => x.trim()).filter(Boolean);
    else if (isObj(sRaw)) symptoms = Object.keys(sRaw).filter(k => !!sRaw[k]);

    const note =
      (typeof r.note === "string" ? r.note :
      (typeof r.notes === "string" ? r.notes :
      (typeof r.comment === "string" ? r.comment : ""))) || "";

    // If there is no timestamp, we still keep it but it will sort last.
    return {
      id: id,
      t: tMs,
      tIso: tIso,
      systolic: systolic,
      diastolic: diastolic,
      hr: hr,
      symptoms: symptoms,
      note: note,
      raw: r
    };
  }

  function sortByTimeAsc(a, b) {
    const ta = (a && typeof a.t === "number") ? a.t : Number.POSITIVE_INFINITY;
    const tb = (b && typeof b.t === "number") ? b.t : Number.POSITIVE_INFINITY;
    return ta - tb;
  }

  function summarize(records) {
    const recs = records.slice().filter(Boolean).sort(sortByTimeAsc);
    const count = recs.length;

    let oldest = null, newest = null;
    if (count > 0) {
      oldest = recs[0].t ?? null;
      newest = recs[count - 1].t ?? null;
    }

    return {
      count,
      oldestEpochMs: oldest,
      newestEpochMs: newest,
      oldestIso: oldest != null ? new Date(oldest).toISOString() : null,
      newestIso: newest != null ? new Date(newest).toISOString() : null,
    };
  }

  // ---------------------------
  // LocalStorage read-only load
  // ---------------------------

  function loadFromLocalStorageKey(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = safeJsonParse(raw);
    if (!parsed) return null;

    // Common shapes:
    // - Array of records
    // - { records: [...] }
    // - { data: [...] }
    // - { items: [...] }
    let arr = null;
    if (Array.isArray(parsed)) arr = parsed;
    else if (isObj(parsed) && Array.isArray(parsed.records)) arr = parsed.records;
    else if (isObj(parsed) && Array.isArray(parsed.data)) arr = parsed.data;
    else if (isObj(parsed) && Array.isArray(parsed.items)) arr = parsed.items;

    if (!arr) return null;

    const normalized = arr.map(normalizeRecord).filter(Boolean);
    const meta = summarize(normalized);

    return {
      sourceType: "localStorage",
      sourceName: key,
      rawShape: Array.isArray(parsed) ? "array" : "object",
      records: normalized,
      meta
    };
  }

  function loadBestFromLocalStorage() {
    const candidates = [];
    for (const k of LEGACY_LS_KEYS) {
      const res = loadFromLocalStorageKey(k);
      if (res && res.meta && res.meta.count > 0) candidates.push(res);
    }
    if (candidates.length === 0) return null;

    // pick max count, tiebreaker newest
    candidates.sort((a, b) => {
      const dc = (b.meta.count - a.meta.count);
      if (dc !== 0) return dc;
      const an = a.meta.newestEpochMs ?? 0;
      const bn = b.meta.newestEpochMs ?? 0;
      return bn - an;
    });

    return candidates[0];
  }

  // ---------------------------
  // IndexedDB read-only load
  // ---------------------------

  function idbOpen(dbName) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("indexedDB.open failed"));
      req.onblocked = () => reject(new Error("indexedDB.open blocked"));
      // If onupgradeneeded triggers, that means DB exists but version upgrade would occur.
      // We never want to mutate schema in a read-only bridge, so we abort.
      req.onupgradeneeded = () => {
        try { req.transaction.abort(); } catch {}
        try { req.result.close(); } catch {}
        reject(new Error("indexedDB schema upgrade required (read-only bridge aborted)"));
      };
    });
  }

  function idbReadAll(db, storeName) {
    return new Promise((resolve, reject) => {
      let tx;
      try {
        tx = db.transaction(storeName, "readonly");
      } catch (e) {
        reject(e);
        return;
      }

      let store;
      try {
        store = tx.objectStore(storeName);
      } catch (e) {
        reject(e);
        return;
      }

      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error || new Error("getAll failed"));
    });
  }

  async function tryLoadFromIndexedDBCandidate(cand) {
    const { dbName, store } = cand;
    let db = null;

    try {
      db = await idbOpen(dbName);
      if (!db.objectStoreNames || !db.objectStoreNames.contains(store)) {
        try { db.close(); } catch {}
        return null;
      }
      const rows = await idbReadAll(db, store);
      try { db.close(); } catch {}

      if (!Array.isArray(rows) || rows.length === 0) return null;

      const normalized = rows.map(normalizeRecord).filter(Boolean);
      const meta = summarize(normalized);

      if (meta.count === 0) return null;

      return {
        sourceType: "indexedDB",
        sourceName: `${dbName}/${store}`,
        rawShape: "store.getAll",
        records: normalized,
        meta
      };
    } catch {
      try { if (db) db.close(); } catch {}
      return null;
    }
  }

  async function loadBestFromIndexedDB() {
    const found = [];
    for (const cand of LEGACY_IDB_CANDIDATES) {
      const res = await tryLoadFromIndexedDBCandidate(cand);
      if (res && res.meta && res.meta.count > 0) found.push(res);
    }
    if (found.length === 0) return null;

    found.sort((a, b) => {
      const dc = (b.meta.count - a.meta.count);
      if (dc !== 0) return dc;
      const an = a.meta.newestEpochMs ?? 0;
      const bn = b.meta.newestEpochMs ?? 0;
      return bn - an;
    });

    return found[0];
  }

  // ---------------------------
  // Public API
  // ---------------------------

  async function detectAndLoadReadOnly() {
    // Prefer IndexedDB if present (typically the “newer” and more complete store),
    // but fall back to localStorage if IDB is absent/unreadable.
    const idbRes = await loadBestFromIndexedDB();
    if (idbRes) {
      return {
        ok: true,
        version: APP_VERSION,
        source: idbRes.sourceType,
        sourceName: idbRes.sourceName,
        meta: idbRes.meta,
        records: idbRes.records,
      };
    }

    const lsRes = loadBestFromLocalStorage();
    if (lsRes) {
      return {
        ok: true,
        version: APP_VERSION,
        source: lsRes.sourceType,
        sourceName: lsRes.sourceName,
        meta: lsRes.meta,
        records: lsRes.records,
      };
    }

    return {
      ok: false,
      version: APP_VERSION,
      source: null,
      sourceName: null,
      meta: { count: 0, oldestIso: null, newestIso: null, oldestEpochMs: null, newestEpochMs: null },
      records: [],
      reason: "No legacy data detected in IndexedDB or localStorage using known keys."
    };
  }

  function toReviewerSummary(meta, sourceName) {
    // Succinct text for reports / medical reviewers (no fluff).
    const count = meta?.count ?? 0;
    const oldest = meta?.oldestIso ?? "N/A";
    const newest = meta?.newestIso ?? "N/A";
    return (
      "Method of capture: readings were entered manually by the patient into Vitals Tracker on this device; " +
      "data is stored locally (no account, no cloud sync).\n" +
      `Data source detected: ${sourceName || "unknown"}.\n` +
      `Entries detected: ${count}. Range: ${oldest} to ${newest}.\n` +
      "Reviewer note: look for clusters of frequent readings during symptomatic episodes versus wider spacing during stability; " +
      "compare BP/HR patterns against reported symptoms and medication timing."
    );
  }

  window.VTStorage = Object.freeze({
    APP_VERSION,
    LEGACY_LS_KEYS: LEGACY_LS_KEYS.slice(),
    LEGACY_IDB_CANDIDATES: LEGACY_IDB_CANDIDATES.map(x => ({...x})),
    detectAndLoadReadOnly,
    toReviewerSummary,
  });

})();

/*
EOF — js/storage.js
App Version: v2.004

Notes:
- Next integration step (in index.html) will be to call:
    const res = await VTStorage.detectAndLoadReadOnly();
  and display res.meta.count + res.meta.newestIso on the Home/Log panels.
- This file intentionally contains zero write paths.
*/
