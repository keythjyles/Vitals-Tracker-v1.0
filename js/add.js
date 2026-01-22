/* 
Vitals Tracker — BOF (Add Pass Header)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/add.js
App Version Authority: js/version.js
ImplementationId: ADD-20260121-005
FileEditId: 6
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
- Fix Symptoms Select button: popup must open reliably (robust binding + pointer-events fixes).
- Fix Distress slider: must work immediately (default Final=0, slider enabled).
- Fix top-row clipping: enforce box-sizing and overflow constraints.
- Mood: single-select checkbox-style (one choice max), default none; all 5 options forced into one row.
- No log work. No chart work.
------------------------------------------------------------ 
*/

(function () {
  "use strict";

  const btnSave = document.getElementById("btnSaveReading");
  const btnHome = document.getElementById("btnHomeFromAdd");
  const bodyEl  = document.getElementById("addBody");
  const cardEl  = document.getElementById("addCard");

  let saving = false;

  const EDIT = { active:false, key:null, original:null };

  const UI = {
    symptoms: [],
    distressComputed: null,   // 0..100 (computed)
    distressFinal: 0,         // 0..100 (user) — default 0 so slider works
    meds: [],                 // [{name, atTs}]
    mood: null                // one of MOODS.k (default none)
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

  function defaultRecord(){
    const computed = (UI.distressComputed==null) ? null : Math.round(clamp(UI.distressComputed,0,100));
    const final    = (UI.distressFinal==null) ? null : Math.round(clamp(UI.distressFinal,0,100));
    const delta    = (computed==null || final==null) ? null : (final - computed);

    return {
      ts: nowTs(),
      sys:null, dia:null, hr:null,
      notes:"",
      symptoms: (UI.symptoms||[]).slice(),
      distressComputed: computed,
      distressFinal: final,
      distressDelta: delta,
      mood: UI.mood || null,
      meds: (UI.meds||[]).slice()
    };
  }

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

  // ---------- DOM read/write ----------
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

  // ---------- styles + injection ----------
  function ensureAddPassStyles(){
    if(document.getElementById("vtAddPassStyles")) return;
    const st=document.createElement("style");
    st.id="vtAddPassStyles";
    st.textContent=`
      /* global box sizing for injected UI to stop clipping */
      #vtAddForm, #vtAddForm * { box-sizing:border-box; }

      /* Top 4-box row (SYS/DIA/HR/Distress) */
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
        margin:0 0 4px 0; /* tight to box */
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

      /* Distress box: prominent, transparent/label-like */
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

      /* Slider under 4th column only */
      .vtTopGridSliderRow{
        display:grid;
        grid-template-columns:repeat(4, minmax(0,1fr));
        gap:12px;
        width:100%;
        margin:8px 0 2px;
      }
      .vtTopGridSliderRow .vtSliderHost{grid-column:4 / 5}
      .vtSlider{
        width:100%;
        height:28px;
      }
      .vtDistressMeta{
        font-size:12px;
        color:rgba(235,245,255,.58);
        line-height:1.25;
        margin-top:6px;
      }

      /* Sections */
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

      /* Mood: force 5 options into a single row */
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

      /* overlay modal */
      .vtOverlay{
        position:fixed; inset:0;
        background:rgba(0,0,0,.55);
        display:none;
        align-items:center;
        justify-content:center;
        padding:16px;
        z-index:9999;
        pointer-events:none; /* critical: prevent hidden overlay from blocking clicks */
      }
      .vtOverlay.show{
        display:flex;
        pointer-events:auto; /* allow interaction when visible */
      }
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
    `;
    document.head.appendChild(st);
  }

  function ensureFormPresent(){
    if(!cardEl && !bodyEl) return;
    if(document.getElementById("vtAddForm")) return;

    ensureAddPassStyles();

    const host = cardEl || bodyEl;

    const wrap=document.createElement("div");
    wrap.id="vtAddForm";
    wrap.className="addForm";
    wrap.innerHTML=`
      <div class="addGrid">

        <!-- Top 4 boxes -->
        <div class="vtTopGrid" id="vtTopGrid">
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

        <!-- Slider directly under 4th box -->
        <div class="vtTopGridSliderRow">
          <div></div><div></div><div></div>
          <div class="vtSliderHost">
            <input class="vtSlider" id="distressSlider" type="range" min="0" max="100" step="1" value="0" />
          </div>
        </div>
        <div class="vtDistressMeta" id="distressMeta">Final: 0  Computed: (n/a)</div>

        <div class="vtSection" id="secSymptoms">
          <div class="vtSectionHead">
            <div>
              <div class="vtSectionTitle">Symptoms</div>
              <div class="vtSectionHint">Tap to select symptoms (popup). Symptoms contribute to computed distress score.</div>
            </div>
            <button class="pillBtn" id="btnOpenSymptoms" data-action="openSymptoms" type="button">Select</button>
          </div>
          <div id="symptomSummary" class="vtSectionHint">No symptoms selected.</div>
        </div>

        <div class="vtSection" id="secMood">
          <div class="vtSectionHead">
            <div>
              <div class="vtSectionTitle">Mood</div>
              <div class="vtSectionHint">5-point clinical snapshot for chart overlay.</div>
            </div>
            <button class="pillBtn" id="btnClearMood" type="button">Clear</button>
          </div>
          <div class="vtMoodRow" id="moodRow"></div>
          <div class="vtSectionHint" id="moodSummary">No mood selected.</div>
        </div>

        <div class="vtSection" id="secMeds">
          <div class="vtSectionHead">
            <div>
              <div class="vtSectionTitle">Medications</div>
              <div class="vtSectionHint">Add medication event markers. Dosage stays in Notes.</div>
            </div>
          </div>
          <div class="vtRow">
            <input id="inMedName" class="addInput" placeholder="Medication name" list="dlMedNames" />
            <datalist id="dlMedNames"></datalist>
            <button class="medsAddBtn" id="btnAddMedToRecord" type="button">Add</button>
          </div>
          <div class="vtTagList" id="medsTagList" aria-label="Medication markers"></div>
        </div>

        <label class="addField addNotes">
          <div class="addLabel">Notes</div>
          <textarea id="inNotes" class="addTextArea" placeholder="Context, symptoms, meds, events..."></textarea>
        </label>

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

    bindSymptomsUI();
    bindDistressUI();
    bindMoodUI();
    bindMedsUI();
    refreshMedDatalist();

    renderMoodRow();
    renderMoodSummary();
    renderSymptomSummary();
    renderMedsTags();
    syncDistressUI();
  }

  // ---------- meds helpers ----------
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

  // ---------- symptoms popup ----------
  let symptomTemp = null;
  let distressTouched = false;

  function bindSymptomsUI(){
    // direct binds (if present)
    bindOnce(document.getElementById("btnOpenSymptoms"),"openSymptoms",function(e){ try{ e.preventDefault(); }catch(_){} openSymptoms(); });
    bindOnce(document.getElementById("btnCloseSymptoms"),"closeSymptoms",function(e){ try{ e.preventDefault(); }catch(_){} closeSymptoms(true); });
    bindOnce(document.getElementById("btnSymptomsCancel"),"cancelSymptoms",function(e){ try{ e.preventDefault(); }catch(_){} closeSymptoms(true); });
    bindOnce(document.getElementById("btnSymptomsApply"),"applySymptoms",function(e){ try{ e.preventDefault(); }catch(_){} applySymptoms(); });
    bindOnce(document.getElementById("btnSymptomsClear"),"clearSymptoms",function(e){ try{ e.preventDefault(); }catch(_){} clearSymptomsTemp(); });

    // robust fallback: event delegation (covers cases where DOM is re-rendered)
    if(!document.documentElement.dataset.vtSymptomDelegation){
      document.documentElement.dataset.vtSymptomDelegation = "1";
      document.addEventListener("click", function(ev){
        const t = ev && ev.target ? ev.target : null;
        if(!t) return;

        const btn = t.closest ? t.closest('[data-action="openSymptoms"], #btnOpenSymptoms') : null;
        if(btn){
          try{ ev.preventDefault(); }catch(_){}
          openSymptoms();
          return;
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
    if(!symptomTemp) symptomTemp = new Set();
    symptomTemp.clear();
    openSymptoms();
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

    // If user has not manually adjusted the slider, follow computed.
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
      slider.style.opacity = "";
      slider.value = String(final);
    }

    if(meta){
      const cTxt = (computed==null) ? "(n/a)" : String(computed);
      meta.textContent = `Final: ${final}  Computed: ${cTxt}`;
    }
  }

  // ---------- Mood UI ----------
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
        // single-select checkbox behavior: clicking selected clears; otherwise selects only this.
        UI.mood = (UI.mood===m.k) ? null : m.k;
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

  // ---------- navigation / edit ----------
  function setSaveEnabled(on){
    if(!btnSave) return;
    try{
      btnSave.disabled=!on;
      btnSave.style.opacity = on ? "" : "0.65";
    }catch(_){}
  }

  function setSaveLabelEditing(isEditing){
    if(!btnSave) return;
    try{ btnSave.textContent = isEditing ? "Save Changes" : "Save"; }catch(_){}
  }

  function setHeaderEditing(isEditing){
    try{
      const title=document.querySelector("#panelAdd .screenTitle");
      if(!title) return;
      title.textContent = isEditing ? "Edit Reading" : "Add Reading";
    }catch(_){}
  }

  function clearInputs(){
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
    syncDistressUI();
  }

  function enterEditMode(key, record){
    EDIT.active=true;
    EDIT.key=key||null;
    EDIT.original=record||null;

    setSaveLabelEditing(true);
    setHeaderEditing(true);

    if(record){
      writeVal("inSys", record.sys);
      writeVal("inDia", record.dia);
      writeVal("inHr",  record.hr);
      writeVal("inNotes", record.notes||"");

      UI.symptoms = uniqLower(record.symptoms||[]);
      UI.distressComputed = (record.distressComputed==null) ? computeDistressFromSymptoms(UI.symptoms) : clamp(record.distressComputed,0,100);
      UI.distressFinal    = (record.distressFinal==null) ? (UI.distressComputed==null ? 0 : UI.distressComputed) : clamp(record.distressFinal,0,100);
      distressTouched = (record.distressDelta!=null);

      UI.meds = normalizeMeds(record.meds||[]);
      UI.mood = (record.mood && typeof record.mood==="string") ? record.mood : null;

      renderMoodRow();
      renderMoodSummary();
      renderSymptomSummary();
      renderMedsTags();
      syncDistressUI();
      refreshMedDatalist();
    }
  }

  function exitEditMode(){
    EDIT.active=false;
    EDIT.key=null;
    EDIT.original=null;
    setSaveLabelEditing(false);
    setHeaderEditing(false);
  }

  async function openAddNew(){
    ensureFormPresent();
    exitEditMode();
    clearInputs();
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
    ensureFormPresent();
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

      try{
        if(window.VTPanels && typeof window.VTPanels.openAdd==="function"){
          window.VTPanels.openAdd(true);
        }else if(window.VTPanels && typeof window.VTPanels.go==="function"){
          window.VTPanels.go("add",true);
        }
      }catch(_){}

      enterEditMode(key, rec);
    }catch(_){
      safeAlert("Edit failed.");
    }
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

  // ---------- save ----------
  async function save(){
    if(saving) return;

    if(!ensureStoreReady()){
      safeAlert("Storage is not ready (VTStore).");
      return;
    }

    saving=true;
    setSaveEnabled(false);

    await initStoreIfNeeded();

    const rec=defaultRecord();
    rec.sys = readNumber("inSys");
    rec.dia = readNumber("inDia");
    rec.hr  = readNumber("inHr");
    rec.notes = readText("inNotes");

    const hasSys = rec.sys!=null;
    const hasDia = rec.dia!=null;
    if((hasSys && !hasDia) || (!hasSys && hasDia)){
      safeAlert("If entering BP, please enter BOTH systolic and diastolic.");
      saving=false;
      setSaveEnabled(true);
      return;
    }

    try{
      if(EDIT.active){
        if(!hasUpdateAPI()){
          safeAlert("Edit is not available yet (VTStore has no update method).");
          return;
        }

        const tsToKeep =
          (EDIT.original && typeof EDIT.original.ts==="number") ? EDIT.original.ts :
          (EDIT.key && typeof EDIT.key.ts==="number") ? EDIT.key.ts :
          null;

        if(tsToKeep!=null) rec.ts = tsToKeep;

        const key = EDIT.key || { ts: rec.ts };
        await updateRecord(key, rec);

        try{ window.VTLog?.onShow?.(); }catch(_){}
        try{ window.VTChart?.onShow?.(); }catch(_){}

        safeAlert("Saved.");
        exitEditMode();
        clearInputs();
        return;
      }

      await window.VTStore.add(rec);

      try{ window.VTLog?.onShow?.(); }catch(_){}
      try{ window.VTChart?.onShow?.(); }catch(_){}

      safeAlert("Saved.");
      clearInputs();
    }catch(e){
      console.error(e);
      safeAlert("Save failed. Check console.");
    }finally{
      saving=false;
      setSaveEnabled(true);
    }
  }

  // ---------- bind ----------
  function bind(){
    ensureFormPresent();

    bindOnce(btnSave,"saveReading",function(e){
      try{ e.preventDefault(); }catch(_){}
      save();
    });

    bindOnce(btnHome,"homeFromAdd",function(e){
      try{ e.preventDefault(); }catch(_){}
      goHome();
    });

    document.addEventListener("vt:editRequested",function(e){
      try{
        if(!e || !e.detail) return;
        openEdit(e.detail);
      }catch(_){}
    });

    setSaveEnabled(true);
    setSaveLabelEditing(false);
    setHeaderEditing(false);
  }

  window.VTAdd = Object.freeze({
    openNew: openAddNew,
    openEdit: openEdit
  });

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",bind,{passive:true});
  }else bind();

})();

/* 
Vitals Tracker — EOF (Add Pass Footer)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/add.js
App Version Authority: js/version.js
ImplementationId: ADD-20260121-005
FileEditId: 6
Edited: 2026-01-21

Current file: js/add.js, File 1 of 1


Next file to fetch: EOL, EOP, File 0 of 0



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Current file (pasted/edited in this step): js/add.js
Acceptance checks
- Symptoms Select reliably opens popup (direct bind + delegated fallback; overlay pointer-events fixed).
- Distress slider works immediately (Final defaults to 0; slider never disabled).
- Top row no longer clips (box-sizing enforced; overflow constraints applied).
- Mood is single-select checkbox-style (one max), default none, forced into one row.

Test and regroup for next pass.
*/
