/* 
Vitals Tracker — BOF (Wizard Add Pass Header)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/add.js
App Version Authority: js/version.js
ImplementationId: WIZ-20260121-001
FileEditId: 8
Edited: 2026-01-21

Current file: js/add.js, File 1 of 1


Next file to fetch: EOL, EOP, File 0 of 0



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Beacon Sticky Notes (persist until user changes)
- Every file edit is its own Pass with a unique ImplementationId.
- Each Pass includes an explicit file list; even one file is “1 of 1.”
- Replace prior non-sticky header/footer content each Pass; keep only explicitly-sticky Beacon rules.

------------------------------------------------------------

Scope (this Pass)
- Implement Wizard-style Add flow (reduce overwhelm):
  Step 1: Vitals (BP/HR) -> Save/Next
  Step 2: Symptoms (clinical categories, multi-select) -> auto-weight distress + adjustable slider -> Save/Next
  Step 3: Mood (5 choices, single-select toggle) -> Save/Next
  Step 4: Medications + Notes -> Save/Finish
  Finish: Show summary “pill card” + Close returns to parent of Add panel.
- Save on every step so partial data persists if user aborts mid-process.
- No Log work. No Chart work.

------------------------------------------------------------ 
*/

(function () {
  "use strict";

  const btnSaveLegacy = document.getElementById("btnSaveReading");   // may exist in older UI
  const btnHomeLegacy = document.getElementById("btnHomeFromAdd");   // may exist in older UI
  const bodyEl  = document.getElementById("addBody");
  const cardEl  = document.getElementById("addCard");

  let saving = false;

  // Edit mode (opened from Log)
  const EDIT = { active:false, key:null, original:null };

  // Wizard state
  const WIZ = {
    step: 1,                 // 1..5 (5 = summary)
    createdTs: null,         // ts for new record
    key: null,               // {id?, ts?} used for updates
    lastSaved: null          // normalized record snapshot
  };

  const UI = {
    symptoms: [],            // array of symptom keys
    distressComputed: null,  // 0..100 computed from symptoms
    distressFinal: 0,        // 0..100 user override (default 0)
    meds: [],                // [{name, atTs}]
    mood: null               // one of MOODS.k (default none)
  };

  // ---------- utilities ----------
  function safeAlert(msg){ try{ alert(msg);}catch(_){} }
  function nowTs(){ return Date.now(); }

  function bindOnce(el,key,fn){
    if(!el) return;
    const k="vtBound_"+key;
    try{
      if(el.dataset && el.dataset[k]==="1") return;
      if(el.dataset) el.dataset[k]="1";
    }catch(_){}
    el.addEventListener("click",fn,false);
  }

  function clamp(n, lo, hi){
    const x = Number(n);
    if(!Number.isFinite(x)) return lo;
    return Math.max(lo, Math.min(hi, x));
  }

  function normStr(s){ return String(s||"").trim(); }

  function uniqLower(arr){
    const out=[], seen=new Set();
    (arr||[]).forEach(x=>{
      const v=normStr(x);
      if(!v) return;
      const k=v.toLowerCase();
      if(seen.has(k)) return;
      seen.add(k);
      out.push(v);
    });
    return out;
  }

  function ensureStoreReady(){
    return !!(window.VTStore && typeof window.VTStore.init==="function" && typeof window.VTStore.add==="function");
  }

  async function initStoreIfNeeded(){
    try{ await window.VTStore?.init?.(); }catch(_){}
  }

  function hasUpdateAPI(){
    const s = window.VTStore || {};
    return (typeof s.update==="function") || (typeof s.put==="function") || (typeof s.set==="function") || (typeof s.upsert==="function");
  }

  async function updateRecord(key, rec){
    const s = window.VTStore || {};
    if (typeof s.update==="function") return s.update(key, rec);
    if (typeof s.put==="function")    return s.put(key, rec);
    if (typeof s.set==="function")    return s.set(key, rec);
    if (typeof s.upsert==="function") return s.upsert(key, rec);
    throw new Error("No update API");
  }

  async function getAllRecords(){
    try{
      if(!window.VTStore || typeof window.VTStore.getAll!=="function") return [];
      const res = window.VTStore.getAll();
      const arr = (res && typeof res.then==="function") ? await res : res;
      return Array.isArray(arr) ? arr : [];
    }catch(_){ return []; }
  }

  function findByIdOrTs(all, key){
    if(!Array.isArray(all) || !key) return null;
    if(key.id!=null){
      for(const r of all){
        if(r && (r.id===key.id || r._id===key.id)) return r;
      }
    }
    if(key.ts!=null){
      for(const r of all){
        const t = (r && typeof r.ts==="number") ? r.ts : null;
        if(t===key.ts) return r;
      }
    }
    return null;
  }

  function normalizeMeds(arr){
    const out=[], seen=new Set();
    (arr||[]).forEach(m=>{
      const name = normStr(m && m.name);
      if(!name) return;
      const k=name.toLowerCase();
      if(seen.has(k)) return;
      seen.add(k);
      out.push({ name, atTs: (m && typeof m.atTs==="number") ? m.atTs : null });
    });
    return out;
  }

  function readNumber(id){
    const v = document.getElementById(id)?.value?.trim();
    if(!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function readText(id){
    return String(document.getElementById(id)?.value||"").trim();
  }

  function writeVal(id, v){
    const el=document.getElementById(id);
    if(!el) return;
    try{ el.value = (v==null) ? "" : String(v); }catch(_){}
  }

  function formatBP(sys,dia){
    if(sys==null && dia==null) return "—";
    if(sys==null || dia==null) return "—";
    return `${Math.round(sys)}/${Math.round(dia)}`;
  }

  function fmtHr(hr){
    return (hr==null) ? "—" : String(Math.round(hr));
  }

  // ---------- symptoms catalog + scoring ----------
  const SYMPTOMS = Object.freeze([
    { section:"Cardiovascular", items:[
      { k:"chest_tight",  label:"Chest tightness/pressure", w:18 },
      { k:"palpitations", label:"Palpitations/irregular beat", w:12 },
      { k:"bp_spike",     label:"Feels BP spike/pounding", w:10 },
      { k:"near_syncope", label:"Near-faint / feels like passing out", w:18 },
      { k:"edema",        label:"Swelling/edema", w:8 }
    ]},
    { section:"Respiratory", items:[
      { k:"air_hunger",   label:"Air hunger / starving for air", w:18 },
      { k:"sob",          label:"Shortness of breath", w:14 },
      { k:"wheeze",       label:"Wheezing", w:8 },
      { k:"apnea_fear",   label:"Woke gasping / apnea episode", w:16 }
    ]},
    { section:"Neurologic", items:[
      { k:"dizzy",        label:"Dizziness/lightheaded", w:12 },
      { k:"vertigo",      label:"Vertigo/spinning", w:14 },
      { k:"brain_fog",    label:"Brain fog / confusion", w:12 },
      { k:"tremor",       label:"Shakes/tremor", w:10 },
      { k:"headache_flare",label:"Headache flare", w:14 }
    ]},
    { section:"GI / Autonomic", items:[
      { k:"nausea",       label:"Nausea", w:10 },
      { k:"gi_cramp",     label:"Stomach pain/cramping", w:10 },
      { k:"diarrhea",     label:"Diarrhea/urgent bowel", w:10 },
      { k:"sweats",       label:"Sweats/hot flashes", w:10 },
      { k:"cold_clammy",  label:"Cold/clammy", w:10 }
    ]},
    { section:"Pain / Body", items:[
      { k:"body_tension", label:"Severe body tension", w:10 },
      { k:"back_pain",    label:"Back/leg pain flare", w:10 },
      { k:"chest_pain",   label:"Chest pain (non-cardiac suspected)", w:12 }
    ]},
    { section:"Mental / Distress", items:[
      { k:"panic",        label:"Panic sensations", w:18 },
      { k:"doom",         label:"Sense of doom", w:14 },
      { k:"agitated",     label:"Agitated/irritable", w:10 },
      { k:"cannot_relax", label:"Cannot downshift/relax", w:12 },
      { k:"unsafe_alone", label:"Feels unsafe alone right now", w:18 }
    ]}
  ]);

  function symptomWeightTotal(keys){
    const set = new Set((keys||[]).map(x=>String(x)));
    let sum = 0;
    for(const sec of SYMPTOMS){
      for(const it of sec.items){
        if(set.has(it.k)) sum += Number(it.w)||0;
      }
    }
    return sum;
  }

  function computeDistressFromSymptoms(keys){
    const n = (keys||[]).length;
    const w = symptomWeightTotal(keys);

    const base = w;
    const comp = (n<=2) ? 0 : (n<=4 ? 6 : (n<=7 ? 14 : 22));
    const raw  = base + comp;

    const score = 100 * (1 - Math.exp(-raw / 45));
    return clamp(score, 0, 100);
  }

  // ---------- distress colors ----------
  function distressColor(score){
    const s = clamp(score, 0, 100);
    if (s <= 10) return "rgba(80,140,220,.28)";
    if (s <= 25) return "rgba(90,190,170,.26)";
    if (s <= 45) return "rgba(230,210,90,.24)";
    if (s <= 70) return "rgba(230,150,70,.26)";
    return "rgba(200,70,90,.30)";
  }

  // ---------- Mood module (single-select checkbox-style) ----------
  const MOODS = Object.freeze([
    { k:"depressed", short:"Dep",  label:"Depressed" },
    { k:"neutral",   short:"Calm", label:"Neutral/Calm" },
    { k:"elevated",  short:"Up",   label:"Elevated/Up" },
    { k:"agitated",  short:"Agit", label:"Agitated" },
    { k:"panic",     short:"Panic",label:"Panic" }
  ]);

  function moodLabel(k){
    const hit = MOODS.find(x=>x.k===k);
    return hit ? hit.label : "";
  }

  // ---------- record normalize/build ----------
  function normalizeRecord(r){
    const ts = (r && typeof r.ts==="number") ? r.ts : null;

    const sys = (r && typeof r.sys==="number") ? r.sys :
                (r && typeof r.systolic==="number") ? r.systolic : null;

    const dia = (r && typeof r.dia==="number") ? r.dia :
                (r && typeof r.diastolic==="number") ? r.diastolic : null;

    const hr  = (r && typeof r.hr==="number") ? r.hr :
                (r && typeof r.heartRate==="number") ? r.heartRate : null;

    const notes = String((r && (r.notes ?? r.note ?? r.comment ?? r.memo)) ?? "");
    const symptoms = Array.isArray(r && r.symptoms) ? uniqLower(r.symptoms) : [];

    const dc = (r && Number.isFinite(Number(r.distressComputed))) ? clamp(Number(r.distressComputed),0,100) : null;
    const df = (r && Number.isFinite(Number(r.distressFinal))) ? clamp(Number(r.distressFinal),0,100) : null;

    const meds = Array.isArray(r && r.meds) ? normalizeMeds(r.meds) : [];
    const mood = (r && typeof r.mood==="string") ? normStr(r.mood) : null;

    return { ts, sys, dia, hr, notes, symptoms, distressComputed: dc, distressFinal: df, meds, mood };
  }

  function buildRecordFromUI(){
    const sys = readNumber("inSys");
    const dia = readNumber("inDia");
    const hr  = readNumber("inHr");
    const notes = readText("inNotes");

    const computed = (UI.distressComputed==null) ? null : Math.round(clamp(UI.distressComputed,0,100));
    const final    = (UI.distressFinal==null) ? null : Math.round(clamp(UI.distressFinal,0,100));
    const delta    = (computed==null || final==null) ? null : (final - computed);

    const ts = (EDIT.active && EDIT.original && typeof EDIT.original.ts==="number") ? EDIT.original.ts :
               (WIZ.createdTs!=null) ? WIZ.createdTs :
               nowTs();

    return {
      ts,
      sys: (sys==null ? null : Number(sys)),
      dia: (dia==null ? null : Number(dia)),
      hr:  (hr==null  ? null : Number(hr)),
      notes: notes || "",
      symptoms: (UI.symptoms||[]).slice(),
      distressComputed: computed,
      distressFinal: final,
      distressDelta: delta,
      mood: UI.mood || null,
      meds: (UI.meds||[]).slice()
    };
  }

  function validateVitalsStep(rec){
    const hasSys = rec.sys!=null;
    const hasDia = rec.dia!=null;
    if((hasSys && !hasDia) || (!hasSys && hasDia)){
      safeAlert("If entering BP, please enter BOTH systolic and diastolic.");
      return false;
    }
    // HR is optional.
    return true;
  }

  // ---------- settings meds ----------
  function getMedList(){
    try{
      if(window.VTSettings && typeof window.VTSettings.getMedNames==="function"){
        return window.VTSettings.getMedNames() || [];
      }
    }catch(_){}
    return [];
  }

  function addMedToSettings(name){
    try{
      if(window.VTSettings && typeof window.VTSettings.addMedName==="function"){
        window.VTSettings.addMedName(name);
      }
    }catch(_){}
  }

  function refreshMedDatalist(){
    const dl=document.getElementById("dlMedNames");
    if(!dl) return;
    const meds=getMedList();
    dl.innerHTML="";
    meds.forEach(m=>{
      const opt=document.createElement("option");
      opt.value=m;
      dl.appendChild(opt);
    });
  }

  // ---------- styles + injection ----------
  function ensureWizardStyles(){
    if(document.getElementById("vtAddWizardStyles")) return;
    const st=document.createElement("style");
    st.id="vtAddWizardStyles";
    st.textContent=`
      #vtAddWizard, #vtAddWizard * { box-sizing:border-box; }

      .vtWizHeader{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:10px;
      }
      .vtWizTitle{
        font-weight:950;
        letter-spacing:.14px;
        color:rgba(255,255,255,.92);
      }
      .vtWizStep{
        font-size:12px;
        color:rgba(235,245,255,.58);
        white-space:nowrap;
      }
      .vtWizClose{
        flex:0 0 auto;
      }

      .vtWizPane{ display:none; }
      .vtWizPane.show{ display:block; }

      /* Vitals grid */
      .vtTopGrid{
        display:grid;
        grid-template-columns:repeat(4, minmax(0,1fr));
        gap:12px;
        width:100%;
        margin-bottom:10px;
        overflow:hidden;
      }
      .vtBoxField{min-width:0}
      .vtBoxLabel{
        font-weight:900;
        font-size:13px;
        letter-spacing:.3px;
        opacity:.92;
        text-align:center;
        margin:0 0 4px 0;
      }
      .vtBoxInput{
        width:100%;
        font-size:20px;
        text-align:center;
        border-width:2px !important;
        border-style:solid !important;
        border-color:rgba(180,210,255,.55) !important;
        box-shadow:
          inset 0 0 0 1px rgba(235,245,255,.10),
          0 0 0 1px rgba(0,0,0,.20);
      }
      .vtDistressBox{
        width:100%;
        min-height:46px;
        border-radius:16px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:950;
        font-size:26px;
        letter-spacing:.6px;
        border:1px solid rgba(180,210,255,.20);
        box-shadow:inset 0 0 0 1px rgba(235,245,255,.10);
        background:rgba(0,0,0,.08);
        color:rgba(255,255,255,.92);
        overflow:hidden;
      }

      .vtTopGridSliderRow{
        display:grid;
        grid-template-columns:repeat(4, minmax(0,1fr));
        gap:12px;
        width:100%;
        margin:8px 0 2px;
      }
      .vtTopGridSliderRow .vtSliderHost{grid-column:4 / 5}
      .vtSlider{ width:100%; height:28px; }
      .vtDistressMeta{
        font-size:12px;
        color:rgba(235,245,255,.58);
        line-height:1.25;
        margin-top:6px;
      }

      .vtSection{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.10)}
      .vtSectionHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
      .vtSectionTitle{font-weight:950;letter-spacing:.12px;color:rgba(255,255,255,.90)}
      .vtSectionHint{font-size:12px;color:rgba(235,245,255,.52);line-height:1.25}

      .vtRow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .vtTagList{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
      .vtTag{
        padding:8px 10px;border-radius:999px;
        background:rgba(10,16,30,.40);
        border:1px solid rgba(180,210,255,.18);
        box-shadow:inset 0 0 0 1px rgba(235,245,255,.08);
        font-size:12px;font-weight:800;color:rgba(255,255,255,.86);
        display:flex;align-items:center;gap:8px
      }
      .vtTag button{
        width:22px;height:22px;border-radius:999px;
        background:rgba(180,60,80,.16);
        display:flex;align-items:center;justify-content:center;
        box-shadow:inset 0 0 0 1px rgba(235,245,255,.08);
      }

      .vtMoodRow{
        display:grid;
        grid-template-columns:repeat(5, minmax(0,1fr));
        gap:8px;
        width:100%;
      }
      .vtMoodBtn{
        width:100%;
        padding:9px 6px;
        border-radius:999px;
        border:1px solid rgba(180,210,255,.18);
        background:rgba(0,0,0,.10);
        box-shadow:inset 0 0 0 1px rgba(235,245,255,.08);
        font-weight:900;
        font-size:12px;
        letter-spacing:.15px;
        color:rgba(255,255,255,.86);
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .vtMoodBtn.on{
        border-color:rgba(180,210,255,.34);
        background:rgba(80,140,220,.18);
      }

      .vtNavRow{
        margin-top:12px;
        display:flex;
        justify-content:space-between;
        gap:10px;
      }
      .vtNavRow .left{ display:flex; gap:10px; }
      .vtNavRow .right{ display:flex; gap:10px; }

      /* Symptoms modal overlay */
      .vtOverlay{
        position:fixed; inset:0;
        background:rgba(0,0,0,.55);
        display:none;
        align-items:center;
        justify-content:center;
        padding:16px;
        z-index:9999;
        pointer-events:none;
      }
      .vtOverlay.show{ display:flex; pointer-events:auto; }
      .vtModal{
        width:min(760px,100%);
        max-height:min(80vh,760px);
        overflow:hidden;
        border-radius:22px;
        background:
          linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.02)),
          rgba(10,16,30,.86);
        border:1px solid rgba(180,210,255,.22);
        box-shadow:0 18px 60px rgba(0,0,0,.55);
        display:flex;
        flex-direction:column;
      }
      .vtModalHead{
        padding:14px 14px 10px;
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:10px;
        border-bottom:1px solid rgba(255,255,255,.10);
      }
      .vtModalTitle{font-size:16px;font-weight:950;letter-spacing:.12px}
      .vtModalSub{font-size:12px;color:rgba(235,245,255,.60);margin-top:3px;line-height:1.25}
      .vtModalBody{padding:12px 14px;overflow:auto;display:flex;flex-direction:column;gap:12px}
      .vtModalFoot{padding:12px 14px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid rgba(255,255,255,.10)}

      .vtSecCard{
        border:1px solid rgba(255,255,255,.12);
        background:rgba(0,0,0,.12);
        border-radius:16px;
        box-shadow: inset 0 0 0 1px rgba(235,245,255,.08);
        padding:10px;
      }
      .vtSecName{font-weight:950;color:rgba(255,255,255,.88);margin-bottom:8px}
      .vtChkRow{
        display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
        padding:8px 8px;border-radius:12px;
      }
      .vtChkRow:hover{background:rgba(255,255,255,.04)}
      .vtChkLeft{min-width:0}
      .vtChkLabel{font-weight:850;color:rgba(255,255,255,.86);line-height:1.2}
      .vtChkHint{font-size:12px;color:rgba(235,245,255,.56);line-height:1.25;margin-top:3px}
      .vtChk{
        width:22px;height:22px;border-radius:6px;
        border:1px solid rgba(180,210,255,.28);
        background:rgba(10,16,30,.35);
        box-shadow: inset 0 0 0 1px rgba(235,245,255,.08);
        flex:0 0 auto;
      }
      .vtChk.on{background:rgba(80,140,220,.25);border-color:rgba(180,210,255,.40)}

      /* Summary card */
      .vtSummaryCard{
        border:1px solid rgba(180,210,255,.22);
        border-radius:18px;
        background:rgba(0,0,0,.10);
        box-shadow: inset 0 0 0 1px rgba(235,245,255,.08);
        padding:12px;
      }
      .vtSummaryTop{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:10px;
      }
      .vtSummaryTitle{
        font-weight:950;
        letter-spacing:.14px;
        color:rgba(255,255,255,.92);
      }
      .vtSummaryGrid{
        display:grid;
        grid-template-columns:repeat(3, minmax(0,1fr));
        gap:10px;
        margin-bottom:10px;
      }
      .vtSummaryStat{
        border:1px solid rgba(255,255,255,.10);
        border-radius:14px;
        padding:10px;
        background:rgba(0,0,0,.08);
      }
      .vtSummaryK{
        font-size:12px;
        color:rgba(235,245,255,.58);
        margin-bottom:4px;
      }
      .vtSummaryV{
        font-weight:950;
        font-size:18px;
        color:rgba(255,255,255,.90);
        letter-spacing:.2px;
      }
    `;
    document.head.appendChild(st);
  }

  // ---------- UI injection ----------
  function ensureWizardPresent(){
    if(!cardEl && !bodyEl) return;
    if(document.getElementById("vtAddWizard")) return;

    ensureWizardStyles();

    const host = cardEl || bodyEl;
    const wrap=document.createElement("div");
    wrap.id="vtAddWizard";
    wrap.className="addForm";
    wrap.innerHTML=`
      <div class="addGrid">

        <div class="vtWizHeader">
          <div>
            <div class="vtWizTitle" id="vtWizTitle">Add Reading</div>
            <div class="vtWizStep" id="vtWizStep">Step 1 of 4</div>
          </div>
          <button class="iconBtn vtWizClose" id="btnWizAbort" type="button" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- STEP 1: Vitals -->
        <div class="vtWizPane" id="wizStep1">
          <div class="vtTopGrid">
            <div class="vtBoxField">
              <div class="vtBoxLabel">SYS</div>
              <input id="inSys" class="addInput vtBoxInput" inputmode="numeric" placeholder="e.g., 132" />
            </div>
            <div class="vtBoxField">
              <div class="vtBoxLabel">DIA</div>
              <input id="inDia" class="addInput vtBoxInput" inputmode="numeric" placeholder="e.g., 84" />
            </div>
            <div class="vtBoxField">
              <div class="vtBoxLabel">HR</div>
              <input id="inHr" class="addInput vtBoxInput" inputmode="numeric" placeholder="e.g., 74" />
            </div>
            <div class="vtBoxField">
              <div class="vtBoxLabel">DISTRESS</div>
              <div class="vtDistressBox" id="distressBox">0</div>
            </div>
          </div>

          <div class="vtSectionHint">Enter BP and/or HR. Press Save to lock this step, even if you stop later.</div>

          <div class="vtNavRow">
            <div class="left"></div>
            <div class="right">
              <button class="pillBtn" id="btnStep1Save" type="button">Save & Next</button>
            </div>
          </div>
        </div>

        <!-- STEP 2: Symptoms + Distress -->
        <div class="vtWizPane" id="wizStep2">
          <div class="vtSection" id="secSymptoms">
            <div class="vtSectionHead">
              <div>
                <div class="vtSectionTitle">Symptoms</div>
                <div class="vtSectionHint">Select symptoms by clinical category. Multiple selections allowed.</div>
              </div>
              <button class="pillBtn" id="btnOpenSymptoms" data-action="openSymptoms" type="button">Select</button>
            </div>
            <div id="symptomSummary" class="vtSectionHint">No symptoms selected.</div>
          </div>

          <div class="vtTopGridSliderRow">
            <div></div><div></div><div></div>
            <div class="vtSliderHost">
              <input class="vtSlider" id="distressSlider" type="range" min="0" max="100" step="1" value="0" />
            </div>
          </div>
          <div class="vtDistressMeta" id="distressMeta">Final: 0  Computed: (n/a)</div>

          <div class="vtNavRow">
            <div class="left">
              <button class="pillBtn" id="btnStep2Back" type="button">Back</button>
            </div>
            <div class="right">
              <button class="pillBtn" id="btnStep2Save" type="button">Save & Next</button>
            </div>
          </div>
        </div>

        <!-- STEP 3: Mood -->
        <div class="vtWizPane" id="wizStep3">
          <div class="vtSection" id="secMood">
            <div class="vtSectionHead">
              <div>
                <div class="vtSectionTitle">Mood</div>
                <div class="vtSectionHint">Pick one (tap again to clear).</div>
              </div>
              <button class="pillBtn" id="btnClearMood" type="button">Clear</button>
            </div>
            <div class="vtMoodRow" id="moodRow"></div>
            <div class="vtSectionHint" id="moodSummary">No mood selected.</div>
          </div>

          <div class="vtNavRow">
            <div class="left">
              <button class="pillBtn" id="btnStep3Back" type="button">Back</button>
            </div>
            <div class="right">
              <button class="pillBtn" id="btnStep3Save" type="button">Save & Next</button>
            </div>
          </div>
        </div>

        <!-- STEP 4: Medications + Notes -->
        <div class="vtWizPane" id="wizStep4">
          <div class="vtSection" id="secMeds">
            <div class="vtSectionHead">
              <div>
                <div class="vtSectionTitle">Medications</div>
                <div class="vtSectionHint">Tap a prior med or add a new one (event marker).</div>
              </div>
            </div>

            <div class="vtRow" id="priorMedsRow"></div>

            <div class="vtRow" style="margin-top:10px">
              <input id="inMedName" class="addInput" placeholder="Medication name" list="dlMedNames" />
              <datalist id="dlMedNames"></datalist>
              <button class="medsAddBtn" id="btnAddMedToRecord" type="button">Add</button>
            </div>

            <div class="vtTagList" id="medsTagList" aria-label="Medication markers"></div>
          </div>

          <label class="addField addNotes" style="margin-top:10px">
            <div class="addLabel">Notes</div>
            <textarea id="inNotes" class="addTextArea" placeholder="Context, symptoms, meds, events..."></textarea>
          </label>

          <div class="vtNavRow">
            <div class="left">
              <button class="pillBtn" id="btnStep4Back" type="button">Back</button>
            </div>
            <div class="right">
              <button class="pillBtn" id="btnStep4Save" type="button">Save & Finish</button>
            </div>
          </div>
        </div>

        <!-- STEP 5: Summary -->
        <div class="vtWizPane" id="wizStep5">
          <div class="vtSummaryCard">
            <div class="vtSummaryTop">
              <div class="vtSummaryTitle">Saved</div>
              <button class="pillBtn" id="btnSummaryClose" type="button">Close</button>
            </div>

            <div class="vtSummaryGrid">
              <div class="vtSummaryStat">
                <div class="vtSummaryK">BP</div>
                <div class="vtSummaryV" id="sumBP">—</div>
              </div>
              <div class="vtSummaryStat">
                <div class="vtSummaryK">HR</div>
                <div class="vtSummaryV" id="sumHR">—</div>
              </div>
              <div class="vtSummaryStat">
                <div class="vtSummaryK">Distress</div>
                <div class="vtSummaryV" id="sumDistress">0</div>
              </div>
            </div>

            <div class="vtSectionHint" id="sumMood">Mood: —</div>
            <div class="vtSectionHint" id="sumSymptoms">Symptoms: —</div>
            <div class="vtSectionHint" id="sumMeds">Meds: —</div>
            <div class="vtSectionHint" id="sumNotes">Notes: —</div>
          </div>
        </div>

      </div>

      <!-- Symptoms popup -->
      <div class="vtOverlay" id="symptomOverlay" aria-hidden="true">
        <div class="vtModal" role="dialog" aria-modal="true" aria-label="Symptoms">
          <div class="vtModalHead">
            <div>
              <div class="vtModalTitle">Symptoms</div>
              <div class="vtModalSub">Select clinically relevant symptoms. They compute Distress (0–100).</div>
            </div>
            <button class="iconBtn" id="btnCloseSymptoms" type="button" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="vtModalBody" id="symptomBody"></div>

          <div class="vtModalFoot">
            <button class="pillBtn" id="btnSymptomsCancel" type="button">Cancel</button>
            <button class="pillBtn" id="btnSymptomsApply" type="button">Apply</button>
            <button class="pillBtn" id="btnSymptomsClear" type="button">Clear</button>
          </div>
        </div>
      </div>
    `;

    try{
      if(host === cardEl && cardEl.firstChild){
        cardEl.insertBefore(wrap, cardEl.firstChild);
      }else{
        host.appendChild(wrap);
      }
    }catch(_){
      host.appendChild(wrap);
    }

    // If legacy buttons exist, disable them visually (wizard owns flow)
    try{ if(btnSaveLegacy) btnSaveLegacy.style.display="none"; }catch(_){}
    try{ if(btnHomeLegacy) btnHomeLegacy.style.display="none"; }catch(_){}
  }

  // ---------- symptoms modal ----------
  let symptomTemp = null;
  let distressTouched = false;

  function bindSymptomsUI(){
    bindOnce(document.getElementById("btnOpenSymptoms"),"openSymptoms",function(e){ try{ e.preventDefault(); }catch(_){} openSymptoms(); });
    bindOnce(document.getElementById("btnCloseSymptoms"),"closeSymptoms",function(e){ try{ e.preventDefault(); }catch(_){} closeSymptoms(true); });
    bindOnce(document.getElementById("btnSymptomsCancel"),"cancelSymptoms",function(e){ try{ e.preventDefault(); }catch(_){} closeSymptoms(true); });
    bindOnce(document.getElementById("btnSymptomsApply"),"applySymptoms",function(e){ try{ e.preventDefault(); }catch(_){} applySymptoms(); });
    bindOnce(document.getElementById("btnSymptomsClear"),"clearSymptoms",function(e){ try{ e.preventDefault(); }catch(_){} clearSymptomsTemp(); });

    // Robust delegation for opening (in case DOM is re-rendered elsewhere)
    if(!document.documentElement.dataset.vtSymptomDelegation){
      document.documentElement.dataset.vtSymptomDelegation = "1";
      document.addEventListener("click", function(ev){
        const t = ev && ev.target ? ev.target : null;
        if(!t) return;
        const btn = t.closest ? t.closest('[data-action="openSymptoms"], #btnOpenSymptoms') : null;
        if(btn){
          try{ ev.preventDefault(); }catch(_){}
          openSymptoms();
        }
      }, true);
    }
  }

  function openSymptoms(){
    const overlay=document.getElementById("symptomOverlay");
    const body=document.getElementById("symptomBody");
    if(!overlay || !body) return;

    symptomTemp = new Set((UI.symptoms||[]).map(k=>String(k)));
    body.innerHTML="";

    for(const sec of SYMPTOMS){
      const card=document.createElement("div");
      card.className="vtSecCard";

      const title=document.createElement("div");
      title.className="vtSecName";
      title.textContent=sec.section;
      card.appendChild(title);

      sec.items.forEach(it=>{
        const row=document.createElement("div");
        row.className="vtChkRow";

        const left=document.createElement("div");
        left.className="vtChkLeft";

        const nm=document.createElement("div");
        nm.className="vtChkLabel";
        nm.textContent=it.label;

        const hint=document.createElement("div");
        hint.className="vtChkHint";
        hint.textContent=`Weight ${it.w}`;

        left.appendChild(nm);
        left.appendChild(hint);

        const chk=document.createElement("button");
        chk.type="button";
        chk.className="vtChk" + (symptomTemp.has(it.k) ? " on" : "");
        chk.setAttribute("aria-pressed", symptomTemp.has(it.k) ? "true":"false");

        function toggle(){
          if(symptomTemp.has(it.k)) symptomTemp.delete(it.k);
          else symptomTemp.add(it.k);
          chk.className="vtChk" + (symptomTemp.has(it.k) ? " on" : "");
          chk.setAttribute("aria-pressed", symptomTemp.has(it.k) ? "true":"false");
        }

        row.addEventListener("click",function(e){
          try{ e.preventDefault(); }catch(_){}
          toggle();
        });

        row.appendChild(left);
        row.appendChild(chk);
        card.appendChild(row);
      });

      body.appendChild(card);
    }

    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden","false");
  }

  function closeSymptoms(cancel){
    const overlay=document.getElementById("symptomOverlay");
    if(!overlay) return;
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden","true");
    if(cancel) symptomTemp = null;
  }

  function clearSymptomsTemp(){
    symptomTemp = new Set();
    const body=document.getElementById("symptomBody");
    if(!body) return;
    const buttons = body.querySelectorAll(".vtChk");
    for(const b of buttons){
      try{
        b.classList.remove("on");
        b.setAttribute("aria-pressed","false");
      }catch(_){}
    }
  }

  function applySymptoms(){
    if(!symptomTemp){
      closeSymptoms(true);
      return;
    }

    UI.symptoms = Array.from(symptomTemp);
    UI.symptoms.sort((a,b)=>String(a).localeCompare(String(b)));
    symptomTemp = null;

    const computed = computeDistressFromSymptoms(UI.symptoms);
    UI.distressComputed = computed;

    // If user has not manually adjusted slider, follow computed
    if(!distressTouched){
      UI.distressFinal = computed;
    }

    renderSymptomSummary();
    syncDistressUI();
    closeSymptoms(false);
  }

  function renderSymptomSummary(){
    const el=document.getElementById("symptomSummary");
    if(!el) return;
    const n=(UI.symptoms||[]).length;
    el.textContent = n ? `${n} symptom${n===1?"":"s"} selected.` : "No symptoms selected.";
  }

  // ---------- distress UI ----------
  function bindDistressUI(){
    const slider=document.getElementById("distressSlider");
    if(slider){
      slider.addEventListener("input",function(){
        distressTouched = true;
        const v=Number(slider.value);
        UI.distressFinal = clamp(v,0,100);
        syncDistressUI();
      });
    }
  }

  function syncDistressUI(){
    const box=document.getElementById("distressBox");
    const slider=document.getElementById("distressSlider");
    const meta=document.getElementById("distressMeta");

    const computed = (UI.distressComputed==null) ? null : Math.round(clamp(UI.distressComputed,0,100));
    const final    = (UI.distressFinal==null) ? 0 : Math.round(clamp(UI.distressFinal,0,100));

    UI.distressFinal = final;

    if(box){
      box.textContent = String(final);
      box.style.background = distressColor(final);
    }

    if(slider){
      slider.disabled = false;
      slider.value = String(final);
    }

    if(meta){
      const cTxt = (computed==null) ? "(n/a)" : String(computed);
      meta.textContent = `Final: ${final}  Computed: ${cTxt}`;
    }
  }

  // ---------- mood UI ----------
  function bindMoodUI(){
    bindOnce(document.getElementById("btnClearMood"),"clearMood",function(e){
      try{ e.preventDefault(); }catch(_){}
      UI.mood = null;
      renderMoodRow();
      renderMoodSummary();
    });
  }

  function renderMoodRow(){
    const host=document.getElementById("moodRow");
    if(!host) return;
    host.innerHTML="";

    MOODS.forEach(m=>{
      const b=document.createElement("button");
      b.type="button";
      b.className="vtMoodBtn" + (UI.mood===m.k ? " on" : "");
      b.textContent=m.short;
      b.title=m.label;
      b.setAttribute("aria-pressed", UI.mood===m.k ? "true":"false");
      b.addEventListener("click",function(e){
        try{ e.preventDefault(); }catch(_){}
        UI.mood = (UI.mood===m.k) ? null : m.k; // single-select toggle
        renderMoodRow();
        renderMoodSummary();
      });
      host.appendChild(b);
    });
  }

  function renderMoodSummary(){
    const el=document.getElementById("moodSummary");
    if(!el) return;
    el.textContent = UI.mood ? `Mood: ${moodLabel(UI.mood)}` : "No mood selected.";
  }

  // ---------- meds UI ----------
  function bindMedsUI(){
    const btnAdd=document.getElementById("btnAddMedToRecord");
    const inMed=document.getElementById("inMedName");

    bindOnce(btnAdd,"addMedToRecord",function(){
      const name=normStr(inMed && inMed.value);
      if(!name) return;

      const key=name.toLowerCase();
      const exists=(UI.meds||[]).some(m=>String(m.name).toLowerCase()===key);
      if(!exists){
        UI.meds.push({name, atTs: nowTs()});
        UI.meds = normalizeMeds(UI.meds);
        renderMedsTags();
      }

      addMedToSettings(name);
      refreshMedDatalist();
      renderPriorMedsRow(); // keep prior list current
      if(inMed) inMed.value="";
    });

    if(inMed){
      inMed.addEventListener("keydown",function(e){
        if(e && e.key==="Enter"){
          try{ e.preventDefault(); }catch(_){}
          try{ btnAdd && btnAdd.click(); }catch(_){}
        }
      });
    }

    document.addEventListener("vt:settingsChanged",function(){
      refreshMedDatalist();
      renderPriorMedsRow();
    });
  }

  function renderMedsTags(){
    const host=document.getElementById("medsTagList");
    if(!host) return;
    host.innerHTML="";

    const meds=UI.meds||[];
    if(!meds.length){
      const muted=document.createElement("div");
      muted.className="vtSectionHint";
      muted.textContent="No medication markers added.";
      host.appendChild(muted);
      return;
    }

    meds.forEach(m=>{
      const chip=document.createElement("div");
      chip.className="vtTag";
      chip.textContent=m.name;

      const x=document.createElement("button");
      x.type="button";
      x.setAttribute("aria-label","Remove");
      x.innerHTML="×";
      x.addEventListener("click",function(){
        const k=String(m.name).toLowerCase();
        UI.meds = (UI.meds||[]).filter(z=>String(z.name).toLowerCase()!==k);
        renderMedsTags();
      });

      chip.appendChild(x);
      host.appendChild(chip);
    });
  }

  function renderPriorMedsRow(){
    const host=document.getElementById("priorMedsRow");
    if(!host) return;
    host.innerHTML="";

    const list=getMedList();
    if(!list.length){
      const hint=document.createElement("div");
      hint.className="vtSectionHint";
      hint.textContent="No prior medications saved yet.";
      host.appendChild(hint);
      return;
    }

    // Show up to 10 pills (tap to add marker)
    const shown = list.slice(0,10);
    shown.forEach(name=>{
      const b=document.createElement("button");
      b.type="button";
      b.className="pillBtn";
      b.textContent=name;
      b.addEventListener("click",function(e){
        try{ e.preventDefault(); }catch(_){}
        const key=String(name).toLowerCase();
        const exists=(UI.meds||[]).some(m=>String(m.name).toLowerCase()===key);
        if(!exists){
          UI.meds.push({name, atTs: nowTs()});
          UI.meds = normalizeMeds(UI.meds);
          renderMedsTags();
        }
      });
      host.appendChild(b);
    });
  }

  // ---------- wizard navigation ----------
  function showStep(step){
    WIZ.step = clamp(step, 1, 5);

    const panes = [
      document.getElementById("wizStep1"),
      document.getElementById("wizStep2"),
      document.getElementById("wizStep3"),
      document.getElementById("wizStep4"),
      document.getElementById("wizStep5")
    ];

    panes.forEach((p,i)=>{
      if(!p) return;
      const s = i+1;
      if(s===WIZ.step) p.classList.add("show");
      else p.classList.remove("show");
    });

    const stepLbl=document.getElementById("vtWizStep");
    const title=document.getElementById("vtWizTitle");
    if(stepLbl){
      if(WIZ.step<=4) stepLbl.textContent = `Step ${WIZ.step} of 4`;
      else stepLbl.textContent = `Done`;
    }
    if(title){
      title.textContent = EDIT.active ? "Edit Reading" : "Add Reading";
    }
  }

  function goHome(){
    closeOverlays();

    try{
      if(window.VTPanels){
        if(typeof window.VTPanels.closeAdd==="function"){
          window.VTPanels.closeAdd(true);
          return;
        }
        if(typeof window.VTPanels.go==="function"){
          window.VTPanels.go("home",true);
          return;
        }
      }
    }catch(_){}
    try{
      document.getElementById("panelAdd")?.classList.remove("active");
      document.getElementById("panelHome")?.classList.add("active");
    }catch(_){}
  }

  function closeOverlays(){
    try{
      const overlay=document.getElementById("symptomOverlay");
      if(overlay){
        overlay.classList.remove("show");
        overlay.setAttribute("aria-hidden","true");
      }
    }catch(_){}
  }

  // ---------- save semantics (per-step) ----------
  async function saveStep(step){
    if(saving) return false;

    if(!ensureStoreReady()){
      safeAlert("Storage is not ready (VTStore).");
      return false;
    }

    saving=true;
    await initStoreIfNeeded();

    try{
      const rec = buildRecordFromUI();

      // Step 1 validation for vitals
      if(step===1){
        if(!validateVitalsStep(rec)){
          saving=false;
          return false;
        }
      }

      // Ensure distress consistency at Step 2+ (always keep Final numeric)
      if(step>=2){
        const computed = (UI.distressComputed==null) ? null : Math.round(clamp(UI.distressComputed,0,100));
        const final    = (UI.distressFinal==null) ? 0 : Math.round(clamp(UI.distressFinal,0,100));
        rec.distressComputed = computed;
        rec.distressFinal = final;
        rec.distressDelta = (computed==null) ? null : (final - computed);
      }

      // Edit mode: always update
      if(EDIT.active){
        if(!hasUpdateAPI()){
          safeAlert("Edit is not available yet (VTStore has no update method).");
          saving=false;
          return false;
        }
        const key = EDIT.key || { ts: rec.ts };
        await updateRecord(key, rec);
        WIZ.lastSaved = normalizeRecord(rec);
        return true;
      }

      // New wizard entry
      if(WIZ.createdTs==null){
        WIZ.createdTs = rec.ts;
        WIZ.key = { ts: rec.ts };
      }

      // Step 1 creates the record if it does not exist yet
      if(WIZ.key && WIZ.key._created!==true){
        // Create record on first save only
        const created = await window.VTStore.add(rec);
        // Try to capture id if store returns it
        if(created && (typeof created==="number" || typeof created==="string")){
          WIZ.key = { id: created, ts: rec.ts };
        }else{
          // If no id, keep ts; attempt to resolve id if possible
          try{
            const all = await getAllRecords();
            const found = findByIdOrTs(all, { ts: rec.ts });
            const id = found && (found.id ?? found._id);
            if(id!=null) WIZ.key = { id, ts: rec.ts };
          }catch(_){}
        }
        WIZ.key._created = true;
        WIZ.lastSaved = normalizeRecord(rec);
        return true;
      }

      // Step 2-4 update existing record
      if(!hasUpdateAPI()){
        safeAlert("Partial-step saving requires VTStore update/put support. Record was created at Step 1, but later steps cannot update on this build.");
        saving=false;
        return false;
      }

      const key = (WIZ.key && (WIZ.key.id!=null || WIZ.key.ts!=null)) ? WIZ.key : { ts: rec.ts };
      await updateRecord(key, rec);

      WIZ.lastSaved = normalizeRecord(rec);
      return true;
    }catch(e){
      console.error(e);
      safeAlert("Save failed. Check console.");
      return false;
    }finally{
      saving=false;
    }
  }

  function refreshAfterSave(){
    try{ window.VTLog?.onShow?.(); }catch(_){}
    try{ window.VTChart?.onShow?.(); }catch(_){}
  }

  // ---------- summary ----------
  function renderSummary(){
    const r = WIZ.lastSaved ? WIZ.lastSaved : normalizeRecord(buildRecordFromUI());

    const bp = formatBP(r.sys, r.dia);
    const hr = fmtHr(r.hr);
    const distress = (r.distressFinal==null) ? 0 : Math.round(r.distressFinal);
    const mood = r.mood ? moodLabel(r.mood) : "—";
    const symCount = (r.symptoms||[]).length;
    const meds = (r.meds||[]).map(m=>m && m.name).filter(Boolean);

    const sumBP=document.getElementById("sumBP");
    const sumHR=document.getElementById("sumHR");
    const sumDist=document.getElementById("sumDistress");
    const sumMood=document.getElementById("sumMood");
    const sumSymptoms=document.getElementById("sumSymptoms");
    const sumMeds=document.getElementById("sumMeds");
    const sumNotes=document.getElementById("sumNotes");

    if(sumBP) sumBP.textContent = bp;
    if(sumHR) sumHR.textContent = hr;
    if(sumDist) sumDist.textContent = String(distress);

    if(sumMood) sumMood.textContent = `Mood: ${mood}`;
    if(sumSymptoms) sumSymptoms.textContent = `Symptoms: ${symCount ? (symCount + " selected") : "—"}`;
    if(sumMeds) sumMeds.textContent = `Meds: ${meds.length ? meds.join(", ") : "—"}`;

    const notes = String(r.notes||"").trim();
    const noteOut = notes ? (notes.length>120 ? notes.slice(0,120)+"…" : notes) : "—";
    if(sumNotes) sumNotes.textContent = `Notes: ${noteOut}`;

    // Color distress box to match
    const box=document.getElementById("distressBox");
    if(box){
      box.textContent = String(distress);
      box.style.background = distressColor(distress);
    }
  }

  // ---------- edit/open flows ----------
  function clearWizardUI(){
    // Keep UI state clean
    writeVal("inSys","");
    writeVal("inDia","");
    writeVal("inHr","");
    writeVal("inNotes","");
    writeVal("inMedName","");

    UI.symptoms = [];
    UI.distressComputed = null;
    UI.distressFinal = 0;
    distressTouched = false;

    UI.meds = [];
    UI.mood = null;

    renderMoodRow();
    renderMoodSummary();
    renderSymptomSummary();
    renderMedsTags();
    refreshMedDatalist();
    renderPriorMedsRow();
    syncDistressUI();

    // Reset wizard tracking
    WIZ.step = 1;
    WIZ.createdTs = null;
    WIZ.key = null;
    WIZ.lastSaved = null;
  }

  async function openAddNew(){
    ensureWizardPresent();
    EDIT.active=false;
    EDIT.key=null;
    EDIT.original=null;
    clearWizardUI();
    showStep(1);

    try{
      if(window.VTPanels && typeof window.VTPanels.openAdd==="function"){
        window.VTPanels.openAdd(true);
        return;
      }
      if(window.VTPanels && typeof window.VTPanels.go==="function"){
        window.VTPanels.go("add",true);
        return;
      }
    }catch(_){}
  }

  async function openEdit(payload){
    ensureWizardPresent();
    await initStoreIfNeeded();

    let key=null;
    let rec=null;

    try{
      if(payload && payload.record && typeof payload.record==="object"){
        rec = normalizeRecord(payload.record);
        key = { id: payload.id ?? payload.record.id ?? payload.record._id ?? null, ts: payload.ts ?? payload.record.ts ?? null };
      }else if(payload && typeof payload==="object" && ("ts" in payload || "sys" in payload || "dia" in payload || "hr" in payload || "notes" in payload)){
        rec = normalizeRecord(payload);
        key = { id: payload.id ?? payload._id ?? null, ts: payload.ts ?? null };
      }else if(payload && typeof payload==="object" && ("id" in payload || "ts" in payload)){
        key = { id: payload.id ?? null, ts: payload.ts ?? null };
      }

      if(!rec && key){
        const all = await getAllRecords();
        const found = findByIdOrTs(all, key);
        if(found) rec = normalizeRecord(found);
      }

      if(!rec){
        safeAlert("Edit failed: could not locate that record.");
        return;
      }

      // Enter edit mode
      EDIT.active=true;
      EDIT.key=key || { ts: rec.ts };
      EDIT.original=rec;

      // Populate fields and UI state
      writeVal("inSys", rec.sys);
      writeVal("inDia", rec.dia);
      writeVal("inHr",  rec.hr);
      writeVal("inNotes", rec.notes||"");

      UI.symptoms = uniqLower(rec.symptoms||[]);
      UI.distressComputed = (rec.distressComputed==null) ? computeDistressFromSymptoms(UI.symptoms) : clamp(rec.distressComputed,0,100);
      UI.distressFinal    = (rec.distressFinal==null) ? (UI.distressComputed==null ? 0 : UI.distressComputed) : clamp(rec.distressFinal,0,100);
      distressTouched = (rec.distressDelta!=null);

      UI.meds = normalizeMeds(rec.meds||[]);
      UI.mood = (rec.mood && typeof rec.mood==="string") ? rec.mood : null;

      WIZ.lastSaved = normalizeRecord(buildRecordFromUI());

      renderMoodRow();
      renderMoodSummary();
      renderSymptomSummary();
      renderMedsTags();
      refreshMedDatalist();
      renderPriorMedsRow();
      syncDistressUI();

      // Open Add panel and show Step 1 by default
      try{
        if(window.VTPanels && typeof window.VTPanels.openAdd==="function"){
          window.VTPanels.openAdd(true);
        }else if(window.VTPanels && typeof window.VTPanels.go==="function"){
          window.VTPanels.go("add",true);
        }
      }catch(_){}

      showStep(1);
    }catch(_){
      safeAlert("Edit failed.");
    }
  }

  // ---------- bindings ----------
  function bindWizardNav(){
    bindOnce(document.getElementById("btnWizAbort"),"wizAbort",function(e){
      try{ e.preventDefault(); }catch(_){}
      goHome(); // partial data already saved per-step
    });

    // Step 1
    bindOnce(document.getElementById("btnStep1Save"),"step1Save",async function(e){
      try{ e.preventDefault(); }catch(_){}
      const ok = await saveStep(1);
      if(!ok) return;
      refreshAfterSave();
      showStep(2);
    });

    // Step 2
    bindOnce(document.getElementById("btnStep2Back"),"step2Back",function(e){
      try{ e.preventDefault(); }catch(_){}
      showStep(1);
    });
    bindOnce(document.getElementById("btnStep2Save"),"step2Save",async function(e){
      try{ e.preventDefault(); }catch(_){}
      const ok = await saveStep(2);
      if(!ok) return;
      refreshAfterSave();
      showStep(3);
    });

    // Step 3
    bindOnce(document.getElementById("btnStep3Back"),"step3Back",function(e){
      try{ e.preventDefault(); }catch(_){}
      showStep(2);
    });
    bindOnce(document.getElementById("btnStep3Save"),"step3Save",async function(e){
      try{ e.preventDefault(); }catch(_){}
      const ok = await saveStep(3);
      if(!ok) return;
      refreshAfterSave();
      showStep(4);
    });

    // Step 4
    bindOnce(document.getElementById("btnStep4Back"),"step4Back",function(e){
      try{ e.preventDefault(); }catch(_){}
      showStep(3);
    });
    bindOnce(document.getElementById("btnStep4Save"),"step4Save",async function(e){
      try{ e.preventDefault(); }catch(_){}
      const ok = await saveStep(4);
      if(!ok) return;
      refreshAfterSave();
      renderSummary();
      showStep(5);
    });

    // Summary close
    bindOnce(document.getElementById("btnSummaryClose"),"summaryClose",function(e){
      try{ e.preventDefault(); }catch(_){}
      // After final, close back to parent of Add panel
      goHome();
    });
  }

  function bind(){
    ensureWizardPresent();

    bindSymptomsUI();
    bindDistressUI();
    bindMoodUI();
    bindMedsUI();
    refreshMedDatalist();
    renderPriorMedsRow();

    renderMoodRow();
    renderMoodSummary();
    renderSymptomSummary();
    renderMedsTags();
    syncDistressUI();

    bindWizardNav();
    showStep(1);

    // Listen for edit requests
    document.addEventListener("vt:editRequested",function(e){
      try{
        if(!e || !e.detail) return;
        openEdit(e.detail);
      }catch(_){}
    });
  }

  // Public API
  window.VTAdd = Object.freeze({
    openNew: openAddNew,
    openEdit: openEdit
  });

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",bind,{passive:true});
  }else{
    bind();
  }

})();

/*
Vitals Tracker — EOF (Wizard Add Pass Footer)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/add.js
App Version Authority: js/version.js
ImplementationId: WIZ-20260121-001
FileEditId: 8
Edited: 2026-01-21

Current file: js/add.js, File 1 of 1


Next file to fetch: EOL, EOP, File 0 of 0



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Current file (pasted/edited in this step): js/add.js
Acceptance checks
- Wizard flow exists: Step 1 Vitals -> Step 2 Symptoms+Distress -> Step 3 Mood -> Step 4 Meds+Notes -> Summary.
- Save occurs at each step:
  - Step 1 creates record.
  - Steps 2–4 update existing record (requires VTStore update/put/set/upsert).
- Symptoms are category-based, multi-select, compute distress automatically; distress is visible and adjustable.
- Mood is single-select toggle (tap to select; tap again to clear).
- Medications module shows prior meds as quick taps and allows new med entry; record stores markers.
- Summary shows saved card and Close returns to parent of Add panel.

Test and regroup for next pass.
*/
