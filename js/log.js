/* File: js/log.js */
/*
Vitals Tracker — Log Rendering & Paging Engine
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023
Base: v2.021 (last known-good log behavior)
Date: 2026-01-18

This file is: 5 of 10 (v2.023 phase)
Touched in this release: YES
Module owner: Log list rendering, paging, ordering, formatting (READ-ONLY).

v2.023 SCOPE (LOCKED — do not drift)
- Restore v2.021 log behavior and appearance.
- Read-only log (no edits performed here).
- Newest records shown first.
- Stable paging (append 25, no jump on load).
- Consistent BP / HR formatting.
- Deterministic ordering; no resort jitter.
- Accessible + mobile-safe (large hit targets, no hover reliance).

Dependencies (MUST EXIST):
- index.html:
    #logCard
    #logList
    #logMoreLink
    #logTopNote
- storage.js provides: VTStorage.loadAll()

IMPORTANT (accessibility / workflow):
- Header and EOF footer comments are REQUIRED.
- No implicit DOM creation outside declared IDs.
- No side effects outside log panel.
*/

(function(){
  "use strict";

  const APP_VERSION = "v2.023";
  const PAGE_SIZE = 25;
  const TZ = "America/Chicago";

  // ===== DOM =====
  const logCard     = document.getElementById("logCard");
  const logList     = document.getElementById("logList");
  const logMoreLink = document.getElementById("logMoreLink");
  const logTopNote  = document.getElementById("logTopNote");

  if(!logCard || !logList || !logMoreLink || !logTopNote){
    // Fail silently if log panel not present
    return;
  }

  // ===== State =====
  let records = [];
  let ordered = [];
  let rendered = 0;

  // ===== Formatters =====
  const fmtDate = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year:"numeric",
    month:"2-digit",
    day:"2-digit",
    hour:"numeric",
    minute:"2-digit",
    hour12:true
  });

  function fmtWhen(ts){
    if(!Number.isFinite(ts) || ts <= 0) return "—";
    return fmtDate.format(new Date(ts));
  }

  // ===== Extractors (defensive) =====
  function num(x){
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function tsOf(r){
    return num(r.ts ?? r.time ?? r.timestamp ?? r.date ?? r.createdAt);
  }

  function bpOf(r){
    const sys = num(r.sys ?? r.systolic ?? (r.bp && (r.bp.sys ?? r.bp.systolic)));
    const dia = num(r.dia ?? r.diastolic ?? (r.bp && (r.bp.dia ?? r.bp.diastolic)));
    return { sys, dia };
  }

  function hrOf(r){
    return num(r.hr ?? r.heartRate ?? r.pulse ?? (r.vitals && (r.vitals.hr ?? r.vitals.pulse)));
  }

  function notesOf(r){
    return (r.notes ?? r.note ?? r.text ?? "").toString().trim();
  }

  // ===== Build Row =====
  function buildRow(r, index){
    const ts  = tsOf(r);
    const bp  = bpOf(r);
    const hr  = hrOf(r);
    const txt = notesOf(r);

    const li = document.createElement("li");
    li.className = "row";
    li.dataset.index = String(index);

    const top = document.createElement("div");
    top.className = "rowTop";

    const left = document.createElement("div");
    left.textContent =
      (bp.sys != null && bp.dia != null)
        ? `${bp.sys}/${bp.dia}`
        : (bp.sys != null || bp.dia != null)
          ? `${bp.sys ?? "—"}/${bp.dia ?? "—"}`
          : "—";

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "10px";

    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = (hr != null) ? `HR ${hr}` : "—";

    // Edit placeholder (wired later)
    const edit = document.createElement("a");
    edit.href = "#";
    edit.className = "editLink";
    edit.textContent = "Edit";
    edit.addEventListener("click", e=>{
      e.preventDefault();
      alert("Edit flow restored in later v2.023 files (add.js).");
    });

    right.appendChild(pill);
    right.appendChild(edit);

    top.appendChild(left);
    top.appendChild(right);

    const sub = document.createElement("div");
    sub.className = "rowSub";
    const note = txt ? ` • ${txt.slice(0,140)}` : "";
    sub.textContent = `${fmtWhen(ts)}${note}`;

    li.appendChild(top);
    li.appendChild(sub);

    return li;
  }

  // ===== Ordering =====
  function sortNewest(arr){
    return [...arr].sort((a,b)=>{
      const ta = tsOf(a) ?? 0;
      const tb = tsOf(b) ?? 0;
      return tb - ta;
    });
  }

  // ===== Header =====
  function updateHeader(){
    if(!ordered.length){
      logTopNote.textContent = "No records detected (read-only).";
      return;
    }
    logTopNote.textContent =
      `Showing ${Math.min(rendered, ordered.length)} of ${ordered.length} records (read-only).`;
  }

  // ===== Paging =====
  function appendNext(keepAnchor){
    if(rendered >= ordered.length){
      logMoreLink.style.display = "none";
      updateHeader();
      return;
    }

    let anchor = null;
    if(keepAnchor){
      anchor = {
        top: logMoreLink.getBoundingClientRect().top,
        scroll: logCard.scrollTop
      };
    }

    const end = Math.min(ordered.length, rendered + PAGE_SIZE);
    for(let i=rendered; i<end; i++){
      logList.appendChild(buildRow(ordered[i], i));
    }
    rendered = end;

    updateHeader();
    logMoreLink.style.display = (rendered < ordered.length) ? "inline-block" : "none";

    if(anchor){
      const firstNew = logList.querySelector(`li[data-index="${rendered-PAGE_SIZE}"]`);
      if(firstNew){
        const delta = firstNew.getBoundingClientRect().top - anchor.top;
        logCard.scrollTop = anchor.scroll + delta;
      }
    }
  }

  logMoreLink.addEventListener("click", e=>{
    e.preventDefault();
    appendNext(true);
  });

  // ===== Render Reset =====
  async function renderLog(){
    logList.innerHTML = "";
    rendered = 0;

    if(!window.VTStorage){
      logTopNote.textContent = "Storage not available.";
      return;
    }

    const res = await window.VTStorage.loadAll();
    records = Array.isArray(res.records) ? res.records : [];
    ordered = records.length ? sortNewest(records) : [];

    updateHeader();
    logMoreLink.style.display = ordered.length ? "inline-block" : "none";
    appendNext(false);
  }

  // ===== Public API =====
  window.renderLog = renderLog;

  // ===== Init =====
  document.addEventListener("DOMContentLoaded", ()=>{
    renderLog();
  });

})();

/* EOF: js/log.js */
/*
App Version: v2.023
Base: v2.021
Touched in this release: YES

Next file to deliver (on "N"):
- File 6 of 10: js/add.js
*/
