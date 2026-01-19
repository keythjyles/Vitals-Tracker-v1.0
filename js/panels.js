/* 
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version Authority: js/version.js
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 5 of 9 (P0)
Prev file: js/ui.js (File 4 of 9)
Next file: js/gestures.js (File 6 of 9)

FIX (SWIPE HITCH ONLY)
- Removes the “snap back then snap forward” hitch at gesture end by:
  1) Pinning the track to the current rotation index (no transition),
  2) Clearing per-panel drag transforms,
  3) Snapping to the target panel on the next animation frame (with transition).
- Keeps rotation order stable:
    Right swipe: Home -> Log -> Charts -> Home ...
    Left swipe:  Home -> Charts -> Log -> Home ...
*/

(function () {
  "use strict";

  const ROTATION = ["home", "charts", "log"];
  const TRACK_ORDER = ["home", "charts", "log", "settings", "add"];

  let currentPanel = "home";
  let lastMainPanel = "home";
  let inSettings = false;
  let inAdd = false;

  // Drag mode: track is positioned at the CURRENT rotating index; panels are moved relative to that.
  let dragMode = false;

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

  function setActivePanel(name) {
    Object.keys(panels).forEach(k => {
      panels[k] && panels[k].classList.remove("active");
    });

    const p = panels[name];
    p && p.classList.add("active");

    try {
      if (name === "charts" && window.VTChart?.onShow) window.VTChart.onShow();
      if (name === "log" && window.VTLog?.onShow) window.VTLog.onShow();
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
      if (el) el.style.transform = "";
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
      // actual track pin is set in swipeDelta() because it depends on current rotation index
    } else {
      clearRotationPanelTransforms();
    }
  }

  function go(name, animated = true) {
    if (!panels[name]) return;

    if (inSettings && name !== "settings") inSettings = false;
    if (inAdd && name !== "add") inAdd = false;

    if (isRotatingPanel(name)) lastMainPanel = name;

    currentPanel = name;

    if (name === "settings") {
      inSettings = true;
      setDragMode(false);
      setActivePanel("settings");
      applyTransformToPanel("settings", animated);
      return;
    }

    if (name === "add") {
      inAdd = true;
      setDragMode(false);
      setActivePanel("add");
      applyTransformToPanel("add", animated);
      return;
    }

    setDragMode(false);
    setActivePanel(name);
    applyTransformToPanel(name, animated);
  }

  function openSettings() {
    if (!panels.settings) return;
    go("settings", false);
  }

  function closeSettings(animated = true) {
    inSettings = false;
    const target = isRotatingPanel(lastMainPanel) ? lastMainPanel : "home";
    go(target, animated);
  }

  function openAdd() {
    if (!panels.add) return;
    go("add", false);
  }

  function closeAdd(animated = true) {
    inAdd = false;
    const target = isRotatingPanel(lastMainPanel) ? lastMainPanel : "home";
    go(target, animated);
  }

  function canSwipe() {
    return !inSettings && !inAdd && isRotatingPanel(currentPanel);
  }

  function getRotationIndex() {
    const idx = rotationIndexFor(currentPanel);
    return idx === -1 ? 0 : idx;
  }

  function showByRotationIndex(rotIdx, animated = true) {
    const n = ROTATION.length;
    const wrapped = ((rotIdx % n) + n) % n;
    const name = ROTATION[wrapped];
    go(name, animated);
  }

  function swipeDelta(deltaRatio) {
    if (!canSwipe()) return;
    if (!deck.track) return;

    const n = ROTATION.length;
    const cur = getRotationIndex();

    setDragMode(true);

    // Pin track at the current rotation index (0..2)
    pinTrackToRotationIndex(cur);

    for (let i = 0; i < n; i++) {
      const name = ROTATION[i];
      const el = panels[name];
      if (!el) continue;

      // Natural position relative to pinned track is (i - cur) * 100.
      const raw = i - cur;
      const natural = raw * 100;

      // Wrapped relative position into [-1, 0, +1] for continuous wrap preview.
      let rel = raw;
      if (rel > 1) rel -= n;
      if (rel < -1) rel += n;

      const desired = (rel + deltaRatio) * 100;

      // Apply only the delta needed beyond natural position.
      const tx = desired - natural;
      el.style.transform = `translate3d(${tx}%, 0, 0)`;
    }
  }

  function swipeEnd(deltaRatio) {
    if (!canSwipe()) return;
    if (!deck.track) return;

    const THRESH = 0.2;

    const curRot = getRotationIndex();
    let targetRot = curRot;

    if (deltaRatio > THRESH) targetRot = curRot - 1;     // right swipe => prev
    if (deltaRatio < -THRESH) targetRot = curRot + 1;    // left swipe => next

    // Step 1: lock the track at the current position immediately (no animation)
    // Step 2: clear per-panel transforms (removes drag offsets)
    // Step 3: on next frame, animate track to the target panel
    setDragMode(true);
    pinTrackToRotationIndex(curRot);
    clearRotationPanelTransforms();

    const n = ROTATION.length;
    const wrapped = ((targetRot % n) + n) % n;
    const targetName = ROTATION[wrapped];

    // Exit drag mode *after* we’ve neutralized transforms, but before the animated snap.
    dragMode = false;

    requestAnimationFrame(() => {
      // Update state + active class immediately
      currentPanel = targetName;
      lastMainPanel = targetName;
      setActivePanel(targetName);

      // Animated snap to the track index (home/charts/log are contiguous in DOM)
      applyTransformToPanel(targetName, true);
    });
  }

  function init() {
    cacheDom();
    currentPanel = "home";
    lastMainPanel = "home";
    inSettings = false;
    inAdd = false;
    setDragMode(false);
    go("home", false);
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

})();

/* 
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/panels.js
Pass: Render Recovery + Swipe Feel
Pass order: File 5 of 9 (P0)
Prev file: js/ui.js (File 4 of 9)
Next file: js/gestures.js (File 6 of 9)
*/
