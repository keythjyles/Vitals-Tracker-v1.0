/* File: js/ui.js */
/*
Vitals Tracker — UI Utilities & Wiring
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023
Base: v2.021 (last known-good UI helpers)
Date: 2026-01-18

This file is: 8 of 10 (v2.023 phase)
Touched in this release: YES
Module owner: UI helpers only (DOM utilities, text, accessibility glue).

v2.023 LOCKED SCOPE
- Provide safe DOM helpers used across modules.
- Centralize small UI behaviors (text updates, empty states).
- NO business logic.
- NO chart math.
- NO storage access.
- Must fail silently if elements are missing.

Accessibility / mobile / low-vision rules:
- Never assume mouse.
- Never rely on color alone.
- Prefer textContent over innerHTML.
- All helpers defensive.

EOF footer REQUIRED.
*/

(function(){
  "use strict";

  const APP_VERSION = "v2.023";

  // ===== Safe helpers =====
  function $(id){
    try{ return document.getElementById(id); }catch(_){ return null; }
  }

  function setText(id, text){
    const el = $(id);
    if(!el) return;
    try{ el.textContent = text; }catch(_){}
  }

  function show(el){
    if(!el) return;
    el.style.display = "";
  }

  function hide(el){
    if(!el) return;
    el.style.display = "none";
  }

  function isVisible(el){
    if(!el) return false;
    return el.offsetParent !== null;
  }

  // ===== Version stamps =====
  function stampVersion(){
    setText("homeVersion", APP_VERSION);
    const boot = $("bootText");
    if(boot && !boot.textContent.includes(APP_VERSION)){
      boot.textContent = `BOOT OK ${APP_VERSION}`;
    }
  }

  // ===== Empty-state helpers =====
  function setEmptyNote(id, msg){
    const el = $(id);
    if(!el) return;
    el.textContent = msg;
  }

  // ===== Button safety =====
  function bindClick(id, fn){
    const el = $(id);
    if(!el) return;
    el.addEventListener("click", (e)=>{
      try{
        e.preventDefault();
        fn(e);
      }catch(_){}
    });
  }

  // ===== Expose minimal API =====
  window.VTUI = {
    version: APP_VERSION,
    $,
    setText,
    show,
    hide,
    isVisible,
    setEmptyNote,
    bindClick,
    stampVersion
  };

  // ===== Init =====
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", stampVersion, { once:true });
  } else {
    stampVersion();
  }

})();

/* EOF: js/ui.js */
/*
App Version: v2.023
Base: v2.021
Touched in this release: YES

Delivered files so far (v2.023 phase):
1) index.html
6) js/add.js
7) js/app.js
8) js/ui.js

Next file to deliver (on "N"):
- File 9 of 10: js/storage.js (alignment only, no schema change)
*/
