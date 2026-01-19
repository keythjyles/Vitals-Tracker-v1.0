/* 
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version Authority: js/version.js
Base: v2.026a
Pass: Swipe + Render Recovery (P0-R1)
Pass order: File 5 of 9 (P0)
Prev file: js/ui.js (File 4 of 9)
Next file: js/gestures.js (File 6 of 9)

FIX (BUTTON NAV = INSTANT, NO SCROLL)
Requirement:
- Button-driven navigation must NOT animate/scroll/slide.
- Swipes remain “smooth as butter” for the rotating deck only.

Implementation:
- All non-swipe navigation forces animated=false (instant track jump).
- Keep swipeEnd animation behavior intact for touch gestures.
- Preserve cancellable commit logic to prevent snap-backs.

ANTI-DRIFT:
- No changes to gesture detection here; only panel routing behavior.
*/

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

  function init() {
    cacheDom();
    cancelPendingCommit();
    currentPanel = "home";
    lastMainPanel = "home";
    inSettings = false;
    inAdd = false;
    setDragMode(false);
    go("home");
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
App Version Authority: js/version.js
Base: v2.026a
Pass: Swipe + Render Recovery (P0-R1)
Pass order: File 5 of 9 (P0)
Prev file: js/ui.js (File 4 of 9)
Next file: js/gestures.js (File 6 of 9)
*/
