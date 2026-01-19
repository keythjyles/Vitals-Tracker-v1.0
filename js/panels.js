/* 
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version Authority: js/version.js
Base: v2.026a
Pass: Swipe + Render Recovery (P0-R1)
Pass order: File 5 of 9 (P0)
Prev file: js/ui.js (File 4 of 9)
Next file: js/gestures.js (File 6 of 9)

FIX (SWIPE RELEASE GLITCH ONLY)
- On finger release, we COMPLETE the snap from the CURRENT drag position (no instant revert).
- Mechanism:
  1) Keep track pinned at current rotation index (0..2) during drag + release.
  2) Animate rotating panels’ per-panel transforms from current drag position to final snapped offsets.
  3) Commit with zero-jump:
     - Move the track to the target index with NO transition while panels are still in snapped state,
     - then clear per-panel transforms on the next frame.
- Rotation remains locked:
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
      // actual pin applied inside swipeDelta()/swipeEnd()
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

  function applyDragTransforms(deltaRatio) {
    const n = ROTATION.length;
    const cur = getRotationIndex();

    // Track is pinned at current index; panels are offset relative to that.
    pinTrackToRotationIndex(cur);

    for (let i = 0; i < n; i++) {
      const name = ROTATION[i];
      const el = panels[name];
      if (!el) continue;

      // Natural position relative to pinned track
      const raw = i - cur;
      const natural = raw * 100;

      // Wrapped rel into [-1,0,+1]
      let rel = raw;
      if (rel > 1) rel -= n;
      if (rel < -1) rel += n;

      const desired = (rel + deltaRatio) * 100;

      // Panel transform is delta from natural (so track pin stays consistent)
      const tx = desired - natural;
      el.style.transform = `translate3d(${tx}%, 0, 0)`;
    }
  }

  function swipeDelta(deltaRatio) {
    if (!canSwipe()) return;
    if (!deck.track) return;

    setDragMode(true);
    applyDragTransforms(deltaRatio);
  }

  function onceTransitionEnd(el, cb, msFallback) {
    let done = false;

    function finish() {
      if (done) return;
      done = true;
      try { el.removeEventListener("transitionend", onEnd); } catch (_) {}
      cb();
    }

    function onEnd(e) {
      // Only care about transform transitions for rotating panels
      if (e && e.propertyName && e.propertyName !== "transform") return;
      finish();
    }

    try { el.addEventListener("transitionend", onEnd); } catch (_) {}

    window.setTimeout(finish, msFallback || 320);
  }

  function swipeEnd(deltaRatio) {
    if (!canSwipe()) return;
    if (!deck.track) return;

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

    // Stay in drag mode and animate the rotating panels to snapped offsets.
    setDragMode(true);

    // Pin at CURRENT index before animating (prevents track drift)
    pinTrackToRotationIndex(curRot);

    // Animate per-panel transforms from current drag position to finalDelta
    ROTATION.forEach((name) => {
      const el = panels[name];
      if (!el) return;
      el.style.transition = "transform 260ms cubic-bezier(.2,.8,.2,1)";
    });

    applyDragTransforms(finalDelta);

    // Commit without hitch:
    // 1) While panels remain visually snapped, move track to target with NO transition.
    // 2) Next frame, clear per-panel transforms (so normal track-driven mode resumes).
    const commitEl = panels[targetName] || panels.home;

    onceTransitionEnd(commitEl, () => {
      try {
        // Update state + active first (safe; does not move anything)
        currentPanel = targetName;
        lastMainPanel = targetName;
        setActivePanel(targetName);

        // Move track instantly to the target panel
        applyTransformToPanel(targetName, false);

        // Clear per-panel transforms on next frame to avoid any visual jump
        window.requestAnimationFrame(() => {
          clearRotationPanelTransforms();
          setDragMode(false);
        });
      } catch (_) {
        try { clearRotationPanelTransforms(); } catch (_) {}
        try { setDragMode(false); } catch (_) {}
      }
    }, 320);
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
Pass: Swipe + Render Recovery (P0-R1)
Pass order: File 5 of 9 (P0)
Prev file: js/ui.js (File 4 of 9)
Next file: js/gestures.js (File 6 of 9)
*/
