/* File: js/add.js */
/*
Vitals Tracker — Add / Edit Reading Engine
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023
Base: v2.021 (last known-good add/edit behavior)
Date: 2026-01-18

This file is: 6 of 10 (v2.023 phase)
Touched in this release: YES
Module owner: Add + Edit reading flow (WRITE PATH).

v2.023 SCOPE (LOCKED — do not drift)
- Restore v2.021 add/edit behavior.
- Single reading add/update (BP, HR, notes).
- Timestamp handling: now or preserved when editing.
- No UI creation here; bind to existing DOM IDs only.
- Accessibility-first: large tap targets, no hover-only affordances.
- Safe defaults; never throw on missing fields.

Dependencies (MUST EXIST):
- index.html (or panel markup restored in other files) provides:
    #panelAdd (or equivalent container restored later)
    #addSys, #addDia, #addHR, #addNotes
    #btnSaveReading, #btnCancelAdd
- storage.js provides:
    VTStorage.loadAll()
    VTStorage.saveAll(records)

IMPORTANT (accessibility / workflow):
- Header and EOF footer comments are REQUIRED.
- All logic is defensive; missing DOM elements = silent no-op.
- This file does NOT advance the app version.
*/

(function(){
  "use strict";

  const APP_VERSION = "v2.023";

  // ===== DOM (bind defensively) =====
  const el = id => document.getElementById(id);

  const panelAdd = el("panelAdd");
  const inSys    = el("addSys");
  const inDia    = el("addDia");
  const inHR     = el("addHR");
  const inNotes  = el("addNotes");

  const btnSave  = el("btnSaveReading");
  const btnCancel= el("btnCancelAdd");

  // If Add panel is not yet restored, exit quietly.
  if(!btnSave || !window.VTStorage){
    return;
  }

  // ===== State =====
  let editIndex = null; // null = new record

  // ===== Helpers =====
  function num(x){
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function cleanText(x){
    return (x ?? "").toString().trim();
  }

  function clearForm(){
    if(inSys)   inSys.value = "";
    if(inDia)   inDia.value = "";
    if(inHR)    inHR.value  = "";
    if(inNotes) inNotes.value = "";
    editIndex = null;
  }

  function readForm(){
    return {
      sys:   num(inSys && inSys.value),
      dia:   num(inDia && inDia.value),
      hr:    num(inHR && inHR.value),
      notes: cleanText(inNotes && inNotes.value)
    };
  }

  function populateForm(r){
    if(!r) return;
    if(inSys)   inSys.value = r.sys ?? r.systolic ?? "";
    if(inDia)   inDia.value = r.dia ?? r.diastolic ?? "";
    if(inHR)    inHR.value  = r.hr  ?? r.heartRate ?? "";
    if(inNotes) inNotes.value = r.notes ?? "";
  }

  function validReading(d){
    return (
      d.sys != null ||
      d.dia != null ||
      d.hr  != null ||
      (d.notes && d.notes.length)
    );
  }

  // ===== Save =====
  async function save(){
    const data = readForm();
    if(!validReading(data)){
      alert("Enter at least one value (BP, HR, or notes).");
      return;
    }

    const res = await window.VTStorage.loadAll();
    const records = Array.isArray(res.records) ? res.records : [];

    if(editIndex != null && records[editIndex]){
      // Update existing record
      const r = records[editIndex];
      r.sys   = data.sys;
      r.dia   = data.dia;
      r.hr    = data.hr;
      r.notes = data.notes;
      // timestamp preserved on edit
    } else {
      // New record
      records.push({
        ts: Date.now(),
        sys: data.sys,
        dia: data.dia,
        hr:  data.hr,
        notes: data.notes
      });
    }

    await window.VTStorage.saveAll(records);

    clearForm();

    // Return to Home (index controls navigation)
    if(window.setActive){
      window.setActive("home");
    } else {
      alert("Saved.");
    }

    // Refresh downstream views if present
    if(window.renderLog)   window.renderLog();
    if(window.renderCharts)window.renderCharts();
  }

  // ===== Cancel =====
  function cancel(){
    clearForm();
    if(window.setActive){
      window.setActive("home");
    }
  }

  // ===== Public API =====
  // Called by log.js Edit links later
  window.editReading = function(index){
    editIndex = index;
    window.VTStorage.loadAll().then(res=>{
      const records = Array.isArray(res.records) ? res.records : [];
      const r = records[index];
      if(!r) return;
      populateForm(r);
      if(window.setActive){
        window.setActive("add");
      }
    });
  };

  // ===== Bind =====
  btnSave.addEventListener("click", save);
  if(btnCancel) btnCancel.addEventListener("click", cancel);

  // ===== EOF =====
})();

/* EOF: js/add.js */
/*
App Version: v2.023
Base: v2.021
Touched in this release: YES

Next file to deliver (on "N"):
- File 7 of 10: js/app.js
*/
