/* File: js/ui.js */
/*
Vitals Tracker — UI Glue + Home UX Fixes (OWNER)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023h
Base: v2.021
Date: 2026-01-18

SCOPE (THIS FILE)
- Normalize Home screen button sizing (ALL equal size).
- Restore Home pull-to-refresh (simple, reliable).
- Keep UI concerns ONLY (no chart math, no swipe routing).
- De-risk gesture conflicts by NOT handling horizontal swipe here.

ANTI-DRIFT
- Do NOT manage panels here (js/panels.js owns that).
- Do NOT manage chart gestures here (js/chart.js owns that).
*/

(function () {
  "use strict";

  function $(id){ return document.getElementById(id); }

  /* =========================
     HOME BUTTON NORMALIZATION
     ========================= */

  function normalizeHomeButtons(){
    const ids = [
      "btnGoAdd",
      "btnGoCharts",
      "btnGoLog"
    ];
    const buttons = ids.map(id => $(id)).filter(Boolean);
    if(!buttons.length) return;

    // Find max height/width actually rendered
    let maxH = 0, maxW = 0;
    buttons.forEach(b => {
      const r = b.getBoundingClientRect();
      maxH = Math.max(maxH, r.height);
      maxW = Math.max(maxW, r.width);
    });

    // Apply uniform sizing
    buttons.forEach(b => {
      b.style.height = Math.ceil(maxH) + "px";
      b.style.width  = Math.ceil(maxW) + "px";
    });
  }

  /* =========================
     HOME PULL-TO-REFRESH
     ========================= */

  function initPullToRefresh(){
    const panel = $("panelHome");
    const indicator = $("pullIndicator");
    const card = $("homeCard");
    if(!panel || !indicator || !card) return;

    let startY = null;
    let armed = false;

    panel.addEventListener("touchstart", (e) => {
      if(card.scrollTop !== 0) return;
      startY = e.touches[0].clientY;
      armed = false;
    }, { passive:true });

    panel.addEventListener("touchmove", (e) => {
      if(startY == null) return;
      const dy = e.touches[0].clientY - startY;
      if(dy <= 0) return;

      const h = Math.min(52, Math.floor(dy / 2));
      indicator.style.height = h + "px";
      armed = (h >= 40);
    }, { passive:true });

    panel.addEventListener("touchend", () => {
      if(startY == null) return;
      indicator.style.height = "0px";
      if(armed){
        location.reload();
      }
      startY = null;
      armed = false;
    }, { passive:true });
  }

  /* =========================
     VERSION DISPLAY
     ========================= */

  function paintVersion(){
    try{
      const v = window.VTVersion?.getVersionString?.();
      if(!v) return;
      const homeV = $("homeVersion");
      const boot  = $("bootText");
      if(homeV) homeV.textContent = v;
      if(boot)  boot.textContent  = "BOOT OK " + v;
    }catch(_){}
  }

  /* =========================
     INIT
     ========================= */

  function init(){
    normalizeHomeButtons();
    initPullToRefresh();
    paintVersion();
  }

  function onReady(fn){
    if(document.readyState === "complete" || document.readyState === "interactive"){
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn, { once:true });
    }
  }

  onReady(init);

})();
