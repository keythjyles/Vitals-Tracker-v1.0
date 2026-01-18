/* File: js/log.js */
/*
Vitals Tracker — Log Panel (Read-Only)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
App Version: v2.021
Base: v2.020
Date: 2026-01-18

Change Log (v2.021)
1) Paging behavior: "Load next" appends records BELOW the button, then the button moves down (stays at the boundary).
   - Result: No jump to top. No disorienting reflow. Scrolling up reveals prior records; scrolling down continues.
2) Focus/anchor behavior: after append, we keep visual context anchored at the button boundary so the user is looking at the first newly added record.
3) Time display: Log cards always include time (hh:mm AM/PM) alongside date, as critical context for medical review.
4) Read-only constraint preserved: no edit/delete handlers are attached from this module.

Ownership / Boundaries
- This module only manages Log rendering + paging UX.
- Data retrieval is passed in (records array) by app.js.
- Filtering/search UI (if any) is managed elsewhere; this module renders what it's given.

Exports
- VTLog.init({ rootEl, getRecords, onNav }) -> void
- VTLog.render({ records, reset }) -> void
- VTLog.appendNextPage() -> void
*/

(function(){
  "use strict";

  const PAGE_SIZE = 25;

  function $(sel, root=document){ return root.querySelector(sel); }
  function el(tag, cls){
    const n = document.createElement(tag);
    if(cls) n.className = cls;
    return n;
  }

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

  function fmtDateTime(ms){
    if(!Number.isFinite(ms) || ms<=0) return "";
    const d = new Date(ms);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");

    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if(h === 0) h = 12;
    const mi = String(d.getMinutes()).padStart(2,"0");

    return `${yyyy}-${mm}-${dd} ${h}:${mi} ${ampm}`;
  }

  function buildCard(r){
    const bp = extractBP(r);
    const hr = extractHR(r);
    const ts = new Date(extractTs(r) || 0).getTime();
    const note = extractNote(r);

    const card = el("div","log-card");
    const top = el("div","log-top");

    const bpTxt = el("div","log-bp");
    bpTxt.textContent = (bp.sys!=null && bp.dia!=null) ? `${bp.sys}/${bp.dia}` :
                        (bp.sys!=null) ? `${bp.sys}/—` :
                        (bp.dia!=null) ? `—/${bp.dia}` : `—/—`;

    const hrPill = el("div","log-hr");
    hrPill.textContent = (hr!=null) ? `HR ${hr}` : `HR —`;

    top.appendChild(bpTxt);
    top.appendChild(hrPill);

    const meta = el("div","log-meta");
    const dt = fmtDateTime(ts);
    meta.textContent = dt ? dt : "—";

    const noteEl = el("div","log-note");
    if(note){
      noteEl.textContent = note;
      noteEl.classList.remove("muted");
    }else{
      noteEl.textContent = "";
      noteEl.classList.add("muted");
    }

    card.appendChild(top);
    card.appendChild(meta);
    if(note) card.appendChild(noteEl);

    return card;
  }

  function ensureStyles(){
    if(document.getElementById("vt-log-style")) return;
    const s = document.createElement("style");
    s.id = "vt-log-style";
    s.textContent = `
      .log-wrap{ display:flex; flex-direction:column; gap:10px; }
      .log-header{ opacity:.85; font-size:14px; padding:2px 2px 6px 2px; }
      .log-list{ display:flex; flex-direction:column; gap:10px; }
      .log-card{
        border:1px solid rgba(235,245,255,.12);
        background:rgba(0,0,0,.14);
        border-radius:18px;
        padding:14px 14px;
      }
      .log-top{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
      .log-bp{ font-size:28px; font-weight:700; letter-spacing:.2px; color:rgba(235,245,255,.92); }
      .log-hr{
        border:1px solid rgba(235,245,255,.14);
        background:rgba(0,0,0,.16);
        color:rgba(235,245,255,.78);
        padding:8px 12px;
        border-radius:999px;
        font-size:14px;
        font-weight:650;
        white-space:nowrap;
      }
      .log-meta{ margin-top:8px; font-size:14px; color:rgba(235,245,255,.58); }
      .log-note{ margin-top:8px; font-size:14px; color:rgba(235,245,255,.60); line-height:1.35; }
      .log-note.muted{ opacity:.55; }
      .log-btn-row{ display:flex; justify-content:center; }
      .log-btn{
        border:1px solid rgba(235,245,255,.16);
        background:rgba(0,0,0,.18);
        color:rgba(235,245,255,.72);
        padding:10px 14px;
        border-radius:14px;
        font-size:14px;
        font-weight:650;
        min-width:180px;
      }
    `;
    document.head.appendChild(s);
  }

  const VTLog = {
    _root: null,
    _listTop: null,
    _btnAnchor: null,   // anchor container (button boundary)
    _btn: null,
    _getRecords: null,
    _all: [],
    _shown: 0,

    init({ rootEl, getRecords }){
      ensureStyles();
      this._root = rootEl;
      this._getRecords = getRecords;

      // shell
      rootEl.innerHTML = "";
      const wrap = el("div","log-wrap");

      const header = el("div","log-header");
      header.id = "vtLogHeader";
      wrap.appendChild(header);

      const list = el("div","log-list");
      list.id = "vtLogList";
      wrap.appendChild(list);

      // anchor boundary: button stays between "older already shown" and "newer appended"
      const btnRow = el("div","log-btn-row");
      const btn = el("button","log-btn");
      btn.type = "button";
      btn.id = "vtLogNextBtn";
      btn.textContent = "Load next 25";
      btnRow.appendChild(btn);

      // important: we place the boundary button INSIDE the list so new records can be appended after it
      list.appendChild(btnRow);

      btn.addEventListener("click", ()=> this.appendNextPage());

      rootEl.appendChild(wrap);

      this._listTop = list;
      this._btnAnchor = btnRow;
      this._btn = btn;

      // initial render
      const recs = (typeof getRecords === "function") ? (getRecords() || []) : [];
      this.render({ records: recs, reset: true });
    },

    render({ records, reset }){
      this._all = Array.isArray(records) ? records.slice() : [];

      // newest-first expectation: if not sorted, we sort descending by ts
      this._all.sort((a,b)=>{
        const ta = new Date(extractTs(a) || 0).getTime() || 0;
        const tb = new Date(extractTs(b) || 0).getTime() || 0;
        return tb - ta;
      });

      if(reset){
        // clear everything except the button boundary row
        const list = this._listTop;
        const btnRow = this._btnAnchor;

        // remove all children
        while(list.firstChild) list.removeChild(list.firstChild);
        list.appendChild(btnRow);

        this._shown = 0;
      }

      // update header
      const header = $("#vtLogHeader", this._root);
      const total = this._all.length;
      const shown = Math.min(this._shown, total);
      header.textContent = `Showing ${shown} of ${total} records (read-only).`;

      // set button visible state
      if(this._shown >= total){
        this._btn.textContent = "No more records";
        this._btn.disabled = true;
      }else{
        this._btn.textContent = `Load next ${Math.min(PAGE_SIZE, total - this._shown)}`;
        this._btn.disabled = false;
      }
    },

    appendNextPage(){
      if(!this._all.length) return;
      if(this._shown >= this._all.length) return;

      const list = this._listTop;
      const btnRow = this._btnAnchor;

      // anchor: keep visual context so after appending you are at the first new record
      const rootScroller = this._root.closest(".panel") || this._root;
      const beforeTop = btnRow.getBoundingClientRect().top;

      const next = this._all.slice(this._shown, this._shown + PAGE_SIZE);
      this._shown += next.length;

      // IMPORTANT behavior:
      // - button row is the boundary
      // - we insert new cards AFTER the button row (so the button shifts DOWN out of view to bottom of new batch)
      // - prior records remain above; user can scroll up to see them
      const frag = document.createDocumentFragment();
      for(const r of next){
        frag.appendChild(buildCard(r));
      }

      if(btnRow.nextSibling){
        list.insertBefore(frag, btnRow.nextSibling);
      }else{
        list.appendChild(frag);
      }

      // update header/button states
      this.render({ records: this._all, reset: false });
      const header = $("#vtLogHeader", this._root);
      header.textContent = `Showing ${Math.min(this._shown, this._all.length)} of ${this._all.length} records (read-only).`;

      // keep the boundary positioned; then nudge so first new card is immediately visible
      // compute delta to maintain anchor, then scroll slightly to reveal first new record
      const afterTop = btnRow.getBoundingClientRect().top;
      const delta = afterTop - beforeTop;

      // adjust scroll (works for panel scroll containers)
      try{
        const scroller = rootScroller;
        if(scroller && typeof scroller.scrollTop === "number"){
          scroller.scrollTop += delta;
          // now move down a touch so the first new card is in view without manual scroll
          scroller.scrollTop += 6;
        }else{
          window.scrollBy(0, delta + 6);
        }
      }catch(_){}

      // move focus to first newly added record for screen readers / accessibility
      const firstNew = btnRow.nextElementSibling;
      if(firstNew && firstNew.classList && firstNew.classList.contains("log-card")){
        firstNew.setAttribute("tabindex","-1");
        firstNew.focus({ preventScroll:true });
      }
    }
  };

  window.VTLog = VTLog;

})();
