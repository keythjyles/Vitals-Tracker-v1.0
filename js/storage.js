/* Vitals Tracker — Read-Only Storage Bridge
 * Version: v2.010
 * Purpose: Detect and read ALL legacy Vitals Tracker data safely.
 * Writes NOTHING. Ever.
 */

(function () {
  const KNOWN_KEYS = [
    // canonical
    "vitals_tracker_records",
    "vitals_tracker_records_v1",
    "vitals_tracker_records_v1_15",
    "vitals_tracker_records_v1_17",
    "vitals_tracker_records_v1_18",
    "vitals_tracker_records_v1_19",

    // fallbacks seen in wild
    "vitals_records",
    "vitals",
    "vt_records",
    "records"
  ];

  function tryParse(raw) {
    if (!raw) return null;
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  }

  function scanLocalStorage() {
    const hits = [];

    // 1) Try known keys first (fast path)
    for (const key of KNOWN_KEYS) {
      const parsed = tryParse(localStorage.getItem(key));
      if (parsed && parsed.length) {
        hits.push({ key, records: parsed });
      }
    }

    // 2) Fallback: brute-scan everything
    if (!hits.length) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const parsed = tryParse(localStorage.getItem(key));
        if (parsed && parsed.length && typeof parsed[0] === "object") {
          hits.push({ key, records: parsed });
        }
      }
    }

    return hits;
  }

  function normalize(records) {
    // Do NOT mutate originals
    return records
      .map(r => ({ ...r }))
      .filter(r => typeof r === "object");
  }

  function getNewest(records) {
    let newest = null;
    for (const r of records) {
      const t =
        r.ts ||
        r.time ||
        r.timestamp ||
        r.date ||
        r.createdAt ||
        r.created_at ||
        null;

      const ms = new Date(t).getTime();
      if (Number.isFinite(ms)) {
        if (!newest || ms > newest) newest = ms;
      }
    }
    return newest ? new Date(newest).toISOString() : null;
  }

  function detect() {
    const hits = scanLocalStorage();

    if (!hits.length) {
      return {
        source: "localStorage",
        entries: 0,
        newest: null,
        records: []
      };
    }

    // Choose the largest dataset (safest heuristic)
    hits.sort((a, b) => b.records.length - a.records.length);
    const best = hits[0];
    const records = normalize(best.records);

    return {
      source: `localStorage — ${best.key}`,
      entries: records.length,
      newest: getNewest(records),
      records
    };
  }

  // Public read-only API
  window.StorageBridge = {
    detect,
    getAll() {
      return detect().records;
    },
    getRecords() {
      return detect().records;
    },
    getSummary() {
      const d = detect();
      return {
        source: d.source,
        entries: d.entries,
        newest: d.newest
      };
    }
  };
})();
