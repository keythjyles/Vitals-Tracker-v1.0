/* File: js/reporting.js */
/*
Vitals Tracker — Reporting / Export Foundation
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
App Version: v2.021
Base: v2.020
Date: 2026-01-18

Change Log (v2.021)
1) Established stable Reporting API surface (no UI yet):
   - VTReporting.buildSummary({ records, range }) -> { ... }
   - VTReporting.exportJSON({ records, meta }) -> { filename, blob }
   - VTReporting.exportCSV({ records, meta }) -> { filename, blob }
2) Clinically oriented wording (succinct):
   - Summary includes: counts, date range, systolic/diastolic min/max, HR min/max, notable HTN spans count.
3) Discipline presets scaffold (GP / MH / Cardio / Neuro) for future report templates:
   - VTReporting.getTemplate("gp"|"mh"|"cardio"|"neuro") -> { title, sections[] }
4) No external libraries, no PDF yet (reserved hook):
   - VTReporting.exportPDF is a stub that throws with a clear message until implemented.

Ownership / Boundaries
- This module produces report-ready data structures and export blobs.
- UI buttons/menus live in ui.js / export.js / reports.js (later).
- Chart capture for PDF will be implemented in chart.js (canvas toDataURL) and consumed here.

Exports
- window.VTReporting
*/

(function(){
  "use strict";

  function safeNum(x){
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function extractTs(r){
    return r.ts || r.time || r.timestamp || r.date || r.createdAt || r.created_at || r.iso || null;
  }
  function extractBP(r){
    const sys = safeNum(r.sys ?? r.systolic ?? (r.bp && (r.bp.sys ?? r.bp.systolic)));
    const dia = safeNum(r.dia ?? r.diastolic ?? (r.bp && (r.bp.dia ?? r.bp.diastolic)));
    return { sys, dia };
  }
  function extractHR(r){
    return safeNum(r.hr ?? r.heartRate ?? r.pulse ?? (r.vitals && (r.vitals.hr ?? r.vitals.pulse)));
  }
  function extractNote(r){
    return (r.note ?? r.notes ?? r.text ?? r.comment ?? "").toString().trim();
  }

  function ymd(ms){
    if(!Number.isFinite(ms) || ms<=0) return "—";
    const d = new Date(ms);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

  // HTN band definitions (systolic only), for span detection.
  // NOTE: visuals/legend are owned by chart.js; this is for reporting logic only.
  const SYS_BANDS = [
    { key:"hypo",    name:"Hypotension (sys < 90)",      test:(s)=> s!=null && s < 90 },
    { key:"optimal", name:"Optimal/Normal (90–129)",     test:(s)=> s!=null && s >= 90 && s < 130 },
    { key:"htn1",    name:"Hypertension Stage 1 (130–139)", test:(s)=> s!=null && s >= 130 && s < 140 },
    { key:"htn2",    name:"Hypertension Stage 2 (≥ 140)", test:(s)=> s!=null && s >= 140 }
  ];

  function bandKeyForSys(sys){
    for(const b of SYS_BANDS){
      if(b.test(sys)) return b.key;
    }
    return "unknown";
  }

  function normalizeRecords(records){
    const out = Array.isArray(records) ? records.slice() : [];
    out.sort((a,b)=>{
      const ta = new Date(extractTs(a) || 0).getTime() || 0;
      const tb = new Date(extractTs(b) || 0).getTime() || 0;
      return ta - tb; // oldest->newest for span detection
    });
    return out;
  }

  function computeRange(records){
    let tMin = Infinity, tMax = -Infinity;
    for(const r of records){
      const t = new Date(extractTs(r) || 0).getTime();
      if(Number.isFinite(t) && t>0){
        tMin = Math.min(tMin, t);
        tMax = Math.max(tMax, t);
      }
    }
    if(!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMin===Infinity || tMax===-Infinity){
      return { tMin:null, tMax:null, ok:false };
    }
    return { tMin, tMax, ok:true };
  }

  function computeMinMax(records){
    let sysMin=null, sysMax=null, diaMin=null, diaMax=null, hrMin=null, hrMax=null;

    for(const r of records){
      const { sys, dia } = extractBP(r);
      const hr = extractHR(r);

      if(sys!=null){ sysMin = (sysMin==null)?sys:Math.min(sysMin,sys); sysMax = (sysMax==null)?sys:Math.max(sysMax,sys); }
      if(dia!=null){ diaMin = (diaMin==null)?dia:Math.min(diaMin,dia); diaMax = (diaMax==null)?dia:Math.max(diaMax,dia); }
      if(hr!=null){ hrMin = (hrMin==null)?hr:Math.min(hrMin,hr); hrMax = (hrMax==null)?hr:Math.max(hrMax,hr); }
    }
    return { sysMin, sysMax, diaMin, diaMax, hrMin, hrMax };
  }

  // Span detection: counts contiguous stretches where bandKey==target (using record-to-record adjacency).
  // This is intentionally simple and deterministic; it will get richer once we add distress + med markers.
  function countBandSpans(records, targetKey){
    const recs = normalizeRecords(records);
    let inSpan = false;
    let spans = 0;

    for(const r of recs){
      const sys = extractBP(r).sys;
      const key = bandKeyForSys(sys);
      if(key === targetKey){
        if(!inSpan){ inSpan=true; spans++; }
      }else{
        inSpan=false;
      }
    }
    return spans;
  }

  function buildSummary({ records, range }){
    const recs = Array.isArray(records) ? records : [];
    const r = range && range.ok ? range : computeRange(recs);
    const mm = computeMinMax(recs);

    const notesCount = recs.reduce((acc,rr)=> acc + (extractNote(rr) ? 1 : 0), 0);

    return {
      generatedAt: new Date().toISOString(),
      records: recs.length,
      notesCount,
      dateRange: r.ok ? { from: ymd(r.tMin), to: ymd(r.tMax) } : { from:"—", to:"—" },
      bp: {
        systolic: { min: mm.sysMin, max: mm.sysMax },
        diastolic:{ min: mm.diaMin, max: mm.diaMax }
      },
      hr: { min: mm.hrMin, max: mm.hrMax },
      spans: {
        htn2: countBandSpans(recs, "htn2"),
        htn1: countBandSpans(recs, "htn1"),
        hypo: countBandSpans(recs, "hypo")
      }
    };
  }

  function getTemplate(kind){
    const k = (kind||"gp").toLowerCase();
    const templates = {
      gp: {
        title: "Vitals Summary (Primary Care)",
        sections: [
          "Clinically relevant summary (counts, ranges).",
          "BP/HR min/max, date range, frequency context.",
          "Selected notes (future: filter by distress/med markers)."
        ]
      },
      mh: {
        title: "Vitals + Distress Summary (Mental Health)",
        sections: [
          "Distress distribution over time (future).",
          "Correlation: distress vs BP/HR and symptom clusters (future).",
          "Selected notes (panic/anxiety markers)."
        ]
      },
      cardio: {
        title: "BP/HR Trends (Cardiology)",
        sections: [
          "Hypertension span counts (sys bands).",
          "BP/HR variability + clusters (future: meds markers).",
          "Selected episodes with timestamps."
        ]
      },
      neuro: {
        title: "Headache/Neuro Context (Neurology)",
        sections: [
          "BP/HR context around headache episodes (notes).",
          "Event clustering + physiologic response patterns (future).",
          "Selected episodes with timestamps."
        ]
      }
    };
    return templates[k] || templates.gp;
  }

  function exportJSON({ records, meta }){
    const payload = {
      meta: meta || {},
      exportedAt: new Date().toISOString(),
      records: Array.isArray(records) ? records : []
    };
    const text = JSON.stringify(payload, null, 2);
    const blob = new Blob([text], { type:"application/json" });
    const filename = (meta && meta.filename) ? meta.filename : `vitals_export_${Date.now()}.json`;
    return { filename, blob };
  }

  function exportCSV({ records, meta }){
    const recs = Array.isArray(records) ? records : [];
    const header = ["timestamp","date","time","systolic","diastolic","hr","notes"].join(",");
    const rows = recs.map(r=>{
      const t = new Date(extractTs(r) || 0).getTime();
      const d = Number.isFinite(t) && t>0 ? new Date(t) : null;
      const date = d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` : "";
      const hh = d ? d.getHours() : "";
      const mm = d ? String(d.getMinutes()).padStart(2,"0") : "";
      const time = d ? `${String(hh).padStart(2,"0")}:${mm}` : "";
      const bp = extractBP(r);
      const hr = extractHR(r);
      const note = extractNote(r).replace(/"/g,'""');
      return [
        Number.isFinite(t) ? t : "",
        date,
        time,
        bp.sys ?? "",
        bp.dia ?? "",
        hr ?? "",
        `"${note}"`
      ].join(",");
    });
    const text = [header, ...rows].join("\n");
    const blob = new Blob([text], { type:"text/csv" });
    const filename = (meta && meta.filename) ? meta.filename : `vitals_export_${Date.now()}.csv`;
    return { filename, blob };
  }

  function exportPDF(){
    // Reserved hook. Implement later in a single place (reporting.js) using:
    // - chart.js canvas toDataURL
    // - simple, native print-to-PDF workflow OR embedded PDF generator (if we add one).
    throw new Error("PDF export not implemented yet (reserved).");
  }

  window.VTReporting = {
    computeRange,
    buildSummary,
    getTemplate,
    exportJSON,
    exportCSV,
    exportPDF
  };

})();
