/* File: js/add.js */
/*
Vitals Tracker — Add Panel (Create Reading)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version Authority: js/version.js
Base: v2.025e
Date: 2026-01-19

Pass: Render Recovery + Swipe Feel (P0)
Pass order: File 9 of 9

Prev file (in pass):
File 8 — js/log.js

Next file:
(none — end of pass)

FILE ROLE (LOCKED)
- Owns ONLY the Add Reading screen behavior: capture input, validate, save to store.
- Must NOT implement chart rendering (chart.js owns that).
- Must NOT implement log rendering (log.js owns that).
- Must NOT implement swipe/panel physics (panels.js/gestures.js own that).

GOAL OF THIS FILE IN THIS PASS
- Make Add -> Save actually create a record in the canonical store.
- After save: refresh Chart + Log, then route Home (or Log; we choose Home for now).
- Keep implementation minimal, stable, and compatible with unknown prior schemas.

ASSUMPTIONS / CONTRACTS
- index.html contains:
  - #panelAdd
  - #btnSaveReading
  - #btnHomeFromAdd
- Store surface (best effort):
  - window.VTStore.add(record) OR window.VTStore.addRecord(record) OR window.VTStore.put(record)
  - window.VTStore.getAll() exists or is optional
- Optional UI surfaces:
  - window.VTPanels.show(name) for navigation
  - window.VTChart.requestRender()/onShow()
  - window.VTLog.refresh()/render()

ANTI-DRIFT RULES
- Do NOT rename DOM IDs here.
- Do NOT add settings logic here.
- Do NOT add feature fields (distress/meds) yet — just persist base vitals + note.
*/

(function(){
  "use strict";

  function $(id){ return document.getElementById(id); }

  function vStr(){
    try{ return window.VTVersion?.getVersionString?.() || "v?.???"; }catch(_){ return "v?.???"; }
  }

  function nowIso(){
    try{ return new Date().toISOString(); }catch(_){ return String(Date.now()); }
  }

  function safeNum(x){
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function safeTrim(s){
    return (typeof s === "string") ? s.trim() : "";
  }

  function showPanel(name){
    try{
      if(window.VTPanels && typeof window.VTPanels.show === "function"){
        window.VTPanels.show(name);
        return;
      }
    }catch(_){}
    // fallback (should rarely be needed if panels.js is present)
    const ids = {
      home:"panelHome",
      charts:"panelCharts",
      log:"panelLog",
      settings:"panelSettings",
      add:"panelAdd"
    };
    const tgt = ids[name];
    for(const k of Object.values(ids)){
      const el = document.getElementById(k);
      if(el) el.classList.toggle("active", k === tgt);
    }
  }

  async function storeAddBestEffort(rec){
    // Ensure init if exists
    try{
      if(window.VTStore && typeof window.VTStore.init === "function"){
        await window.VTStore.init();
      }
    }catch(_){}

    // Try canonical add APIs
    try{
      if(window.VTStore && typeof window.VTStore.add === "function"){
        return await window.VTStore.add(rec);
      }
    }catch(_){}

    try{
      if(window.VTStore && typeof window.VTStore.addRecord === "function"){
        return await window.VTStore.addRecord(rec);
      }
    }catch(_){}

    try{
      if(window.VTStore && typeof window.VTStore.put === "function"){
        return await window.VTStore.put(rec);
      }
    }catch(_){}

    // Absolute fallback: localStorage append (only if store is missing)
    // NOTE: We keep this minimal. If VTStore exists, we should not get here.
    try{
      const key = "vitals_tracker_records_fallback";
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(rec);
      localStorage.setItem(key, JSON.stringify(arr));
      return true;
    }catch(_){}

    return false;
  }

  function requestDownstreamRefresh(){
    // Chart refresh (best effort)
    try{
      if(window.VTChart){
        if(typeof window.VTChart.requestRender === "function") window.VTChart.requestRender();
        if(typeof window.VTChart.onShow === "function"){
          // onShow rebinds + ensures viewport default; safe
          window.VTChart.onShow();
        }
      }
    }catch(_){}

    // Log refresh (best effort)
    try{
      if(window.VTLog){
        if(typeof window.VTLog.refresh === "function") window.VTLog.refresh();
        if(typeof window.VTLog.render === "function") window.VTLog.render();
        if(typeof window.VTLog.onShow === "function") window.VTLog.onShow();
      }
    }catch(_){}
  }

  function ensureAddUI(){
    // In this pass, index.html may have only a barebones Add screen.
    // If no inputs exist, we inject simple ones (sys/dia/hr/note) into #addCard.
    const card = $("addCard") || $("addBody") || $("panelAdd");
    if(!card) return;

    // If an input already exists, do nothing.
    if(card.querySelector("input[data-vt='sys']")) return;

    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "1fr 1fr";
    wrap.style.gap = "10px";
    wrap.style.marginTop = "12px";

    function mkField(label, key, placeholder){
      const box = document.createElement("div");
      box.style.display = "flex";
      box.style.flexDirection = "column";
      box.style.gap = "6px";

      const lab = document.createElement("div");
      lab.textContent = label;
      lab.style.fontSize = "12px";
      lab.style.fontWeight = "800";
      lab.style.letterSpacing = ".15px";
      lab.style.color = "rgba(235,245,255,0.70)";

      const inp = document.createElement("input");
      inp.type = "number";
      inp.inputMode = "numeric";
      inp.placeholder = placeholder;
      inp.setAttribute("data-vt", key);
      inp.style.width = "100%";
      inp.style.padding = "12px 12px";
      inp.style.borderRadius = "14px";
      inp.style.border = "1px solid rgba(235,245,255,0.16)";
      inp.style.background = "rgba(0,0,0,0.16)";
      inp.style.color = "rgba(235,245,255,0.88)";
      inp.style.fontSize = "16px";
      inp.style.fontWeight = "900";
      inp.style.outline = "none";

      box.appendChild(lab);
      box.appendChild(inp);
      return box;
    }

    wrap.appendChild(mkField("Systolic", "sys", "e.g. 132"));
    wrap.appendChild(mkField("Diastolic", "dia", "e.g. 84"));
    wrap.appendChild(mkField("Heart Rate", "hr", "e.g. 74"));

    const noteBox = document.createElement("div");
    noteBox.style.gridColumn = "1 / -1";
    noteBox.style.display = "flex";
    noteBox.style.flexDirection = "column";
    noteBox.style.gap = "6px";
    noteBox.style.marginTop = "2px";

    const noteLab = document.createElement("div");
    noteLab.textContent = "Notes (optional)";
    noteLab.style.fontSize = "12px";
    noteLab.style.fontWeight = "800";
    noteLab.style.letterSpacing = ".15px";
    noteLab.style.color = "rgba(235,245,255,0.70)";

    const note = document.createElement("textarea");
    note.setAttribute("data-vt", "note");
    note.rows = 3;
    note.placeholder = "Symptoms, meds taken, what you felt…";
    note.style.width = "100%";
    note.style.padding = "12px 12px";
    note.style.borderRadius = "14px";
    note.style.border = "1px solid rgba(235,245,255,0.16)";
    note.style.background = "rgba(0,0,0,0.16)";
    note.style.color = "rgba(235,245,255,0.86)";
    note.style.fontSize = "14px";
    note.style.fontWeight = "800";
    note.style.outline = "none";
    note.style.resize = "vertical";

    noteBox.appendChild(noteLab);
    noteBox.appendChild(note);

    wrap.appendChild(noteBox);

    // Insert before save button if possible
    const saveBtn = $("btnSaveReading");
    if(saveBtn && saveBtn.parentNode){
      saveBtn.parentNode.insertBefore(wrap, saveBtn);
    } else {
      card.appendChild(wrap);
    }

    // Small hint
    const hint = document.createElement("div");
    hint.textContent = `Saved locally. (${vStr()})`;
    hint.style.marginTop = "10px";
    hint.style.color = "rgba(235,245,255,0.55)";
    hint.style.fontSize = "12px";
    hint.style.fontWeight = "800";
    hint.style.letterSpacing = ".15px";
    card.appendChild(hint);
  }

  function readAddInputs(){
    const root = $("panelAdd") || document;
    const sys = safeNum(root.querySelector("[data-vt='sys']")?.value);
    const dia = safeNum(root.querySelector("[data-vt='dia']")?.value);
    const hr  = safeNum(root.querySelector("[data-vt='hr']")?.value);
    const note= safeTrim(root.querySelector("[data-vt='note']")?.value || "");

    return { sys, dia, hr, note };
  }

  function validate({sys,dia,hr}){
    // Minimal validation: at least one numeric field present.
    const any = (sys!=null) || (dia!=null) || (hr!=null);
    if(!any) return "Enter at least one value (BP or HR).";

    // If one BP value entered, require both sys+dia (avoid partial BP confusion).
    if((sys!=null && dia==null) || (sys==null && dia!=null)){
      return "Enter both Systolic and Diastolic for BP.";
    }

    // Basic sanity bounds (non-blocking but prevents obvious typos)
    if(sys!=null && (sys < 50 || sys > 300)) return "Systolic looks out of range.";
    if(dia!=null && (dia < 30 || dia > 200)) return "Diastolic looks out of range.";
    if(hr!=null  && (hr  < 20 || hr  > 240)) return "Heart Rate looks out of range.";

    return null;
  }

  async function onSave(){
    const btn = $("btnSaveReading");
    if(btn) btn.disabled = true;

    try{
      const vals = readAddInputs();
      const err = validate(vals);
      if(err){
        alert(err);
        return;
      }

      // Canonical record shape (compat-friendly)
      const rec = {
        id: `r_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        ts: Date.now(),
        iso: nowIso(),
        sys: vals.sys,
        dia: vals.dia,
        hr:  vals.hr,
        note: vals.note
      };

      const ok = await storeAddBestEffort(rec);
      if(!ok){
        alert("Save failed. Store unavailable.");
        return;
      }

      // Refresh downstream views
      requestDownstreamRefresh();

      // Route home (simple, predictable)
      showPanel("home");
    } finally {
      if(btn) btn.disabled = false;
    }
  }

  function bind(){
    // Ensure Add UI exists
    ensureAddUI();

    // Home button on Add screen
    const homeBtn = $("btnHomeFromAdd");
    if(homeBtn && !homeBtn.dataset.vtBound){
      homeBtn.dataset.vtBound = "1";
      homeBtn.addEventListener("click", () => showPanel("home"));
    }

    // Save button
    const saveBtn = $("btnSaveReading");
    if(saveBtn && !saveBtn.dataset.vtBound){
      saveBtn.dataset.vtBound = "1";
      saveBtn.addEventListener("click", () => { onSave(); });
    }
  }

  // Public hook (optional)
  window.VTAdd = Object.freeze({
    bind,
    save: onSave
  });

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => bind());
  }else{
    bind();
  }

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/add.js
App Version Authority: js/version.js
Base: v2.025e
Touched in this pass: js/add.js (Add -> Save -> refresh -> route home)
Pass: Render Recovery + Swipe Feel (P0)
Pass order: File 9 of 9
Prev file: js/log.js (File 8 of 9)
Next file: (none — end of pass)
*/
