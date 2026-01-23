/* 
Vitals Tracker — BOF (Wizard Add Pass Header)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/add.js
App Version Authority: js/version.js
ImplementationId: ADD-20260122-001
FileEditId: 9
Edited: 2026-01-22

Current file: js/add.js, File 1 of 3


Next file to fetch: js/store.js, File 2 of 3



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Beacon Sticky Notes (persist until user changes)
- Every file edit is its own Pass with a unique ImplementationId.
- Each Pass includes an explicit file list; even one file is “1 of 1.”
- Replace prior non-sticky header/footer content each Pass; keep only explicitly-sticky Beacon rules.
------------------------------------------------------------

Scope (this Pass)
- Wizard-driven Add flow with SAVE-PER-STEP compliance.
- Each Add tap starts a NEW wizard session (no resume).
- Save commits ONLY module-owned fields (patch semantics).
- Empty inputs NEVER overwrite prior saved values.
- Explicit clears are required to remove data.
- Symptoms-only, Mood-only, or Meds-only entries are allowed.
- Summary appears only after at least one Save.
- No Log work. No Chart work.
------------------------------------------------------------
*/

(function () {
  "use strict";

  // ---------- DOM anchors ----------
  const bodyEl = document.getElementById("addBody");
  const cardEl = document.getElementById("addCard");

  // ---------- Wizard session (ephemeral only) ----------
  const WIZ = {
    step: 1,                 // 1–5
    key: null,               // {ts,id?} after first save
    createdTs: null,         // ts anchor
    lastSaved: null,         // normalized snapshot
    hasSaved: false          // at least one Save occurred
  };

  // ---------- UI state (not persisted unless saved) ----------
  const UI = {
    symptoms: [],
    distressComputed: null,
    distressFinal: null,
    mood: null,
    meds: [],
    notes: ""
  };

  let saving = false;
  let distressTouched = false;

  // ---------- utilities ----------
  const nowTs = () => Date.now();
  const clamp = (n,l,h)=>Math.max(l,Math.min(h,Number(n)));
  const norm = s => String(s||"").trim();
  const isNum = n => typeof n==="number" && Number.isFinite(n);

  function readNum(id){
    const v=document.getElementById(id)?.value?.trim();
    if(!v) return null;
    const n=Number(v);
    return Number.isFinite(n)?n:null;
  }
  function readTxt(id){
    return norm(document.getElementById(id)?.value||"");
  }

  function ensureStore(){
    return window.VTStore && typeof VTStore.add==="function";
  }
  async function initStore(){
    try{ await VTStore.init?.(); }catch(_){}
  }

  // ---------- patch builders (module-owned only) ----------
  function patchVitals(){
    const sys=readNum("inSys");
    const dia=readNum("inDia");
    const hr =readNum("inHr");

    if((sys!=null && dia==null)||(sys==null && dia!=null)){
      alert("Enter both systolic and diastolic.");
      return null;
    }

    const p={};
    if(sys!=null && dia!=null){ p.sys=sys; p.dia=dia; }
    if(hr!=null){ p.hr=hr; }
    return p;
  }

  function patchSymptoms(){
    if(!UI.symptoms.length && UI.distressComputed==null) return {};
    const comp = UI.distressComputed!=null
      ? clamp(UI.distressComputed,0,100)
      : null;
    const fin  = UI.distressFinal!=null
      ? clamp(UI.distressFinal,0,100)
      : comp;
    return {
      symptoms: UI.symptoms.slice(),
      distressComputed: comp,
      distressFinal: fin,
      distressDelta: (comp!=null && fin!=null) ? fin-comp : null
    };
  }

  function patchMood(){
    if(!UI.mood) return {};
    return { mood:UI.mood };
  }

  function patchMedsNotes(){
    return {
      meds: UI.meds.slice(),
      notes: readTxt("inNotes")
    };
  }

  function buildPatch(step){
    if(step===1) return patchVitals();
    if(step===2) return patchSymptoms();
    if(step===3) return patchMood();
    if(step===4) return patchMedsNotes();
    return {};
  }

  function hasMeaning(p){
    return p && Object.keys(p).length>0;
  }

  // ---------- persistence ----------
  async function saveStep(step){
    if(saving) return false;
    if(!ensureStore()) return false;

    saving=true;
    await initStore();

    try{
      const patch = buildPatch(step);
      if(!hasMeaning(patch)) return true; // nothing to save

      // first save → create record
      if(!WIZ.hasSaved){
        const ts = nowTs();
        const rec = Object.assign({ ts }, patch);
        const out = await VTStore.add(rec);
        WIZ.key = { ts };
        WIZ.createdTs = ts;
        WIZ.lastSaved = rec;
        WIZ.hasSaved = true;
        return true;
      }

      // subsequent save → patch update
      const base = WIZ.lastSaved || {};
      const merged = Object.assign({}, base, patch, { ts: base.ts });
      await VTStore.update(WIZ.key, merged);
      WIZ.lastSaved = merged;
      return true;

    } finally {
      saving=false;
    }
  }

  // ---------- navigation ----------
  function showStep(n){
    WIZ.step=n;
    for(let i=1;i<=5;i++){
      const el=document.getElementById("wizStep"+i);
      if(el) el.classList.toggle("show",i===n);
    }
    const lbl=document.getElementById("vtWizStep");
    if(lbl){
      lbl.textContent = n<=4 ? `Step ${n} of 4` : "Done";
    }
  }

  function closeWizard(){
    try{
      window.VTPanels?.go?.("home",true);
    }catch(_){}
  }

  // ---------- summary ----------
  function renderSummary(){
    if(!WIZ.lastSaved) return;
    const r=WIZ.lastSaved;
    document.getElementById("sumBP").textContent =
      (isNum(r.sys)&&isNum(r.dia))?`${r.sys}/${r.dia}`:"—";
    document.getElementById("sumHR").textContent =
      isNum(r.hr)?String(r.hr):"—";
    document.getElementById("sumDistress").textContent =
      isNum(r.distressFinal)?String(r.distressFinal):"0";
    document.getElementById("sumMood").textContent =
      r.mood?`Mood: ${r.mood}`:"Mood: —";
    document.getElementById("sumSymptoms").textContent =
      r.symptoms?.length?`Symptoms: ${r.symptoms.length}`:"Symptoms: —";
    document.getElementById("sumMeds").textContent =
      r.meds?.length?`Meds: ${r.meds.map(m=>m.name).join(", ")}`:"Meds: —";
    document.getElementById("sumNotes").textContent =
      r.notes?`Notes: ${r.notes.slice(0,120)}`:"Notes: —";
  }

  // ---------- bindings ----------
  function bind(){
    document.getElementById("btnStep1Save")?.addEventListener("click",async()=>{
      if(await saveStep(1)) showStep(2);
    });
    document.getElementById("btnStep2Save")?.addEventListener("click",async()=>{
      if(await saveStep(2)) showStep(3);
    });
    document.getElementById("btnStep3Save")?.addEventListener("click",async()=>{
      if(await saveStep(3)) showStep(4);
    });
    document.getElementById("btnStep4Save")?.addEventListener("click",async()=>{
      if(await saveStep(4)){
        renderSummary();
        showStep(5);
      }
    });
    document.getElementById("btnSummaryClose")?.addEventListener("click",closeWizard);
    document.getElementById("btnWizAbort")?.addEventListener("click",closeWizard);
  }

  function reset(){
    WIZ.step=1;
    WIZ.key=null;
    WIZ.createdTs=null;
    WIZ.lastSaved=null;
    WIZ.hasSaved=false;
    UI.symptoms=[];
    UI.distressComputed=null;
    UI.distressFinal=null;
    UI.mood=null;
    UI.meds=[];
    UI.notes="";
    distressTouched=false;
    showStep(1);
  }

  // ---------- public API ----------
  window.VTAdd = Object.freeze({
    openNew(){
      reset();
      bind();
      showStep(1);
      try{ window.VTPanels?.go?.("add",true); }catch(_){}
    }
  });

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",()=>{ bind(); showStep(1); });
  }else{
    bind(); showStep(1);
  }

})();

/* 
Vitals Tracker — EOF (Wizard Add Pass Footer)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/add.js
App Version Authority: js/version.js
ImplementationId: ADD-20260122-001
FileEditId: 9
Edited: 2026-01-22

Current file: js/add.js, File 1 of 3


Next file to fetch: js/store.js, File 2 of 3



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Current file (pasted/edited in this step): js/add.js

Acceptance checks
- Wizard always starts fresh on Add.
- Save-per-step commits patches only.
- Empty inputs do not overwrite saved data.
- Symptoms-only / Mood-only / Meds-only supported.
- Summary appears only after at least one Save.
- Close returns to Home; no resume behavior.
*/
