/* File: js/storage.js */
/*
Vitals Tracker — Storage Bridge (Read/Write Compatible)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023b
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Single storage abstraction for the app.
- Provides a SAFE, defensive bridge across legacy LocalStorage keys and possible IndexedDB layouts.
- Chart/Log MUST pull records via VTStorage.getAllRecords().

v2.023b — Change Log (THIS FILE ONLY)
1) Adds VTStorage global with:
   - detect(): best-effort source detection summary
   - getAllRecords(): returns array of records (defensive, never throws)
   - putRecord(record): optional (not used yet)
   - deleteRecordById(id): optional (not used yet)
2) Legacy LocalStorage compatibility:
   - scans known keys and generic fallbacks
3) IndexedDB compatibility:
   - scans known DB names and store names; reads all if available
4) Read-only safe defaults:
   - if nothing found, returns []

ANTI-DRIFT RULES
- Do NOT embed chart rendering here.
- Do NOT embed UI rendering here.
- Do NOT rename exported API surface without updating dependent modules.

Schema position:
File 4 of 10

Previous file:
File 3 — js/app.js

Next file:
File 5 — js/store.js
*/

(function () {
  "use strict";

  const VERSION = "v2.023b";

  // ---- Known legacy LocalStorage keys (from prior v1.x / transitions) ----
  const LS_KEYS = [
    "vitals_tracker_records_v1",            // v1.18 canonical key (remembered)
    "vitals_tracker_records",               // common
    "vitals_records",                       // common
    "vitalsTrackerRecords",                 // common camel
    "vt_records",                           // common short
    "records",                              // last resort (many apps use this)
  ];

  // Some builds stored a wrapper object: { records:[...]} or {data:[...]}
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

  function safeJSONParse(str) {
    try {
      return JSON.parse(str);
    } catch (_) {
      return null;
    }
  }

  // ---- Timestamp extraction (used for choosing best candidate) ----
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
        if (arr.length) {
          found.push({ source: `localStorage:${k}`, records: arr });
        }
      } catch (_) {}
    }

    // Additional: scan all keys and pick anything that looks like a records array
    // (limited and safe: only checks first ~40 keys to avoid slowdowns)
    try {
      const limit = Math.min(localStorage.length, 40);
      for (let i = 0; i < limit; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (LS_KEYS.includes(key)) continue; // already handled
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

        // getAll is not supported on very old engines, but Android Chrome supports it.
        if (store.getAll) {
          const req = store.getAll();
          req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
          req.onerror = () => resolve([]);
          return;
        }

        // cursor fallback
        const out = [];
        const cur = store.openCursor();
        cur.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            out.push(cursor.value);
            cursor.continue();
          } else {
            resolve(out);
          }
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
          if (rows && rows.length) {
            found.push({ source: `indexedDB:${dbName}/${storeName}`, records: rows });
          }
        }
      } catch (_) {
        // ignore
      } finally {
        try { db.close(); } catch (_) {}
      }
    }

    return found;
  }

  // ---- Choose best candidate set (prefer more records; tie-break by newest timestamp) ----
  function chooseBest(candidates) {
    if (!candidates || !candidates.length) return { source: "none", records: [] };

    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i];
      const aLen = best.records.length;
      const bLen = c.records.length;

      if (bLen > aLen) {
        best = c;
        continue;
      }
      if (bLen === aLen) {
        if (newestMs(c.records) > newestMs(best.records)) best = c;
      }
    }
    return best;
  }

  // ---- Public API ----
  async function detect() {
    const ls = readLocalStorageCandidates();
    const idb = await readIndexedDBCandidates();

    const all = [...idb, ...ls]; // prefer IDB generally, but chooseBest handles it
    const best = chooseBest(all);

    return {
      version: VERSION,
      candidates: all.map(x => ({ source: x.source, count: x.records.length, newestMs: newestMs(x.records) })),
      best: { source: best.source, count: best.records.length, newestMs: newestMs(best.records) },
    };
  }

  async function getAllRecords() {
    try {
      const ls = readLocalStorageCandidates();
      const idb = await readIndexedDBCandidates();
      const all = [...idb, ...ls];
      const best = chooseBest(all);

      // Defensive clone, never return the same array reference
      const out = Array.isArray(best.records) ? best.records.slice() : [];
      return out;
    } catch (_) {
      return [];
    }
  }

  // NOTE: Write ops are placeholders for later; must not be used until Add is restored.
  async function putRecord(_record) {
    // Intentionally no-op for v2.023b stabilization phase.
    // Add.js will own write policy and choose localStorage vs IDB explicitly.
    return { ok: false, reason: "write-disabled-v2.023b" };
  }

  async function deleteRecordById(_id) {
    // Intentionally no-op for v2.023b stabilization phase.
    return { ok: false, reason: "write-disabled-v2.023b" };
  }

  // Expose
  window.VTStorage = {
    VERSION,
    detect,
    getAllRecords,
    putRecord,
    deleteRecordById,
  };

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/storage.js
App Version: v2.023b
Base: v2.021
Touched in v2.023b: js/storage.js
Schema order: File 4 of 10
Next planned file: js/store.js (File 5)
*/
