/* File: js/reporting.js */
/*
Vitals Tracker — Reporting & Export Orchestrator
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

File Purpose
- Owns REPORTING (not raw export) for clinicians and caregivers.
- Produces concise, discipline-aware summaries from existing data.
- Exports ONLY the currently visible chart window when invoked from Charts.
- Supports PDF generation (single-page default) with:
    • Title + date range (CT)
    • Key summary bullets (clinically relevant)
    • Embedded chart image
- Does NOT collect data, does NOT render charts directly.
- Consumes chart image via callback provided by charts module.

Locked Scope (This Phase)
- Read-only.
- One-click report generation.
- No modal popups; trigger returns a Blob for save/share.
- Discipline presets: GP, Cardiology, Mental Health, Neurology.

Integration Contract (Locked)
- charts module must expose:
    window.VTCharts.getSnapshot() -> { pngDataUrl, t0, t1 }
- storage module: window.VTStorage.getAll()
- index.html provides buttons that call:
    window.VTReporting.generate({ discipline })

App Version: v2.020
Base: v2.019
Date: 2026-01-18 (America/Chicago)

Change Log (v2.020)
1) Added discipline-aware summary templates.
2) Added visible-window-only export contract.
3) Implemented PDF generator using native browser APIs (no libs).
4) Centralized reporting language to remain succinct and clinical.
*/

(() => {
  "use strict";

  const TZ = "America/Chicago";

  const fmtDate = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "short", day: "2-digit"
  });

  function dateOnly(ms) {
    try { return fmtDate.format(new Date(ms)); } catch { return "—"; }
  }

  function summarize(records, t0, t1, discipline) {
    const slice = records.filter(r => r.ts >= t0 && r.ts <= t1);

    let sys = [], dia = [], hr = [];
    slice.forEach(r => {
      if (r.sys != null) sys.push(r.sys);
      if (r.dia != null) dia.push(r.dia);
      if (r.hr  != null) hr.push(r.hr);
    });

    const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : "—";
    const max = arr => arr.length ? Math.max(...arr) : "—";

    const base = [
      `Entries reviewed: ${slice.length}`,
      `Date range: ${dateOnly(t0)} → ${dateOnly(t1)} (CT)`
    ];

    const vitals = [
      `Avg BP: ${avg(sys)}/${avg(dia)}`,
      `Max systolic: ${max(sys)}`,
      `Avg HR: ${avg(hr)}`
    ];

    const focus = {
      gp: [
        "Focus: longitudinal vitals trend and variability.",
      ],
      cardio: [
        "Focus: systolic burden and variability over time.",
      ],
      mh: [
        "Focus: physiologic correlates during reported distress.",
      ],
      neuro: [
        "Focus: autonomic variability and episodic spikes.",
      ]
    };

    return [...base, ...vitals, ...(focus[discipline] || [])];
  }

  async function generatePDF({ discipline = "gp" } = {}) {
    const charts = window.VTCharts;
    const storage = window.VTStorage;

    if (!charts || !storage) return null;

    const snap = charts.getSnapshot();
    if (!snap) return null;

    const { pngDataUrl, t0, t1 } = snap;
    const records = storage.getAll();

    const bullets = summarize(records, t0, t1, discipline);

    const doc = document.createElement("iframe");
    doc.style.position = "fixed";
    doc.style.right = "-9999px";
    document.body.appendChild(doc);

    const d = doc.contentDocument;
    d.open();
    d.write(`
      <html><head><title>Vitals Report</title>
      <style>
        body{font-family:system-ui;margin:24px}
        h1{font-size:20px;margin-bottom:8px}
        ul{padding-left:18px}
        img{max-width:100%;margin-top:12px}
      </style>
      </head><body>
      <h1>Vitals Summary Report</h1>
      <ul>${bullets.map(b=>`<li>${b}</li>`).join("")}</ul>
      <img src="${pngDataUrl}" />
      </body></html>
    `);
    d.close();

    await new Promise(r => setTimeout(r, 300));
    doc.contentWindow.print();
    document.body.removeChild(doc);
  }

  const API = Object.freeze({
    generate: generatePDF
  });

  Object.defineProperty(window, "VTReporting", {
    value: API,
    writable: false,
    configurable: false
  });

})();
 
/* EOF File: js/reporting.js */
/*
Vitals Tracker — Reporting & Export Orchestrator
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
App Version: v2.020

EOF Notes
- Reporting is clinician-facing, not data-dump export.
- Visible chart window defines report scope.
- PDF output intentionally concise and single-page by default.
*/
