/* 
Vitals Tracker — BOF (Add Pass Header)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/add.js
App Version Authority: js/version.js
ImplementationId: ADD-20260121-002
FileEditId: 3
Edited: 2026-01-21

Current file: js/add.js, File 3 of 4


Next file to fetch: EOL, EOP, File 0 of 0



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Beacon Sticky Notes (persist until user changes)
- Every file edit is its own Pass with a unique ImplementationId.
- Each Pass includes an explicit file list; even one file is “1 of 1.”
- Replace prior non-sticky header/footer content each Pass; keep only explicitly-sticky Beacon rules.
------------------------------------------------------------

Scope (this Pass)
- Add UI: Sys/Dia/HR on one row, visually emphasized with thicker borders.
- No log work. No chart work.
------------------------------------------------------------ 
*/

(function () {
  "use strict";

  const btnSave = document.getElementById("btnSaveReading");
  const btnHome = document.getElementById("btnHomeFromAdd");
  const bodyEl = document.getElementById("addBody");
  const cardEl = document.getElementById("addCard");

  let saving = false;

  const EDIT = { active:false, key:null, original:null };

  const UI = {
    distress: null,
    distressTags: [],
    meds: []
  };

  function safeAlert(msg){ try{ alert(msg);}catch(_){} }
  function nowTs(){ return Date.now(); }

  function bindOnce(el,key,fn){
    if(!el) return;
    const k="vtBound_"+key;
    if(el.dataset && el.dataset[k]==="1") return;
    if(el.dataset) el.dataset[k]="1";
    el.addEventListener("click",fn,false);
  }

  function ensureStoreReady(){
    return !!(window.VTStore && typeof window.VTStore.add==="function");
  }

  async function initStoreIfNeeded(){
    try{ await window.VTStore?.init?.(); }catch(_){}
  }

  function defaultRecord(){
    return {
      ts: nowTs(),
      sys:null, dia:null, hr:null,
      notes:"",
      distress:null,
      distressTags:[],
      meds:[]
    };
  }

  function ensureAddPassStyles(){
    if(document.getElementById("vtAddPassStyles")) return;
    const st=document.createElement("style");
    st.id="vtAddPassStyles";
    st.textContent=`
      .vtVitalsRow{display:flex;gap:12px;width:100%;margin-bottom:12px}
      .vtVitalsField{flex:1 1 0;min-width:0}
      .vtVitalsField .addLabel{font-weight:700;font-size:15px;margin-bottom:6px}
      .vtVitalsField .addInput{
        width:100%;
        font-size:20px;
        text-align:center;
        border-width:2px!important;
        border-color:rgba(180,210,255,.6)!important;
        box-shadow:inset 0 0 0 1px rgba(235,245,255,.12)
      }
    `;
    document.head.appendChild(st);
  }

  function ensureFormPresent(){
    if(document.getElementById("addForm")) return;
    ensureAddPassStyles();

    const form=document.createElement("div");
    form.id="addForm";
    form.innerHTML=`
      <div class="vtVitalsRow">
        <label class="vtVitalsField">
          <div class="addLabel">SYS</div>
          <input id="inSys" class="addInput" inputmode="numeric" placeholder="132">
        </label>
        <label class="vtVitalsField">
          <div class="addLabel">DIA</div>
          <input id="inDia" class="addInput" inputmode="numeric" placeholder="84">
        </label>
        <label class="vtVitalsField">
          <div class="addLabel">HR</div>
          <input id="inHr" class="addInput" inputmode="numeric" placeholder="74">
        </label>
      </div>

      <label class="addField">
        <div class="addLabel">Notes</div>
        <textarea id="inNotes" class="addTextArea"></textarea>
      </label>
    `;
    cardEl?.insertBefore(form,cardEl.firstChild);
  }

  function readNumber(id){
    const v=document.getElementById(id)?.value?.trim();
    if(!v) return null;
    const n=Number(v);
    return Number.isFinite(n)?n:null;
  }

  function readText(id){
    return String(document.getElementById(id)?.value||"").trim();
  }

  async function save(){
    if(saving) return;
    if(!ensureStoreReady()){
      safeAlert("Storage not ready.");
      return;
    }

    saving=true;
    await initStoreIfNeeded();

    const rec=defaultRecord();
    rec.sys=readNumber("inSys");
    rec.dia=readNumber("inDia");
    rec.hr =readNumber("inHr");
    rec.notes=readText("inNotes");

    const hasSys=rec.sys!=null;
    const hasDia=rec.dia!=null;
    if(hasSys!==hasDia){
      safeAlert("Enter both systolic and diastolic.");
      saving=false;
      return;
    }

    try{
      await window.VTStore.add(rec);
      window.VTLog?.onShow?.();
      window.VTChart?.onShow?.();
      safeAlert("Saved.");
      document.getElementById("inSys").value="";
      document.getElementById("inDia").value="";
      document.getElementById("inHr").value="";
      document.getElementById("inNotes").value="";
    }catch(e){
      console.error(e);
      safeAlert("Save failed.");
    }finally{
      saving=false;
    }
  }

  function goHome(){
    try{ window.VTPanels?.go?.("home",true); }catch(_){}
  }

  function bind(){
    ensureFormPresent();
    bindOnce(btnSave,"save",e=>{e.preventDefault();save();});
    bindOnce(btnHome,"home",e=>{e.preventDefault();goHome();});
  }

  window.VTAdd={ openNew:()=>bind() };

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
ImplementationId: ADD-20260121-002
FileEditId: 3
Edited: 2026-01-21

Current file: js/add.js, File 3 of 4


Next file to fetch: EOL, EOP, File 0 of 0



Beacon: update FileEditId by incrementing by one each time you generate a new full file. Stay focused on just the current message not prior messages that you've already addressed. stay focused.

Current file (pasted/edited in this step): js/add.js
Acceptance checks
- Sys/Dia/HR are forced into a single row
- Thicker borders applied independent of app.css
- Add flow only; no log/chart edits

Test and regroup for next pass.
*/
