/*
Vitals Tracker (Modular) — js/add.js
App Version: v2.001
Purpose:
- Controls Add/Edit screen (BP/HR/notes/symptoms) without altering storage schema.
- Uses existing v1 storage key via storage.js, so current data remains intact.
- Provides:
  - initAddPanel({ onCloseToPanel, onAfterSaveNavigateToLog })
  - openAddNew(fromPanelId)
  - openAddEdit(ts)
  - closeAddPanel()

Behavior Constraints (must match v1 intent):
- Save requires at least one of: sys/dia/hr/notes/symptoms.
- Editing keeps original timestamp.
- Delete is available only when editing.
- Time line shows either now (new) or entry time (edit).
- Does not interfere with carousel swipe; Add screen replaces viewport temporarily.

Latest Update (v2.001):
- Initial modular Add/Edit controller implemented with v1-equivalent validation and state flow.
*/

import { $, fmtTimeCommaDate, clamp } from "./utils.js";
import { loadRecords, upsertRecord, deleteRecord } from "./storage.js";
import { buildSymptoms, getSelectedSymptoms, clearSymptoms, setSelectedSymptoms, DEFAULT_SYMPTOMS } from "./symptoms.js";

let _isOpen = false;
let _editTs = null;
let _returnPanel = "home";
let _timeTimer = null;

let _callbacks = {
  onCloseToPanel: (panelId) => {},
  onAfterSaveNavigateToLog: () => {}
};

function intOrNull(v){
  const t = String(v ?? "").trim();
  if(!t) return null;
  const n = Number(t);
  if(!Number.isFinite(n)) return null;
  return Math.round(n);
}

function validateAnyInput(sys,dia,hr,notes,symptoms){
  return !(sys==null && dia==null && hr==null && !String(notes||"").trim() && (symptoms||[]).length===0);
}

function clearForm(){
  $("sys").value = "";
  $("dia").value = "";
  $("hr").value  = "";
  $("notes").value = "";
  clearSymptoms();
}

function tickTime(){
  const line = $("timeLine");
  const ts = (_editTs != null) ? _editTs : Date.now();
  line.textContent = fmtTimeCommaDate(ts);

  // v1-style dynamic font squeeze
  try{
    const parent = line.parentElement;
    if(parent){
      line.style.fontSize = "";
      const maxW = parent.clientWidth - 8;
      let fs = parseFloat(getComputedStyle(line).fontSize) || 28;
      let guard = 0;
      while(line.scrollWidth > maxW && fs > 16 && guard < 30){
        fs -= 1;
        line.style.fontSize = fs + "px";
        guard++;
      }
    }
  }catch{}

  if(_timeTimer) clearTimeout(_timeTimer);
  _timeTimer = setTimeout(tickTime, 900);
}

function showAdd(){
  _isOpen = true;
  $("add").classList.remove("hidden");
  $("viewport").classList.add("hidden");
  window.scrollTo({top:0, left:0, behavior:"auto"});
}

function hideAdd(){
  _isOpen = false;
  $("add").classList.add("hidden");
  $("viewport").classList.remove("hidden");
  window.scrollTo({top:0, left:0, behavior:"auto"});
}

export function isAddOpen(){
  return _isOpen;
}

export function initAddPanel({ onCloseToPanel, onAfterSaveNavigateToLog } = {}){
  _callbacks.onCloseToPanel = onCloseToPanel || _callbacks.onCloseToPanel;
  _callbacks.onAfterSaveNavigateToLog = onAfterSaveNavigateToLog || _callbacks.onAfterSaveNavigateToLog;

  // Build symptom grid once
  buildSymptoms($("symGrid"), DEFAULT_SYMPTOMS);

  $("btnBackFromAdd").addEventListener("click", () => {
    _editTs = null;
    closeAddPanel();
  });

  $("btnSave").addEventListener("click", () => {
    const sys = intOrNull($("sys").value);
    const dia = intOrNull($("dia").value);
    const hr  = intOrNull($("hr").value);
    const notes = ($("notes").value || "").toString();
    const symptoms = getSelectedSymptoms();

    if(!validateAnyInput(sys,dia,hr,notes,symptoms)){
      alert("Enter at least one value (BP, HR, notes, or symptom).");
      return;
    }

    const ts = (_editTs != null) ? _editTs : Date.now();
    upsertRecord({ ts, sys, dia, hr, notes, symptoms });

    _editTs = null;
    closeAddPanel();

    // v1 behavior: after save, go to Log
    _callbacks.onAfterSaveNavigateToLog();
  });

  $("btnDelete").addEventListener("click", () => {
    if(_editTs == null) return;
    const ok = confirm("Delete this entry? This cannot be undone.");
    if(!ok) return;

    deleteRecord(_editTs);
    _editTs = null;
    closeAddPanel();
    _callbacks.onAfterSaveNavigateToLog();
  });
}

export function openAddNew(fromPanelId="home"){
  _editTs = null;
  _returnPanel = fromPanelId || "home";

  $("editPill").classList.add("hidden");
  $("btnDelete").classList.add("hidden");

  clearForm();
  showAdd();
  tickTime();

  setTimeout(() => { try{ $("sys").focus({preventScroll:true}); }catch{} }, 0);
}

export function openAddEdit(ts){
  const recs = loadRecords();
  const r = recs.find(x => x.ts === ts);

  if(!r){
    openAddNew("log");
    return;
  }

  _editTs = ts;
  _returnPanel = "log";

  $("editPill").classList.remove("hidden");
  $("btnDelete").classList.remove("hidden");

  $("sys").value = (r.sys ?? "") === null ? "" : (r.sys ?? "");
  $("dia").value = (r.dia ?? "") === null ? "" : (r.dia ?? "");
  $("hr").value  = (r.hr  ?? "") === null ? "" : (r.hr  ?? "");
  $("notes").value = (r.notes ?? "").toString();
  setSelectedSymptoms(r.symptoms || []);

  showAdd();
  tickTime();

  setTimeout(() => { try{ document.activeElement?.blur(); }catch{} }, 0);
}

export function closeAddPanel(){
  if(_timeTimer) clearTimeout(_timeTimer);
  _timeTimer = null;

  hideAdd();
  _callbacks.onCloseToPanel(_returnPanel || "home");
}

/*
Vitals Tracker (Modular) — js/add.js (EOF)
App Version: v2.001
Notes:
- Preserves original timestamps during edits (critical for continuity).
- Uses storage.js with v1 key, protecting existing data.
- Next expected file: js/log.js (log rendering, search/date filters, edit prompt hook)
*/
