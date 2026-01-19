/* File: js/store.js */
/*
Vitals Tracker — Store (Records Cache + Pub/Sub Owner)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025b
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Single in-memory source of truth for the current records array.
- Owns:
  1) Loading records from storage (async) into a cache
  2) Sorting + basic normalization of records
  3) Pub/Sub notifications so UI/Charts/Log can render when ready
- Does NOT own:
  - DOM rendering (ui.js)
  - Chart drawing or chart gestures (chart.js)
  - Persistence backend (storage.js)

PRIMARY GOAL (CURRENT FIX)
- Eliminate stuck "Loading..." on Charts/Log by guaranteeing:
  - A single, awaited load at startup
  - A deterministic "ready" event + callbacks after load completes
  - A "changed" event after any write (add/edit/delete/import)

ANTI-DRIFT RULES
- Do NOT hard-code app version strings. If needed, read from window.VTVersion.
- Do NOT access DOM here.
- Do NOT call canvas APIs here.
- Do NOT call alert/confirm here.

Schema position:
File 5 of 10

Dependencies expected (soft):
- window.VTStorage (storage.js) with:
    - init()
    - getAllRecords()
    - addRecord(record)
    - updateRecord(id, patchOrRecord)
    - deleteRecord(id)
    - clearAll()
- Optional downstream listeners:
    - window.VTUI?.renderAll()
    - window.VTChart?.render()
*/

(function () {
  "use strict";

  // ===== Internal State =====
  let _records = [];
  let _loaded = false;
  let _loadingPromise = null;
  let _lastError = null;

  const _subs = new Set();          // function(evt)
  const _readyWaiters = [];         // resolve fns waiting for ready

  // ===== Utilities =====
  function safeNowMs() { return Date.now(); }

  function normalizeRecord(r) {
    // Keep this conservative: do not invent fields.
    // Only ensure minimum structure for sorting/plotting.
    if (!r || typeof r !== "object") return null;

    const out = { ...r };

    // Canonical timestamp field: prefer recordedAtMs, then ts, then date/time parsing.
    if (!Number.isFinite(out.recordedAtMs)) {
      if (Number.isFinite(out.ts)) out.recordedAtMs = out.ts;
      else if (Number.isFinite(out.timeMs)) out.recordedAtMs = out.timeMs;
    }

    // If still missing, attempt parse if a date string exists.
    if (!Number.isFinite(out.recordedAtMs)) {
      const s = out.recordedAt || out.datetime || out.dateTime || out.date;
      const ms = s ? Date.parse(s) : NaN;
      if (Number.isFinite(ms)) out.recordedAtMs = ms;
    }

    // Final fallback: now (keeps app from crashing; also exposes bad data quickly)
    if (!Number.isFinite(out.recordedAtMs)) out.recordedAtMs = safeNowMs();

    // Numeric coercions where common:
    if (out.sys != null) out.sys = Number(out.sys);
    if (out.dia != null) out.dia = Number(out.dia);
    if (out.hr != null) out.hr = Number(out.hr);

    return out;
  }

  function sortRecordsAscending(arr) {
    arr.sort((a, b) => (a.recordedAtMs || 0) - (b.recordedAtMs || 0));
  }

  function computeBounds(arr) {
    if (!arr || arr.length === 0) return { minMs: null, maxMs: null };
    let minMs = Infinity, maxMs = -Infinity;
    for (const r of arr) {
      const t = r && Number.isFinite(r.recordedAtMs) ? r.recordedAtMs : null;
      if (t == null) continue;
      if (t < minMs) minMs = t;
      if (t > maxMs) maxMs = t;
    }
    if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) return { minMs: null, maxMs: null };
    return { minMs, maxMs };
  }

  function emit(evt) {
    // evt: { type, records, loaded, error, bounds }
    try {
      // Fire DOM event too (optional listeners)
      document.dispatchEvent(new CustomEvent("vt:store", { detail: evt }));
    } catch (_) {}

    for (const fn of _subs) {
      try { fn(evt); } catch (_) {}
    }
  }

  function markReady() {
    _loaded = true;
    while (_readyWaiters.length) {
      try { _readyWaiters.shift()(); } catch (_) {}
    }
  }

  // ===== Core Load =====
  async function loadFromStorage(reason) {
    if (_loadingPromise) return _loadingPromise;

    _loadingPromise = (async () => {
      _lastError = null;

      // Tell listeners we are loading (UI can show spinner text)
      emit({
        type: "loading",
        reason: reason || "load",
        loaded: false,
        records: [],
        error: null,
        bounds: { minMs: null, maxMs: null }
      });

      try {
        if (!window.VTStorage || typeof window.VTStorage.getAllRecords !== "function") {
          throw new Error("VTStorage not available (storage.js not loaded or missing getAllRecords).");
        }

        // Ensure storage init (safe if init is idempotent)
        if (typeof window.VTStorage.init === "function") {
          await window.VTStorage.init();
        }

        const raw = await window.VTStorage.getAllRecords();
        const arr = Array.isArray(raw) ? raw : [];

        const normalized = [];
        for (const r of arr) {
          const n = normalizeRecord(r);
          if (n) normalized.push(n);
        }

        sortRecordsAscending(normalized);
        _records = normalized;

        const bounds = computeBounds(_records);

        markReady();
        emit({
          type: "ready",
          reason: reason || "load",
          loaded: true,
          records: _records.slice(),
          error: null,
          bounds
        });

        return _records;
      } catch (err) {
        _lastError = err;
        _records = [];
        _loaded = false;

        emit({
          type: "error",
          reason: reason || "load",
          loaded: false,
          records: [],
          error: String(err && err.message ? err.message : err),
          bounds: { minMs: null, maxMs: null }
        });

        return [];
      } finally {
        _loadingPromise = null;
      }
    })();

    return _loadingPromise;
  }

  // ===== Public API =====
  function isLoaded() { return _loaded; }

  function getRecords() {
    // Always return a copy; store owns the canonical array.
    return _records.slice();
  }

  function getBounds() {
    return computeBounds(_records);
  }

  function getLastError() {
    return _lastError ? String(_lastError.message || _lastError) : null;
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return function noop() {};
    _subs.add(fn);
    return function unsubscribe() { _subs.delete(fn); };
  }

  function whenReady() {
    if (_loaded) return Promise.resolve(true);
    return new Promise((resolve) => _readyWaiters.push(resolve));
  }

  async function refresh(reason) {
    return loadFromStorage(reason || "refresh");
  }

  // ===== Write-through helpers (call storage, then reload cache) =====
  async function addRecord(record) {
    if (!window.VTStorage?.addRecord) throw new Error("VTStorage.addRecord missing");
    await window.VTStorage.addRecord(record);
    await loadFromStorage("add");
    emit({ type: "changed", reason: "add", loaded: _loaded, records: _records.slice(), error: null, bounds: getBounds() });
    return true;
  }

  async function updateRecord(id, patchOrRecord) {
    if (!window.VTStorage?.updateRecord) throw new Error("VTStorage.updateRecord missing");
    await window.VTStorage.updateRecord(id, patchOrRecord);
    await loadFromStorage("update");
    emit({ type: "changed", reason: "update", loaded: _loaded, records: _records.slice(), error: null, bounds: getBounds() });
    return true;
  }

  async function deleteRecord(id) {
    if (!window.VTStorage?.deleteRecord) throw new Error("VTStorage.deleteRecord missing");
    await window.VTStorage.deleteRecord(id);
    await loadFromStorage("delete");
    emit({ type: "changed", reason: "delete", loaded: _loaded, records: _records.slice(), error: null, bounds: getBounds() });
    return true;
  }

  async function clearAll() {
    if (!window.VTStorage?.clearAll) throw new Error("VTStorage.clearAll missing");
    await window.VTStorage.clearAll();
    await loadFromStorage("clear");
    emit({ type: "changed", reason: "clear", loaded: _loaded, records: _records.slice(), error: null, bounds: getBounds() });
    return true;
  }

  // ===== Startup auto-load =====
  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  onReady(function () {
    // Kick load; UI and charts should subscribe or listen for vt:store events.
    // This prevents “Loading…” from persisting forever if nobody else triggers refresh().
    loadFromStorage("startup").catch(function(){});
  });

  // Expose
  window.VTStore = Object.freeze({
    // state
    isLoaded,
    getRecords,
    getBounds,
    getLastError,

    // lifecycle
    refresh,
    whenReady,

    // pub/sub
    subscribe,

    // writes
    addRecord,
    updateRecord,
    deleteRecord,
    clearAll
  });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/store.js
App Version: v2.025b
Base: v2.021
Touched in v2.025b: js/store.js (guaranteed awaited load + ready/changed events to stop stuck Loading)
Next planned file: js/state.js (File 6) OR js/ui.js (File 10) depending on remaining “Loading…” symptoms
*/
