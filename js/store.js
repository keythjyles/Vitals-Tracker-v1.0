/* File: js/store.js */
/*
Vitals Tracker — Store (Single Source of Records In-Memory)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Maintains the in-memory record list used by Chart/Log/UI.
- Reads records from VTStorage.getAllRecords().
- Normalizes record shape minimally (does NOT rewrite storage yet).

v2.023e — Change Log (THIS FILE ONLY)
1) Removes hard-coded VERSION to prevent drift.
2) getStats() now reports app version from VTVersion (if available).
3) Preserves async load behavior and normalization.

ANTI-DRIFT RULES
- Do NOT draw charts here.
- Do NOT render UI here.
- Do NOT implement swipe here.
- Do NOT implement write-back policy here (later in add.js/storage.js).

Schema position:
File 5 of 10
*/

(function () {
  "use strict";

  let _records = [];
  let _loaded = false;

  function vStr(){
    try{ return window.VTVersion?.getVersionString?.() || "v?.???"; }catch(_){ return "v?.???"; }
  }

  function isPlainObject(o) {
    return !!o && typeof o === "object" && (o.constructor === Object || Object.getPrototypeOf(o) === Object.prototype);
  }

  function extractTs(r) {
    return r?.ts ?? r?.time ?? r?.timestamp ?? r?.date ?? r?.createdAt ?? r?.created_at ?? r?.iso ?? null;
  }

  function toMs(ts) {
    try {
      const ms = new Date(ts || 0).getTime();
      return Number.isFinite(ms) ? ms : 0;
    } catch (_) {
      return 0;
    }
  }

  function normalizeRecord(raw) {
    if (!raw) return null;
    if (typeof raw !== "object") return null;

    const r = isPlainObject(raw) ? { ...raw } : { ...raw };

    const ts = extractTs(r);
    const ms = toMs(ts);

    // Internal convenience field only
    r._ms = ms;

    // If no ts-like field exists but ms is valid, set r.ts (ISO) for downstream consistency
    if (!ts && ms > 0) {
      r.ts = new Date(ms).toISOString();
    }

    return r;
  }

  function normalizeList(list) {
    const out = [];
    if (!Array.isArray(list)) return out;
    for (const item of list) {
      const n = normalizeRecord(item);
      if (n) out.push(n);
    }
    return out;
  }

  async function loadFromStorage() {
    try {
      if (!window.VTStorage || typeof window.VTStorage.getAllRecords !== "function") {
        _records = [];
        _loaded = true;
        return { records: _records, note: "VTStorage-missing" };
      }

      const raw = await window.VTStorage.getAllRecords();
      const norm = normalizeList(raw);

      // Sort oldest->newest for consistent downstream computations
      norm.sort((a, b) => (a._ms || 0) - (b._ms || 0));

      _records = norm;
      _loaded = true;

      return { records: _records, note: "ok" };
    } catch (_) {
      _records = [];
      _loaded = true;
      return { records: _records, note: "error" };
    }
  }

  async function init() {
    if (_loaded) return getStats();
    await loadFromStorage();
    return getStats();
  }

  async function refresh() {
    await loadFromStorage();
    return getStats();
  }

  function getAll() {
    return _records.slice();
  }

  function getStats() {
    const count = _records.length;
    const newestMs = count ? (_records[count - 1]._ms || 0) : 0;
    const oldestMs = count ? (_records[0]._ms || 0) : 0;
    return { appVersion: vStr(), loaded: _loaded, count, oldestMs, newestMs };
  }

  window.VTStore = {
    init,
    refresh,
    getAll,
    getStats,
  };
})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/store.js
App Version: (authority) js/version.js
Base: v2.021
Touched in: v2.023e (remove drift; stats from VTVersion)
Schema order: File 5 of 10
*/
