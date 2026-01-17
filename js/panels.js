/* ------------------------------------------------------------
   Vitals Tracker — js/panels.js
   App Version: v2.010

   Purpose:
   - Home panel content manager (shell-level)
   - Keeps Home clean: no embedded Log/Chart preview cards
   - Provides simple "Go to Log" / "Go to Charts" navigation

   Latest update (v2.010):
   - Removes legacy Home preview cards ("Log (read-only preview)" and
     "Charts (placeholder)") so Charts no longer appears on Home.
   - Injects two large navigation buttons on Home.
   - Does not write/migrate data.

   Safety:
   - Read-only DOM edits only
   - No storage writes
   ------------------------------------------------------------ */

(function () {
  "use strict";

  const VT = (window.VT = window.VT || {});
  VT.panels = VT.panels || {};

  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function findPanelByName(name) {
    const n = String(name || "").toLowerCase();
    const panels = qsa(".panel, [data-panel], [data-name]");
    for (const p of panels) {
      const dn =
        (p.getAttribute("data-panel") ||
          p.getAttribute("data-name") ||
          p.id ||
          "")
          .toLowerCase();
      if (dn.includes(n)) return p;
    }
    return null;
  }

  function clickNavTarget(targetName) {
    const t = String(targetName || "").toLowerCase();

    // Preferred: any existing nav buttons (data-nav)
    const btn = document.querySelector(`[data-nav="${t}"]`);
    if (btn) {
      btn.click();
      return true;
    }

    // Fallback: dispatch a generic navigation event
    document.dispatchEvent(new CustomEvent("vt:navigate", { detail: { to: t } }));
    return false;
  }

  function removeHomePreviewCards(homePanel) {
    if (!homePanel) return;

    // Remove obvious legacy preview cards by text match
    const candidates = qsa("div, section, article", homePanel);
    for (const el of candidates) {
      const txt = (el.textContent || "").trim();
      if (!txt) continue;

      // These are the specific legacy blocks you’re seeing.
      const isLogPreview =
        txt.includes("Log (read-only preview)") ||
        txt.includes("Next: render actual entries here");
      const isChartsPreview =
        txt.includes("Charts (placeholder)") ||
        txt.includes("Next: attach chart engine");

      if (isLogPreview || isChartsPreview) {
        // Remove the nearest "card-like" container if possible
        const card = el.closest(".card, .box, .panelCard, .section") || el;
        try { card.remove(); } catch (_) {}
      }
    }
  }

  function injectHomeNav(homePanel) {
    if (!homePanel) return;

    // Find a reasonable insertion point: first large inner container, else panel itself
    const host =
      homePanel.querySelector(".panel-inner") ||
      homePanel.querySelector(".content") ||
      homePanel;

    // Remove any prior injected nav (idempotent)
    const existing = host.querySelector("#vtHomeNav");
    if (existing) existing.remove();

    const wrap = document.createElement("div");
    wrap.id = "vtHomeNav";
    wrap.style.marginTop = "14px";

    // Buttons styled to match your pill/glass theme without relying on CSS edits
    function makeBtn(label, target) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.setAttribute("aria-label", label);

      b.style.width = "100%";
      b.style.padding = "16px 16px";
      b.style.margin = "10px 0";
      b.style.borderRadius = "999px";
      b.style.border = "1px solid rgba(235,245,255,.22)";
      b.style.background = "rgba(12,21,40,.45)";
      b.style.color = "rgba(235,245,255,.90)";
      b.style.fontSize = "18px";
      b.style.fontWeight = "700";
      b.style.letterSpacing = ".2px";
      b.style.boxShadow = "0 8px 20px rgba(0,0,0,.25) inset";

      b.addEventListener("click", function () {
        clickNavTarget(target);
      });

      return b;
    }

    const logBtn = makeBtn("Open Log", "log");
    const chartBtn = makeBtn("Open Charts", "charts");

    wrap.appendChild(logBtn);
    wrap.appendChild(chartBtn);

    // Insert near the top of Home content (after any header text)
    host.insertBefore(wrap, host.firstChild);
  }

  function refreshHome() {
    const home = findPanelByName("home");
    if (!home) return;

    removeHomePreviewCards(home);
    injectHomeNav(home);
  }

  // Public helper (optional use)
  VT.panels.refreshHome = refreshHome;

  document.addEventListener("DOMContentLoaded", refreshHome);

  // Also refresh whenever Home is shown (works with your app.js dispatcher)
  document.addEventListener("vt:panel:home", refreshHome);
  document.addEventListener("vt:show:home", refreshHome);

})();
