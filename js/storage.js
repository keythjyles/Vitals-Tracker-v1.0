/* File: js/storage.js */
/*
Vitals Tracker — Read-Only Storage Bridge
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

File Purpose
- Provides a SINGLE, stable abstraction layer between the UI and existing data.
- READ-ONLY by design in this phase. No writes, no mutations.
- Detects and aggregates records from legacy Vitals Tracker versions
  (localStorage and/or IndexedDB, if present).
- Normalizes output so the rest of the app never depends on legacy schemas.
- Guarantees backward compatibility so NO existing user data is lost or altered.

Design Contract (Locked)
- Other modules MUST NOT access localStorage or IndexedDB directly.
- Consumers call only the exported bridge methods below.
- This file never assumes field names beyond best-effort detection.
- Fail-safe: absence of data must not throw.

Exposed Global
- window.VTStorage (frozen API object)

Supported Consumers
- index.html (summary + charts + log)
- future reporting/export module
- future add/edit module (will extend this file later)

App Version: v2.020
Base: v2.019
Date: 2026-01-18 (America/Chicago)

Change Log (v2.020)
1) Formalized read-only contract and frozen API surface.
2) Added tolerant record normalization (timestamp, BP, HR, notes).
3) Added legacy key scan with non-destructive access.
4) Added summary helper for fast UI boot without full parse.
*/

(() => {
  "use strict";

  const API_VERSION = "v2.020";

  /* -----------------------------
     Utilities
  ----------------------------- */

  const safeParse = (v) => {
    try { return JSON.parse(v); } catch { return null; }
  };

  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const toMs = (v) => {
    if (!v) return null;
    if (typeof v === "number") return v > 1e12 ? v : v * 1000;
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  };

  /* -----------------------------
     Record Normalization
  ----------------------------- */

  function normalizeRecord(r) {
    if (!isObj(r)) return null;

    const ts =
      toMs(r.ts) ??
      toMs(r.time) ??
      toMs(r.timestamp) ??
      toMs(r.date) ??
      toMs(r.createdAt) ??
      toMs(r.created_at);

    const sys =
      num(r.sys) ??
      num(r.systolic) ??
      num(r.bp && (r.bp.sys ?? r.bp.systolic));

    const dia =
      num(r.dia) ??
      num(r.diastolic) ??
      num(r.bp && (r.bp.dia ?? r.bp.diastolic));

    const hr =
      num(r.hr) ??
      num(r.heartRate) ??
      num(r.pulse) ??
      num(r.vitals && (r.vitals.hr ?? r.vitals.pulse));

    const notes =
      (r.notes ?? r.note ?? r.symptoms ?? r.text ?? "").toString();

    if (!ts && sys == null && dia == null && hr == null) return null;

    return {
      ts,
      sys,
      dia,
      hr,
      notes
    };
  }

  /* -----------------------------
     Legacy localStorage Scan
  ----------------------------- */

  function scanLocalStorage() {
    const out = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Heuristic: only consider keys likely belonging to vitals apps
      if (!/vitals|bp|pressure|tracker/i.test(key)) continue;

      const raw = localStorage.getItem(key);
      const parsed = safeParse(raw);

      if (Array.isArray(parsed)) {
        parsed.forEach(r => {
          const n = normalizeRecord(r);
          if (n) out.push(n);
        });
      } else if (isObj(parsed) && Array.isArray(parsed.records)) {
        parsed.records.forEach(r => {
          const n = normalizeRecord(r);
          if (n) out.push(n);
        });
      }
    }

    return out;
  }

  /* -----------------------------
     Public API
  ----------------------------- */

  function getAll() {
    const records = scanLocalStorage();

    records.sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
    return records;
  }

  function getSummary() {
    const records = getAll();
    if (!records.length) {
      return {
        source: "localStorage",
        entries: 0,
        newest: null
      };
    }

    const newest = records[records.length - 1].ts;
    return {
      source: "localStorage",
      entries: records.length,
      newest
    };
  }

  function inspect() {
    return {
      apiVersion: API_VERSION,
      storage: "localStorage",
      count: getAll().length
    };
  }

  const API = Object.freeze({
    getAll,
    getSummary,
    inspect
  });

  Object.defineProperty(window, "VTStorage", {
    value: API,
    writable: false,
    configurable: false
  });

})();
 
/* EOF File: js/storage.js */
/*
Vitals Tracker — Read-Only Storage Bridge
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
App Version: v2.020

EOF Notes
- This file is intentionally conservative and defensive.
- No writes, deletes, or migrations occur here.
- Future versions may extend this file to ADD data safely,
  but legacy read behavior must remain unchanged.
*/
