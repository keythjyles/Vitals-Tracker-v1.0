// ClaimsGPT Frontend JS
// File: /claimsgpt/app.js
// Version: v1.0.0

const API_BASE = "https://lex-backend-y0bm.onrender.com";

const analyzeBtn = document.getElementById("analyzeBtn");
const docText = document.getElementById("docText");
const output = document.getElementById("output");
const statusBox = document.getElementById("status");

if (analyzeBtn) {
  analyzeBtn.addEventListener("click", async () => {
    const text = docText.value.trim();

    if (!text) {
      statusBox.textContent = "Paste some text first.";
      return;
    }

    analyzeBtn.disabled = true;
    statusBox.textContent = "Sending text to your Render server...";
    output.textContent = "Working...";

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      statusBox.textContent = "Analysis complete.";

      if (typeof data.result === "string") {
        output.textContent = data.result;
      } else {
        output.textContent = JSON.stringify(data, null, 2);
      }
    } catch (err) {
      statusBox.textContent = "Request failed.";
      output.textContent = err.message;
      console.error(err);
    } finally {
      analyzeBtn.disabled = false;
    }
  });
}
