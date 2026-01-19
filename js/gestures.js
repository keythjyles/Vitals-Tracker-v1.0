/* File: js/gestures.js */
/*
Vitals Tracker — Gestures (Panel Swipe + Pull-to-Refresh)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025a
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns ONLY:
  1) Horizontal panel rotation swipe (Home <-> Charts <-> Log)
  2) Pull-to-refresh on Home panel ONLY
- Does NOT own chart pan/zoom (chart.js owns that)
- Does NOT own panel visibility rules (panels.js owns that)

DESIGN (SIMPLIFIED)
- No “zones”. Swipe works anywhere on the active panel EXCEPT:
  - inside chart interaction region (#canvasWrap) while Charts is active
- Settings is NOT in rotation (gear-only)
- Add is NOT in rotation

ANTI-DRIFT RULES
- Do NOT implement chart gestures here.
- Do NOT implement rendering here.
*/

(function(){
  "use strict";

  function $(id){ return document.getElementById(id); }

  const root = $("panelsRoot") || document.body;
  const canvasWrap = $("canvasWrap"); // chart gesture protected region (if present)

  // Tune thresholds for Android touch
  const H_START_PX = 12;     // when we decide it's horizontal
  const V_START_PX = 14;     // when we decide it's vertical
  const SWIPE_COMMIT_PX = 42;// required dx to rotate panels
  const DOMINANCE = 1.15;    // dx must exceed dy*DOMINANCE (or vice versa)

  function activePanelName(){
    // Prefer panels module
    const p = window.VTPanels?.getActive?.();
    if (p) return p;

    // Fallback DOM detection
    if ($("panelHome")?.classList.contains("active")) return "home";
    if ($("panelCharts")?.classList.contains("active")) return "charts";
    if ($("panelLog")?.classList.contains("active")) return "log";
    if ($("panelAdd")?.classList.contains("active")) return "add";
    if ($("panelSettings")?.classList.contains("active")) return "settings";
    return "home";
  }

  function within(el, target){
    try{
      return !!(el && target && (el === target || el.contains(target)));
    }catch(_){
      return false;
    }
  }

  function canStartSwipe(target){
    const a = activePanelName();

    // Never rotate while in settings or add (not in rotation)
    if (a === "settings" || a === "add") return false;

    // On charts: protect chart region so chart gestures always win
    if (a === "charts" && canvasWrap && within(canvasWrap, target)) return false;

    return true;
  }

  function rotateNext(){
    try { window.VTPanels?.next?.(); } catch(_){}
  }
  function rotatePrev(){
    try { window.VTPanels?.prev?.(); } catch(_){}
  }

  // ===== Panel swipe =====
  const swipe = {
    active:false,
    ok:false,
    sx:0, sy:0,
    lx:0, ly:0,
    mode:null // "h" | "v" | null
  };

  root.addEventListener("touchstart", (e) => {
    if (!e.touches || e.touches.length !== 1) return;

    const t = e.touches[0];
    swipe.active = true;
    swipe.sx = swipe.lx = t.clientX;
    swipe.sy = swipe.ly = t.clientY;
    swipe.mode = null;
    swipe.ok = canStartSwipe(e.target);
  }, { passive:true });

  root.addEventListener("touchmove", (e) => {
    if (!swipe.active || !swipe.ok) return;
    if (!e.touches || e.touches.length !== 1) return;

    const t = e.touches[0];
    swipe.lx = t.clientX;
    swipe.ly = t.clientY;

    const dx = swipe.lx - swipe.sx;
    const dy = swipe.ly - swipe.sy;

    // Decide intent once
    if (!swipe.mode){
      const adx = Math.abs(dx), ady = Math.abs(dy);

      if (adx > H_START_PX && adx > ady * DOMINANCE) swipe.mode = "h";
      else if (ady > V_START_PX && ady > adx * DOMINANCE) swipe.mode = "v";
    }

    // If horizontal swipe, prevent scrolling so swipe is reliable
    if (swipe.mode === "h"){
      e.preventDefault();
    }
  }, { passive:false });

  root.addEventListener("touchend", (e) => {
    if (!swipe.active || !swipe.ok){
      swipe.active = false;
      return;
    }
    swipe.active = false;

    if (!e.changedTouches || e.changedTouches.length !== 1) return;
    if (swipe.mode !== "h") return;

    const t = e.changedTouches[0];
    const dx = t.clientX - swipe.sx;

    if (Math.abs(dx) < SWIPE_COMMIT_PX) return;

    // Left swipe -> next; Right swipe -> prev
    if (dx < 0) rotateNext();
    else rotatePrev();
  }, { passive:true });

  // ===== Pull-to-refresh (Home only) =====
  // This restores your “pull down on Home to refresh (release)” behavior,
  // but ONLY when Home is active and user pulls from near the top.
  const PULL_TOP_PX = 24;
  const PULL_TRIGGER_PX = 70;

  let pull = { active:false, sy:0, armed:false };

  root.addEventListener("touchstart", (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    if (activePanelName() !== "home") return;

    // Only arm if at (or near) top of scroll.
    // Home is usually not scroll-heavy, but we guard anyway.
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollY > PULL_TOP_PX) return;

    pull.active = true;
    pull.sy = e.touches[0].clientY;
    pull.armed = false;
  }, { passive:true });

  root.addEventListener("touchmove", (e) => {
    if (!pull.active) return;
    if (!e.touches || e.touches.length !== 1) return;
    if (activePanelName() !== "home") { pull.active = false; return; }

    const y = e.touches[0].clientY;
    const dy = y - pull.sy;

    // Only consider downward pull
    if (dy > PULL_TRIGGER_PX) pull.armed = true;
  }, { passive:true });

  root.addEventListener("touchend", () => {
    if (!pull.active) return;
    pull.active = false;

    if (!pull.armed) return;
    pull.armed = false;

    // Soft refresh hook: prefer app module, then fall back to reload
    try{
      if (window.VTApp?.refresh) return window.VTApp.refresh();
      if (window.VTStore?.refresh) return window.VTStore.refresh();
    }catch(_){}

    try { location.reload(); } catch(_){}
  }, { passive:true });

})();
