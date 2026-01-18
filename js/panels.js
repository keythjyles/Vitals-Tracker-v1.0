/* File: js/panels.js */
/*
Vitals Tracker — Panels Controller
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

File Purpose
- Owns panel activation state ONLY.
- Receives panel-change requests from gestures.js (and any other module) via CustomEvent:
    window.dispatchEvent(new CustomEvent("vt:panelchange", { detail:{ toIndex:<number> } }))
- Activates the correct panel element and deactivates all others.
- Updates nav button pressed/active state (if present).
- Maintains a fixed panel index map:
    0 = Home
    1 = Charts
    2 = Log
    3 = Settings (future placeholder)
- No chart rendering, no storage, no add/edit, no exports. This is strictly panel routing.

Integration Contract (Locked)
- index.html must include panels with: class="panel" and data-panel-index="<0..3>"
- index.html may include nav buttons with: data-nav-to="<0..3>" (optional)
- gestures.js must NOT directly toggle .active; it only dispatches "vt:panelchange".
- panels.js is the single source of truth for active panel.

App Version: v2.020
Base: v2.019
Date: 2026-01-18 (America/Chicago)

Change Log (v2.020)
1) Added deterministic panel registration by data-panel-index.
2) Added safety clamp + wrap for requested index (0..max), preserving carousel behavior.
3) Added optional nav button wiring via data-nav-to and active state styling hook:
   - sets aria-current="page" and data-active="1" on active nav button, clears on others.
4) Emits "vt:panelchanged" after activation so other modules can react (charts/log refresh).

Reference IDs / Selectors
- Panels: .panel[data-panel-index]
- Active panel class: .active
- Optional nav buttons: [data-nav-to]
- Events:
  - inbound:  vt:panelchange  { detail:{ toIndex:number } }
  - outbound: vt:panelchanged { detail:{ index:number } }
*/

(() => {
  "use strict";

  const EVT_IN = "vt:panelchange";
  const EVT_OUT = "vt:panelchanged";

  const clampInt = (n, a, b) => {
    n = Number.isFinite(n) ? Math.trunc(n) : a;
    if (n < a) return a;
    if (n > b) return b;
    return n;
  };

  // Wrap index into [0..max] (carousel wheel).
  const wrapIndex = (n, max) => {
    if (max <= 0) return 0;
    n = Math.trunc(n);
    // Proper modulo wrap for negatives
    return ((n % (max + 1)) + (max + 1)) % (max + 1);
  };

  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  let panels = [];
  let navButtons = [];
  let maxIndex = 2; // default if only 0..2 exist
  let activeIndex = 0;

  function registerPanels() {
    panels = qsa(".panel[data-panel-index]").sort((a, b) => {
      const ia = parseInt(a.getAttribute("data-panel-index"), 10);
      const ib = parseInt(b.getAttribute("data-panel-index"), 10);
      return (Number.isFinite(ia) ? ia : 0) - (Number.isFinite(ib) ? ib : 0);
    });

    if (!panels.length) {
      maxIndex = 0;
      activeIndex = 0;
      return;
    }

    // Determine maxIndex from actual DOM; supports future settings panel.
    maxIndex = panels.reduce((m, el) => {
      const i = parseInt(el.getAttribute("data-panel-index"), 10);
      return Number.isFinite(i) ? Math.max(m, i) : m;
    }, 0);

    // Identify current active panel if any
    const current = panels.find(el => el.classList.contains("active"));
    if (current) {
      const i = parseInt(current.getAttribute("data-panel-index"), 10);
      if (Number.isFinite(i)) activeIndex = clampInt(i, 0, maxIndex);
    } else {
      // Default to Home if present; otherwise first in list.
      const home = panels.find(el => el.getAttribute("data-panel-index") === "0");
      activeIndex = home ? 0 : clampInt(parseInt(panels[0].getAttribute("data-panel-index"), 10) || 0, 0, maxIndex);
      activate(activeIndex, { silent: true });
    }
  }

  function registerNavButtons() {
    navButtons = qsa("[data-nav-to]").filter(el => el instanceof HTMLElement);

    // Attach click handlers (optional; does not interfere with other modules)
    navButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const to = parseInt(btn.getAttribute("data-nav-to"), 10);
        if (!Number.isFinite(to)) return;
        window.dispatchEvent(new CustomEvent(EVT_IN, { detail: { toIndex: to, source: "nav" } }));
        e.preventDefault();
      }, { passive: false });
    });
  }

  function setNavActive(index) {
    if (!navButtons.length) return;
    navButtons.forEach(btn => {
      const to = parseInt(btn.getAttribute("data-nav-to"), 10);
      const isActive = Number.isFinite(to) && to === index;
      if (isActive) {
        btn.setAttribute("aria-current", "page");
        btn.setAttribute("data-active", "1");
      } else {
        btn.removeAttribute("aria-current");
        btn.removeAttribute("data-active");
      }
    });
  }

  function activate(requestedIndex, opts = {}) {
    if (!panels.length) registerPanels();
    if (!panels.length) return;

    const idx = wrapIndex(requestedIndex, maxIndex);
    activeIndex = idx;

    panels.forEach(el => {
      const i = parseInt(el.getAttribute("data-panel-index"), 10);
      const on = Number.isFinite(i) && i === idx;
      el.classList.toggle("active", on);
      el.setAttribute("aria-hidden", on ? "false" : "true");
    });

    setNavActive(idx);

    if (!opts.silent) {
      window.dispatchEvent(new CustomEvent(EVT_OUT, { detail: { index: idx } }));
    }
  }

  function onPanelChange(e) {
    const d = e && e.detail ? e.detail : {};
    const to = Number(d.toIndex);
    if (!Number.isFinite(to)) return;
    activate(to);
  }

  function boot() {
    registerPanels();
    registerNavButtons();
    setNavActive(activeIndex);

    window.addEventListener(EVT_IN, onPanelChange);

    // Expose minimal debug handle (non-invasive)
    window.VTPanels = Object.freeze({
      get activeIndex() { return activeIndex; },
      get maxIndex() { return maxIndex; },
      activate: (i) => activate(i),
      refresh: () => { registerPanels(); registerNavButtons(); setNavActive(activeIndex); }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
 
/* EOF File: js/panels.js */
/*
Vitals Tracker — Panels Controller
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
App Version: v2.020

EOF Notes
- This file is the ONLY module that toggles .panel.active.
- gestures.js (and others) must request changes via "vt:panelchange".
- Emits "vt:panelchanged" after activation for dependent modules (charts/log refresh).
*/
