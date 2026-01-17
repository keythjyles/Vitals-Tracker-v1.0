/* ---------------------------------------------------------
Vitals Tracker — js/storage.js
App Version: v2.008

File purpose:
- Provide a READ-ONLY storage bridge for the modular v2 shell.
- Detect existing legacy v1 Vitals Tracker data in localStorage without modifying it.
- Expose a single, stable API: window.VTStorage.detectAndLoadReadOnly()

Latest update (v2.008):
- Added robust legacy key detection (auto-scan) so no manual edits are required.
- Never writes, migrates, clears, or overwrites any data.
- Provides summary metadata (count, newest timestamp) for Home/Log/Charts panels.

Safety:
- Read-only detection only. No writes. No deletes.
- Designed to avoid breaking existing v1 app storage.

--------------------------------------------------------- */

(function () {
  "use strict";

  const VERSION = "v2.008";

  // Heuristics: we will scan localStorage and choose the best candidate key
  // that looks like a Vitals Tracker record array.
  const KEY_HINTS = [
    "vitals",
    "tracker",
    "bp",
    "blood",
    "pressure",
    "records",
    "readings",
    "entries",
    "vt"
  ];

  function nowIso() {
    try { return new Date().toISOString(); } catch { return ""; }
  }

  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }

  function isLikelyRecord(obj) {
    if (!obj || typeof obj !== "object") return false;
    // common fields across v1 variants
    const hasBP = ("sys" in obj && "dia" in obj) || ("systolic" in obj && "diastolic" in obj);
    const hasHr = ("hr" in obj) || ("heartRate" in obj) || ("pulse" in obj);
    const hasTime = ("ts" in obj) || ("time" in obj) || ("date" in obj) || ("iso" in obj);
    const hasSymptoms = ("sym" in obj) || ("symptoms" in obj);
    return !!(hasBP || hasHr || hasSymptoms) && !!hasTime;
  }

  function extractTsMs(r) {
    // Try multiple shapes, return ms or null.
    try {
      if (r == null) return null;

      // numeric epoch
      if (typeof r.ts === "number") return r.ts;
      if (typeof r.time === "number") return r.time;

      // iso strings
      const s = r.iso || r.date || r.time || r.ts;
      if (typeof s === "string") {
        const t = Date.parse(s);
        if (!Number.isNaN(t)) return t;
      }

      // separate date/time fields (best-effort)
      if (typeof r.date === "string" && typeof r.clock === "string") {
        const t = Date.parse(`${r.date} ${r.clock}`);
        if (!Number.isNaN(t)) return t;
      }
    } catch { /* ignore */ }
    return null;
  }

  function newestIsoFromArray(arr) {
    let best = null;
    for (let i = 0; i < arr.length; i++) {
      const t = extractTsMs(arr[i]);
      if (t != null && (best == null || t > best)) best = t;
    }
    return best != null ? new Date(best).toISOString() : null;
  }

  function scoreKeyName(k) {
    const s = (k || "").toLowerCase();
    let score = 0;
    for (const h of KEY_HINTS) {
      if (s.includes(h)) score += 2;
    }
    // slight preference for the common legacy naming pattern
    if (s.includes("vitals_tracker")) score += 6;
    if (s.includes("records")) score += 2;
    if (s.includes("v1")) score += 1;
    return score;
  }

  function tryCandidate(key) {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;

    const parsed = safeJsonParse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    // quick sample check without scanning entire array
    const n = parsed.length;
    const sampleIdx = [0, Math.floor(n / 2), n - 1].filter(i => i >= 0 && i < n);

    let hits = 0;
    for (const i of sampleIdx) {
      if (isLikelyRecord(parsed[i])) hits++;
    }
    if (hits === 0) return null;

    // compute metadata
    const newestIso = newestIsoFromArray(parsed);
    const score =
      scoreKeyName(key) +
      Math.min(20, parsed.length / 10) + // longer arrays are more likely to be the right one
      (newestIso ? 4 : 0) +
      hits * 3;

    return {
      key,
      records: parsed,
      meta: {
        count: parsed.length,
        newestIso
      },
      score
    };
  }

  function detectLegacy() {
    const result = {
      ok: false,
      source: null,
      sourceName: null,
      records: [],
      meta: { count: 0, newestIso: null },
      debug: { version: VERSION, scanned: 0, at: nowIso() }
    };

    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) keys.push(k);
      }

      result.debug.scanned = keys.length;

      let best = null;

      for (const k of keys) {
        const cand = tryCandidate(k);
        if (!cand) continue;
        if (!best || cand.score > best.score) best = cand;
      }

      if (!best) return result;

      result.ok = true;
      result.source = "localStorage";
      result.sourceName = best.key;
      result.records = best.records;
      result.meta = best.meta;
      result.debug.bestScore = best.score;

      return result;
    } catch (e) {
      console.error("VTStorage detectLegacy error:", e);
      result.ok = false;
      result.debug.error = String(e && e.message ? e.message : e);
      return result;
    }
  }

  // Public bridge API expected by index.html (NO WRITE METHODS).
  window.VTStorage = {
    version: VERSION,

    // Returns: { ok, source, sourceName, records, meta:{count,newestIso}, debug }
    detectAndLoadReadOnly() {
      return Promise.resolve(detectLegacy());
    }
  };
})();

/* ---------------------------------------------------------
EOF — js/storage.js
App Version: v2.008

Notes:
- This file intentionally exports ONLY window.VTStorage with a read-only detector.
- Next integration step (after detection works): js/log.js renders read-only list from VTStorage.detectAndLoadReadOnly().
--------------------------------------------------------- */
