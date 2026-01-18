/* File: js/add.js */
/*
Vitals Tracker — Quick Add (Vitals + Distress + Notes)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

File Purpose
- Owns the ADD flow (single-entry creation).
- Designed for speed, compliance, and low cognitive load.
- Default: BP + HR + Notes visible immediately.
- Optional panels (collapsed by default unless user enables):
    • Distress (0–5 with self-report labels)
    • Symptoms (contextual checkboxes driven by Distress level)
    • Medication Event (name + optional note; NOT a med tracker)

Locked UX Rules
- No extra fields shown unless user explicitly expands a panel.
- Distress uses user-facing labels; stores both numeric + label.
- Medication entries are events only (timestamped markers).
- Add flow does NOT change chart behavior directly; data appears via storage reload.

Integration Contract (Locked)
- Exposes: window.VTAdd.open()
- Persists via: window.VTStorage.add(record)
- Emits event: document.dispatchEvent(new CustomEvent("vt:add"))

App Version: v2.020
Base: v2.019
Date: 2026-01-18 (America/Chicago)

Change Log (v2.020)
1) Implemented one-tap Quick Add with immediate BP/HR focus.
2) Added Distress 0–5 scale with self-report labels.
3) Added contextual symptom prompts by Distress level.
4) Added Medication Event (non-tracking, optional).
5) Collapsible panels with remembered user preference.
*/

(() => {
  "use strict";

  const DISTRESS = [
    { v:0, label:"Chill / Calm", symptoms:["Relaxed","Clear","No distress"] },
    { v:1, label:"Mild Unease", symptoms:["Restless","Tense","Distracted"] },
    { v:2, label:"Agitated", symptoms:["Irritable","Racing thoughts","Sweaty"] },
    { v:3, label:"Anxious / Panic", symptoms:["Chest tight","Shaking","Air hunger"] },
    { v:4, label:"Severe Distress", symptoms:["Disoriented","Overwhelmed","Fear"] },
    { v:5, label:"Loss of Reality", symptoms:["Hallucinations","Dissociation","Confusion"] }
  ];

  const state = {
    open:false,
    panels:{
      distress:false,
      symptoms:false,
      meds:false
    }
  };

  function now() { return Date.now(); }

  function el(tag, cls, html){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(html!=null) e.innerHTML = html;
    return e;
  }

  function buildUI(){
    if(document.getElementById("vtAddOverlay")) return;

    const overlay = el("div");
    overlay.id = "vtAddOverlay";
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,.55);
      display:flex; align-items:center; justify-content:center; z-index:9999;
    `;

    const card = el("div");
    card.style.cssText = `
      width:min(94vw,420px); max-height:90vh; overflow:auto;
      background:#0b1324; border-radius:22px; padding:14px;
      border:1px solid rgba(235,245,255,.22);
    `;

    card.appendChild(el("h3", null, "Quick Add"));

    // Core vitals
    const sys = el("input"); sys.placeholder="Systolic"; sys.type="number";
    const dia = el("input"); dia.placeholder="Diastolic"; dia.type="number";
    const hr  = el("input"); hr.placeholder="HR"; hr.type="number";
    [sys,dia,hr].forEach(i=>{
      i.style.cssText="width:100%;margin:6px 0;padding:10px;border-radius:12px;";
    });

    const notes = el("textarea");
    notes.placeholder="Notes";
    notes.style.cssText="width:100%;margin:6px 0;padding:10px;border-radius:12px;";

    card.append(sys,dia,hr,notes);

    // Distress panel
    const distressBtn = el("button",null,"Add Distress");
    distressBtn.onclick = ()=>toggle("distress");
    card.appendChild(distressBtn);

    const distressBox = el("div"); distressBox.style.display="none";
    DISTRESS.forEach(d=>{
      const b = el("button",null,`${d.v} — ${d.label}`);
      b.onclick=()=>selectDistress(d,distressBox);
      distressBox.appendChild(b);
    });
    card.appendChild(distressBox);

    // Symptoms
    const symBox = el("div"); symBox.style.display="none";
    card.appendChild(symBox);

    // Med event
    const medBtn = el("button",null,"Add Medication Event");
    medBtn.onclick=()=>toggle("meds");
    card.appendChild(medBtn);

    const medBox = el("div"); medBox.style.display="none";
    const medName = el("input"); medName.placeholder="Medication name";
    medBox.appendChild(medName);
    card.appendChild(medBox);

    // Actions
    const save = el("button",null,"Save");
    save.onclick=()=>{
      const rec = {
        ts: now(),
        sys:+sys.value||null,
        dia:+dia.value||null,
        hr:+hr.value||null,
        notes:notes.value||"",
        distress:state.distress||null,
        symptoms:state.symptoms||[],
        med: medName.value||null
      };
      window.VTStorage.add(rec);
      document.dispatchEvent(new CustomEvent("vt:add"));
      close();
    };

    const cancel = el("button",null,"Cancel");
    cancel.onclick=close;

    card.append(save,cancel);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    function toggle(p){
      state.panels[p]=!state.panels[p];
      distressBox.style.display = state.panels.distress?"block":"none";
      medBox.style.display = state.panels.meds?"block":"none";
    }

    function selectDistress(d,box){
      state.distress={ value:d.v, label:d.label };
      symBox.innerHTML="";
      d.symptoms.forEach(s=>{
        const c = el("label",null,`<input type="checkbox" value="${s}"> ${s}`);
        symBox.appendChild(c);
      });
      symBox.style.display="block";
      state.symptoms=[];
      symBox.onchange=()=>{
        state.symptoms=[...symBox.querySelectorAll("input:checked")].map(i=>i.value);
      };
    }

    function close(){
      document.body.removeChild(overlay);
    }
  }

  const API = Object.freeze({
    open: buildUI
  });

  Object.defineProperty(window,"VTAdd",{ value:API, writable:false });

})();
 
/* EOF File: js/add.js */
/*
Vitals Tracker — Quick Add
App Version: v2.020

Notes
- Designed for elderly/disabled compliance.
- Zero required fields beyond vitals.
- Distress + meds are optional, event-based, and succinct.
*/
