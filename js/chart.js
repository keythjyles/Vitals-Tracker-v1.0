/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: css/app.css
App Version Authority: js/version.js
Base: v2.026a
Pass: UI Layout Consistency (P1-L1)
Pass order: File 1 of 1
Prev file: (n/a)
Next file: (n/a)

CHANGE (CSS ONLY)

1. Force a consistent top-right Settings button position on Home/Charts/Log:

The icon button is pinned to the top-right of the screen header area.

Header layout becomes position:relative; title stays left; right container fills.



2. Home bottom buttons layout:

The 3 “bottom” buttons on Home are kept on a single row, evenly spaced,
and positioned underneath the Log button (i.e., after the Log button in the stack).

This targets .homeRow (existing markup) and improves spacing without changing HTML.




ANTI-DRIFT

No JS changes.

No DOM/HTML edits.
*/


:root{
--bg0:#08101f;
--bg1:#0b1324;
--panel:#0c1528cc;

--stroke:rgba(235,245,255,.16);
--stroke2:rgba(235,245,255,.22);
--strokeBold:rgba(180,210,255,.42);

--text:rgba(235,245,255,.92);
--muted:rgba(235,245,255,.58);
--muted2:rgba(235,245,255,.42);

--accent:#2b4e7a;
--accentSoft:rgba(80,140,220,.25);

--danger:#8b3a44;
--dangerSoft:rgba(180,60,80,.28);

--radiusXL:28px;
--radiusL:22px;
--radiusM:16px;

--shadowSoft:0 12px 40px rgba(0,0,0,.35);
--shadowInset:inset 0 0 0 1px var(--stroke);

--touchTarget:48px;
}

*,
*::before,
*::after{
box-sizing:border-box;
}

html,body{
width:100%;
height:100%;
margin:0;
background:
radial-gradient(1200px 600px at 50% -200px, #13244a, transparent 60%),
linear-gradient(180deg, var(--bg1), var(--bg0));
color:var(--text);
font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
overscroll-behavior-y:contain;
-webkit-tap-highlight-color:transparent;
}

button{
font-family:inherit;
border:none;
background:none;
color:inherit;
}

button:focus{
outline:none;
}

canvas{
display:block;
}

/* ==============================
App Shell
============================== */

.app-root{
width:100%;
height:100%;
display:flex;
flex-direction:column;
}

/* ==============================
Top Bar
============================== */

.topbar{
display:flex;
align-items:center;
justify-content:space-between;
padding:12px 16px;
margin:10px 12px;
border-radius:999px;
background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
box-shadow:var(--shadowInset), var(--shadowSoft);
}

.brand{
display:flex;
align-items:center;
gap:10px;
}

.brandIcon{
width:36px;
height:36px;
border-radius:50%;
display:flex;
align-items:center;
justify-content:center;
background:linear-gradient(180deg, #1b335e, #0e1d38);
box-shadow:var(--shadowInset);
}

.brandTitle{
font-size:18px;
font-weight:600;
letter-spacing:.2px;
}

.bootpill{
padding:6px 12px;
font-size:12px;
border-radius:999px;
background:rgba(255,255,255,.08);
color:var(--muted);
box-shadow:var(--shadowInset);
}

/* ==============================
Deck / Panels
============================== */

.deck{
flex:1;
position:relative;
overflow:hidden;
background:
radial-gradient(1200px 600px at 50% -200px, #13244a, transparent 60%),
linear-gradient(180deg, var(--bg1), var(--bg0));
}

.deckTrack{
height:100%;
display:flex;
flex-direction:row;
will-change:transform;
}

.panel{
min-width:100%;
height:100%;
padding:12px;
}

.panel.active{
pointer-events:auto;
}

.screenFrame{
height:100%;
border-radius:var(--radiusXL);
background:
linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.015)),
rgba(10,16,30,.28);
box-shadow:var(--shadowInset), var(--shadowSoft);
border:1px solid var(--strokeBold);
padding:16px;
display:flex;
flex-direction:column;
overflow:hidden;
}

/* ==============================
Screen Header
============================== */

.screenHeader{
position:relative;            /* NEW: enables absolute pinning /
display:flex;
align-items:center;
justify-content:space-between;
margin-bottom:14px;
padding-right:58px;           / NEW: reserve space for pinned icon /
min-height:var(--touchTarget);/ NEW: stable height across panels */
}

.screenTitle{
font-size:28px;
font-weight:600;
}

.screenHeaderRight{
display:flex;
gap:10px;
align-items:center;
}

/* NEW: pin settings icon to the exact same top-right spot on any header */
.screenHeader .iconBtn{
position:absolute;
top:0;
right:0;
}

/* If a header has both Home pill + settings icon, keep pill aligned left of icon */
.screenHeaderRight .pillBtn{
margin-right:8px;
}

/* ==============================
Buttons
============================== */

.primaryBtn,
.ghostBtn,
.miniBtn,
.pillBtn,
.dangerBtn,
.iconBtn{
min-height:var(--touchTarget);
padding:0 18px;
border-radius:999px;
display:flex;
align-items:center;
justify-content:center;
font-weight:600;
box-shadow:var(--shadowInset);
}

.primaryBtn{
background:linear-gradient(180deg, #3a63a6, #24457e);
}

.ghostBtn{
background:rgba(255,255,255,.06);
}

.miniBtn{
min-height:42px;
font-size:14px;
background:rgba(255,255,255,.06);
}

.pillBtn{
background:rgba(255,255,255,.08);
}

.dangerBtn{
background:linear-gradient(180deg, #7a3340, #55222c);
}

.iconBtn{
width:var(--touchTarget);
padding:0;
background:rgba(255,255,255,.06);
}

/* ==============================
Home Panel
============================== */

.homeButtons{
display:flex;
flex-direction:column;
gap:14px;
flex:1;
min-height:0;
}

.homeRow{
display:flex;
flex-direction:row;
align-items:center;
justify-content:space-between; /* NEW: evenly space */
gap:12px;
}

/* NEW: 3-button row sizing (keeps a clean single row under Log) */
.homeRow > button{
flex:1 1 0;
min-width:0;
}

/* If a row has only 2 buttons (Install/Clear), keep it balanced as well */
.homeRow > button:only-child{
flex:0 0 auto;
}

.homeHint{
margin-top:auto;
font-size:14px;
color:var(--muted2);
}

.homeFooter{
display:flex;
justify-content:space-between;
font-size:13px;
color:var(--muted2);
margin-top:8px;
}

/* ==============================
Charts Panel
============================== */

.chartCard{
flex:1;
min-height:0;
border-radius:var(--radiusL);
background:rgba(10,16,30,.30);
box-shadow:var(--shadowInset);
padding:12px;
display:flex;
flex-direction:column;
overflow:hidden;
}

.chartWrap{
flex:1;
min-height:0;
position:relative;
border-radius:16px;
overflow:hidden;
background:rgba(0,0,0,.12);
}

#chartCanvas{
width:100%;
height:100%;
background:transparent;
}

.chartLegend{
margin-top:10px;
font-size:13px;
color:var(--muted);
}

/* ==============================
Log Panel
============================== */

.logList{
flex:1;
min-height:0;
overflow-y:auto;
}

.logEmpty{
text-align:center;
color:var(--muted2);
margin-top:20px;
}

/* ==============================
Settings Panel
============================== */

.settingsBody{
display:flex;
flex-direction:column;
gap:14px;
flex:1;
min-height:0;
}

.settingsCard{
padding:14px;
border-radius:var(--radiusM);
background:rgba(255,255,255,.05);
box-shadow:var(--shadowInset);
}

.settingsLine{
display:flex;
justify-content:space-between;
}

.muted{
color:var(--muted);
}

/* ==============================
Add Panel
============================== */

.addBody{
flex:1;
min-height:0;
display:flex;
align-items:center;
justify-content:center;
}

.addCard{
width:100%;
padding:18px;
border-radius:var(--radiusL);
background:rgba(255,255,255,.05);
box-shadow:var(--shadowInset);
display:flex;
flex-direction:column;
gap:12px;
}

.addCard input,
.addCard textarea,
.addBody input,
.addBody textarea{
width:100%;
padding:10px 12px;
border-radius:12px;
border:1px solid var(--stroke2);
background:rgba(10,16,30,.55);
color:var(--text);
box-shadow:var(--shadowInset);
}

.addCard input::placeholder,
.addCard textarea::placeholder,
.addBody input::placeholder,
.addBody textarea::placeholder{
color:rgba(235,245,255,.38);
}

.addForm{
display:block;
}

.addGrid{
display:flex;
flex-direction:column;
gap:10px;
}

.addField{
display:flex;
flex-direction:column;
gap:6px;
}

.addLabel{
font-size:14px;
color:var(--muted);
letter-spacing:.2px;
}

.addInput,
.addTextArea{
width:100%;
padding:10px 12px;
border-radius:12px;
border:1px solid var(--stroke2);
background:rgba(10,16,30,.55);
color:var(--text);
box-shadow:var(--shadowInset);
}

.addInput::placeholder,
.addTextArea::placeholder{
color:rgba(235,245,255,.38);
}

.addTextArea{
min-height:86px;
resize:vertical;
}

.addNotes{
margin-top:2px;
}

/* ==============================
Loading Pills / Spacers
============================== */

.loadingPill{
align-self:flex-start;
padding:6px 12px;
border-radius:999px;
font-size:13px;
background:rgba(255,255,255,.08);
color:var(--muted);
margin-bottom:8px;
}

.chartFooterSpacer,
.logFooterSpacer{
height:6px;
}

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: css/app.css
App Version Authority: js/version.js
Base: v2.026a
Pass: UI Layout Consistency (P1-L1)
Pass order: File 1 of 1
Prev file: (n/a)
Next file: (n/a)
*/
