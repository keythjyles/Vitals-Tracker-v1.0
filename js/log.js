/* File: js/log.js */
/*
Vitals Tracker — Log Renderer (Read-Only)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025e
Base: v2.021
Date: 2026-01-18

Schema position:
File 6 of 10

Former file:
File 5 — js/panels.js

Next file:
File 7 — js/gestures.js

FILE ROLE (LOCKED)
- Owns rendering of the Log panel (read-only list).
- Responsible for loading records and displaying them chronologically.
- MUST show data immediately when Log panel is activated.
- MUST NOT implement swipe or navigation.
- MUST NOT write to storage.
- MUST tolerate empty or partial datasets safely.

v2.025e — Change Log (THIS FILE ONLY)
1) Restores Log rendering pipeline (no infinite “Loading…”).
2) Uses unified record loading (VTStore → VTStorage fallback).
3) Defensive normalization of timestamps and vitals fields.
4) Chronological sort (newest first).
5) Stable empty-state message.

ANTI-DRIFT RULES
- Do NOT add edit/delete actions.
- Do NOT implement gestures.
- Do NOT style outside the Log container.
*/

(function () {
  "use strict";

  const PANEL_ID = "panel-log";
  const LIST_ID  = "logList";

  function $(id) {
    return document.getElementById(id);
  }

  function safeNum(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function parseTs(v) {
    if (v == null) return null;
    if (typeof v === "number") {
      return v > 1e12 ? v : v * 1000;
    }
    if (typeof v === "string") {
      const t = Date.parse(v);
      return Number.isFinite(t) ? t : null;
    }
    return null;
  }

  function extractTs(r) {
    return r?.ts ?? r?.time ?? r?.timestamp ?? r?.date ?? r?.createdAt ?? r?.created_at ?? r?.iso ?? null;
  }

  function extractBP(r) {
    const sys = safeNum(r?.sys ?? r?.systolic ?? r?.sbp ?? (r?.bp && r.bp.sys));
    const dia = safeNum(r?.dia ?? r?.diastolic ?? r?.dbp ?? (r?.bp && r.bp.dia));
    return { sys, dia };
  }

  function extractHR(r) {
    return safeNum(r?.hr ?? r?.heartRate ?? r?.pulse ?? (r?.vitals && r.vitals.hr));
  }

  async function loadRecords() {
    try {
      if (window.VTStore?.init) await window.VTStore.init();
    } catch (_) {}

    try {
      if (window.VTStore?.getAll) return window.VTStore.getAll() || [];
    } catch (_) {}

    try {
      if (window.VTStorage?.getAllRecords) {
        return await window.VTStorage.getAllRecords() || [];
      }
    } catch (_) {}

    return [];
  }

  function clearList() {
    const list = $(LIST_ID);
    if (list) list.innerHTML = "";
  }

  function renderEmpty(msg) {
    const list = $(LIST_ID);
    if (!list) return;

    const div = document.createElement("div");
    div.textContent = msg;
    div.style.padding = "16px";
    div.style.color = "rgba(235,245,255,0.65)";
    div.style.fontSize = "14px";
    div.style.textAlign = "center";

    list.appendChild(div);
  }

  function renderRow(rec) {
    const row = document.createElement("div");
    row.style.padding = "10px 12px";
    row.style.borderBottom = "1px solid rgba(235,245,255,0.10)";
    row.style.display = "flex";
    row.style.flexDirection = "column";
    row.style.gap = "4px";

    const dt = document.createElement("div");
    dt.style.fontSize = "13px";
    dt.style.color = "rgba(235,245,255,0.85)";
    dt.textContent = new Date(rec.ts).toLocaleString();

    const vals = document.createElement("div");
    vals.style.fontSize = "13px";
    vals.style.color = "rgba(235,245,255,0.70)";

    const parts = [];
    if (rec.sys != null && rec.dia != null) parts.push(`BP ${rec.sys}/${rec.dia}`);
    if (rec.hr != null) parts.push(`HR ${rec.hr}`);

    vals.textContent = parts.join("   ");

    row.appendChild(dt);
    row.appendChild(vals);

    return row;
  }

  async function renderLog() {
    clearList();

    const list = $(LIST_ID);
    if (!list) return;

    const raw = await loadRecords();
    if (!raw.length) {
      renderEmpty("No readings logged yet.");
      return;
    }

    const records = [];

    for (const r of raw) {
      const ts = parseTs(extractTs(r));
      if (ts == null) continue;

      const bp = extractBP(r);
      const hr = extractHR(r);

      records.push({
        ts,
        sys: bp.sys,
        dia: bp.dia,
        hr
      });
    }

    if (!records.length) {
      renderEmpty("No usable readings found.");
      return;
    }

    records.sort((a, b) => b.ts - a.ts);

    for (const rec of records) {
      list.appendChild(renderRow(rec));
    }
  }

  function onShow() {
    renderLog();
  }

  // Public API
  window.VTLog = {
    onShow
  };

})();
