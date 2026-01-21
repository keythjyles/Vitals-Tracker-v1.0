/* 
Vitals Tracker — BOF (Prime Pass Header)
File: js/panels.js
App Version Authority: js/version.js
ImplementationId: PP-20260121-001
Prime Pass: Step 9 of 23
Prev (this run): js/state.js
Next (this run): js/gestures.js
FileEditId: 2
Edited: 2026-01-21

Beacon Drift Control Note (persist until user changes)
- Beacon, focus on THIS pasted file and THIS chat message only.
- Follow only the instructions/prompts inside THIS paste and THIS message.
- Prime Pass rule: DO NOT change functional code. Update header/footer only.
- On every subsequent full-file edit of this file, increment FileEditId by +1.

Role / Ownership (LOCKED)
- Panel routing + deck transform control
- Owns navigation behavior (button nav vs swipe nav)
- Must NOT implement gesture detection here (only consumes swipeDelta/swipeEnd inputs)

Implemented (facts only)
- Button navigation is INSTANT (animated=false forced)
- Swipe end retains smooth commit animation behavior
- Recovery/hardening: auto-init if app.js fails to call VTPanels.init()
- Fallback binding for critical nav buttons (Home/Charts/Log/Add/Settings/Back)
- Store readiness is ensured before Charts/Log onShow render

Anti-drift rules
- No gesture detection changes here
- No chart drawing or log rendering here (only calls VTChart.onShow / VTLog.onShow)
------------------------------------------------------------ */

(function () {
  "use strict";

  const ROTATION = ["home", "charts", "log"];
  const TRACK_ORDER = ["home", "charts", "log", "settings", "add"];

  let currentPanel = "home";
  let lastMainPanel = "home";
  let inSettings = false;
  let inAdd = false;

  let dragMode = false;

  // Prevent stale swipeEnd commits from firing after button navigation
  let commitTimer = 0;
  let commitToken = 0;

  const panels = {};
  const deck = {};

  function cacheDom() {
    deck.root = document.getElementById("panelDeck");
    deck.track = document.getElementById("deckTrack");

    panels.home = document.getElementById("panelHome");
    panels.charts = document.getElementById("panelCharts");
    panels.log = document.getElementById("panelLog");
    panels.settings = document.getElementById("panelSettings");
    panels.add = document.getElementById("panelAdd");
  }

  function cancelPendingCommit() {
    try {
      if (commitTimer) {
        clearTimeout(commitTimer);
        commitTimer = 0;
      }
    } catch (_) {}
    commitToken++;
  }

  function trackIndexFor(name) {
    return TRACK_ORDER.indexOf(name);
  }

  function rotationIndexFor(name) {
    return ROTATION.indexOf(name);
  }

  function isRotatingPanel(name) {
    return rotationIndexFor(name) !== -1;
  }

  function dispatchPanelChanged(activeName) {
    try {
      document.dispatchEvent(new CustomEvent("vt:panelChanged", {
        detail: { active: activeName }
      }));
    } catch (_) {}
  }

  async function ensureStoreReadyForRender() {
    try {
      if (window.VTStore && typeof window.VTStore.init === "function") {
        await window.VTStore.init();
      }
    } catch (_) {}
  }

  function setActivePanel(name) {
    Object.keys(panels).forEach(k => {
      panels[k] && panels[k].classList.remove("active");
    });

    const p = panels[name];
    p && p.classList.add("active");

    // Ensure storage is initialized before renderers run.
    // Do NOT block navigation; kick init then render.
    try {
      if (name === "charts") {
        ensureStoreReadyForRender().then(() => {
          try { window.VTChart?.onShow?.(); } catch (_) {}
        });
      }
      if (name === "log") {
        ensureStoreReadyForRender().then(() => {
          try { window.VTLog?.onShow?.(); } catch (_) {}
        });
      }
    } catch (_) {}

    dispatchPanelChanged(name);
  }

  function applyTransformToPanel(name, animated = true) {
    if (!deck.track) return;

    const idx = trackIndexFor(name);
    if (idx === -1) return;

    deck.track.style.transition = animated
      ? "transform 320ms cubic-bezier(.2,.8,.2,1)"
      : "none";

    const x = -idx * 100;
    deck.track.style.transform = `translate3d(${x}%, 0, 0)`;
  }

  function clearRotationPanelTransforms() {
    ROTATION.forEach(n => {
      const el = panels[n];
      if (el) {
        el.style.transition = "";
        el.style.transform = "";
      }
    });
  }

  function pinTrackToRotationIndex(rotIdx) {
    if (!deck.track) return;
    deck.track.style.transition = "none";
    deck.track.style.transform = `translate3d(${-rotIdx * 100}%, 0, 0)`;
  }

  function setDragMode(on) {
    if (dragMode === on) return;
    dragMode = on;

    if (!deck.track) return;

    if (on) {
      deck.track.style.transition = "none";
      // actual pin set in swipeDelta() using current index
    } else {
      clearRotationPanelTransforms();
    }
  }

  // IMPORTANT: direct navigation (buttons) must be instant => force animated=false always.
  function go(name /*, animatedIgnored */) {
    if (!panels[name]) return;

    cancelPendingCommit();

    if (inSettings && name !== "settings") inSettings = false;
    if (inAdd && name !== "add") inAdd = false;

    if (isRotatingPanel(name)) lastMainPanel = name;
    currentPanel = name;

    // Always leave drag mode for button nav
    setDragMode(false);

    if (name === "settings") {
      inSettings = true;
      setActivePanel("settings");
      applyTransformToPanel("settings", false);
      return;
    }

    if (name === "add") {
      inAdd = true;
      setActivePanel("add");
      applyTransformToPanel("add", false);
      return;
    }

    setActivePanel(name);
    applyTransformToPanel(name, false);
  }

  function openSettings() {
    if (!panels.settings) return;
    go("settings");
  }

  function closeSettings() {
    cancelPendingCommit();
    inSettings = false;
    const target = isRotatingPanel(lastMainPanel) ? lastMainPanel : "home";
    go(target);
  }

  function openAdd() {
    if (!panels.add) return;
    go("add");
  }

  function closeAdd() {
    cancelPendingCommit();
    inAdd = false;
    const target = isRotatingPanel(lastMainPanel) ? lastMainPanel : "home";
    go(target);
  }

  function canSwipe() {
    return !inSettings && !inAdd && isRotatingPanel(currentPanel);
  }

  function getRotationIndex() {
    const idx = rotationIndexFor(currentPanel);
    return idx === -1 ? 0 : idx;
  }

  function showByRotationIndex(rotIdx /*, animatedIgnored */) {
    cancelPendingCommit();
    const n = ROTATION.length;
    const wrapped = ((rotIdx % n) + n) % n;
    const name = ROTATION[wrapped];
    go(name);
  }

  function applyDragTransforms(deltaRatio) {
    const n = ROTATION.length;
    const cur = getRotationIndex();

    pinTrackToRotationIndex(cur);

    for (let i = 0; i < n; i++) {
      const name = ROTATION[i];
      const el = panels[name];
      if (!el) continue;

      const raw = i - cur;
      const natural = raw * 100;

      let rel = raw;
      if (rel > 1) rel -= n;
      if (rel < -1) rel += n;

      const desired = (rel + deltaRatio) * 100;
      const tx = desired - natural;
      el.style.transform = `translate3d(${tx}%, 0, 0)`;
    }
  }

  function swipeDelta(deltaRatio) {
    if (!canSwipe()) return;
    if (!deck.track) return;

    cancelPendingCommit();

    setDragMode(true);
    applyDragTransforms(deltaRatio);
  }

  function swipeEnd(deltaRatio) {
    if (!canSwipe()) return;
    if (!deck.track) return;

    cancelPendingCommit();

    const THRESH = 0.2;

    const curRot = getRotationIndex();
    let targetRot = curRot;
    let finalDelta = 0;

    // Right swipe => PREV (wrap)
    if (deltaRatio > THRESH) {
      targetRot = curRot - 1;
      finalDelta = 1;
    }

    // Left swipe => NEXT (wrap)
    if (deltaRatio < -THRESH) {
      targetRot = curRot + 1;
      finalDelta = -1;
    }

    const n = ROTATION.length;
    const wrapped = ((targetRot % n) + n) % n;
    const targetName = ROTATION[wrapped];

    setDragMode(true);
    pinTrackToRotationIndex(curRot);

    ROTATION.forEach((name) => {
      const el = panels[name];
      if (!el) return;
      el.style.transition = "transform 260ms cubic-bezier(.2,.8,.2,1)";
    });

    applyDragTransforms(finalDelta);

    const myToken = ++commitToken;

    commitTimer = window.setTimeout(() => {
      if (myToken !== commitToken) return;

      try {
        clearRotationPanelTransforms();

        currentPanel = targetName;
        lastMainPanel = targetName;
        setActivePanel(targetName);

        applyTransformToPanel(targetName, false);
      } catch (_) {}

      dragMode = false;
      commitTimer = 0;
    }, 280);
  }

  function bindOnce(el, key, handler, opts) {
    if (!el) return;
    const k = `vtBound_${key}`;
    try {
      if (el.dataset && el.dataset[k] === "1") return;
      if (el.dataset) el.dataset[k] = "1";
    } catch (_) {}
    el.addEventListener("click", handler, opts || false);
  }

  function bindNavFallbacks() {
    // HOME
    bindOnce(document.getElementById("btnGoCharts"), "goCharts", (e) => {
      try { e.preventDefault(); } catch (_) {}
      go("charts");
    });
    bindOnce(document.getElementById("btnGoLog"), "goLog", (e) => {
      try { e.preventDefault(); } catch (_) {}
      go("log");
    });
    bindOnce(document.getElementById("btnGoAdd"), "goAddHome", (e) => {
      try { e.preventDefault(); } catch (_) {}
      openAdd();
    });

    // CHARTS header
    bindOnce(document.getElementById("btnAddFromCharts"), "addCharts", (e) => {
      try { e.preventDefault(); } catch (_) {}
      openAdd();
    });
    bindOnce(document.getElementById("btnHomeFromCharts"), "homeCharts", (e) => {
      try { e.preventDefault(); } catch (_) {}
      go("home");
    });
    bindOnce(document.getElementById("btnSettingsFromCharts"), "settingsCharts", (e) => {
      try { e.preventDefault(); } catch (_) {}
      openSettings();
    });

    // LOG header
    bindOnce(document.getElementById("btnAddFromLog"), "addLog", (e) => {
      try { e.preventDefault(); } catch (_) {}
      openAdd();
    });
    bindOnce(document.getElementById("btnHomeFromLog"), "homeLog", (e) => {
      try { e.preventDefault(); } catch (_) {}
      go("home");
    });
    bindOnce(document.getElementById("btnSettingsFromLog"), "settingsLog", (e) => {
      try { e.preventDefault(); } catch (_) {}
      openSettings();
    });

    // SETTINGS
    bindOnce(document.getElementById("btnBackFromSettings"), "backSettings", (e) => {
      try { e.preventDefault(); } catch (_) {}
      closeSettings();
    });

    // HOME alt settings icon (if present)
    bindOnce(document.getElementById("btnSettingsHomeAlt"), "settingsHomeAlt", (e) => {
      try { e.preventDefault(); } catch (_) {}
      openSettings();
    });

    // ADD home/back button (if present)
    bindOnce(document.getElementById("btnHomeFromAdd"), "homeFromAddFallback", (e) => {
      // add.js also binds; this is a safe fallback
      try { e.preventDefault(); } catch (_) {}
      closeAdd();
    });
  }

  let didInit = false;

  function init() {
    cacheDom();
    cancelPendingCommit();

    currentPanel = "home";
    lastMainPanel = "home";
    inSettings = false;
    inAdd = false;
    setDragMode(false);

    bindNavFallbacks();

    go("home");

    didInit = true;
  }

  // Auto-init (recovery) if app.js forgot to call VTPanels.init()
  function autoInitIfNeeded() {
    if (didInit) return;
    try {
      cacheDom();
      // only init if core DOM is present
      if (deck.root && deck.track && panels.home && panels.charts && panels.log) {
        init();
      }
    } catch (_) {}
  }

  window.VTPanels = Object.freeze({
    init,
    go,

    openSettings,
    closeSettings,

    openAdd,
    closeAdd,

    canSwipe,
    swipeDelta,
    swipeEnd,

    getRotationIndex,
    showByRotationIndex
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInitIfNeeded, { passive: true });
  } else {
    autoInitIfNeeded();
  }

})();

/* 
Vitals Tracker — EOF (Prime Pass Footer)
File: js/panels.js
App Version Authority: js/version.js
ImplementationId: PP-20260121-001
Prime Pass: Step 9 of 23
Prev (this run): js/state.js
Next (this run): js/gestures.js
FileEditId: 2
Edited: 2026-01-21

Current file (pasted/edited in this step): js/panels.js

Acceptance checks
- Button navigation is instant (no slide animation)
- Swipe navigation remains smooth with commit animation and no snap-back drift
- Auto-init runs only when core DOM exists and app.js missed init
- Fallback nav bindings work for Home/Charts/Log/Add/Settings/Back
*/ 
