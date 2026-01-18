/* File: js/storage.js */
/*
Vitals Tracker — Storage Layer (Local-Only)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023
Base: v2.021 (last known-good storage behavior)
Date: 2026-01-18

This file is: 9 of 10 (v2.023 phase)
Touched in this release: YES (alignment + defensive guards ONLY)

LOCKED SCOPE (DO NOT DRIFT)
- Preserve existing data shape and keys.
- Local-only storage (localStorage first; IndexedDB optional/fallback).
- No schema migration in this version.
- No chart logic.
- No UI logic.
- Fail safely if storage unavailable.

Accessibility / reliability rules:
- Never throw uncaught errors.
- Never block UI.
- Return empty arrays on failure.
- Keep reads/writes explicit and predictable.

KNOWN KEYS (do not rename):
- localStorage primary key: "vitals_tracker_records_v1"
- optional IndexedDB names (best-effort): "vitals_tracker_db", "VitalsTrackerDB"

EOF footer REQUIRED.
*/

(function(){
  "use strict";

  const APP_VERSION = "v2.023";

  // ===== Constants =====
  const LS_KEY = "vitals_tracker_records_v1";

  // ===== Utilities =====
  function safeJSONParse(s, fallback){
    try{ return JSON.parse(s); }catch(_){ return fallback; }
  }

  function safeJSONStringify(v){
    try{ return JSON.stringify(v); }catch(_){ return "[]"; }
  }

  function nowISO(){
    try{ return new Date().toISOString(); }catch(_){ return ""; }
  }

  // ===== LocalStorage (primary) =====
  function lsAvailable(){
    try{
      const k="__vt_test__";
      localStorage.setItem(k,"1");
      localStorage.removeItem(k);
      return true;
    }catch(_){ return false; }
  }

  function lsReadAll(){
    if(!lsAvailable()) return [];
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(!raw) return [];
      const arr = safeJSONParse(raw, []);
      return Array.isArray(arr) ? arr : [];
    }catch(_){
      return [];
    }
  }

  function lsWriteAll(arr){
    if(!lsAvailable()) return false;
    try{
      localStorage.setItem(LS_KEY, safeJSONStringify(Array.isArray(arr)?arr:[]));
      return true;
    }catch(_){
      return false;
    }
  }

  // ===== Public API =====
  function getAll(){
    return lsReadAll();
  }

  function setAll(arr){
    return lsWriteAll(arr);
  }

  function addRecord(rec){
    const all = lsReadAll();
    const r = (rec && typeof rec === "object") ? rec : {};
    if(!r.ts && !r.time && !r.timestamp){
      r.ts = nowISO();
    }
    all.push(r);
    return lsWriteAll(all);
  }

  function updateRecord(index, rec){
    const all = lsReadAll();
    if(!Number.isInteger(index) || index < 0 || index >= all.length) return false;
    all[index] = rec;
    return lsWriteAll(all);
  }

  function clearAll(){
    if(!lsAvailable()) return false;
    try{
      localStorage.removeItem(LS_KEY);
      return true;
    }catch(_){
      return false;
    }
  }

  // ===== Best-effort IndexedDB helpers (NO schema; optional) =====
  function deleteKnownDatabases(){
    try{
      if(!window.indexedDB) return;
      ["vitals_tracker_db","VitalsTrackerDB","vitals_tracker"].forEach(name=>{
        try{ indexedDB.deleteDatabase(name); }catch(_){}
      });
    }catch(_){}
  }

  // ===== Expose =====
  window.VTStorage = {
    version: APP_VERSION,
    getAll,
    setAll,
    addRecord,
    updateRecord,
    clearAll,
    _dangerDeleteIndexedDB: deleteKnownDatabases
  };

})();

/* EOF: js/storage.js */
/*
App Version: v2.023
Base: v2.021
Touched in this release: YES (alignment only; no schema changes)

Delivered files so far (v2.023 phase):
1) index.html
6) js/add.js
7) js/app.js
8) js/ui.js
9) js/storage.js

Next file to deliver (on "N"):
- File 10 of 10: js/version.js (single source of truth sync)
*/
