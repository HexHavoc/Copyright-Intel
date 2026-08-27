// Point this at wherever your FastAPI backend runs.
// Run backend.py with: uvicorn backend:app --reload --port 8000
const API_BASE = "http://127.0.0.1:8000";

const checkBtn = document.getElementById('checkBtn');
const urlInput = document.getElementById('urlInput');
const waveformWrap = document.getElementById('waveformWrap');
const results = document.getElementById('results');
const errorMsg = document.getElementById('errorMsg');

// Build the waveform bars once on load (organic heights/delays)
function buildWaveform() {
  const bars = Array.from({ length: 40 }).map((_, i) => {
    const h = 10 + Math.round(Math.sin(i * 0.7) * 10 + Math.random() * 14);
    const delay = (i * 0.035).toFixed(2);
    return `<span style="height:${h}px; animation-delay:${delay}s"></span>`;
  }).join('');
  waveformWrap.innerHTML = bars;
}
buildWaveform();

function setWaveformState(state) {
  waveformWrap.className = `waveform mb-10 state-${state}`;
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove('hidden');
  results.classList.add('hidden');
  setWaveformState('idle');
}

function hideError() {
  errorMsg.classList.add('hidden');
}

function renderResult(data) {
  document.getElementById('resTitle').textContent = data.title;
  document.getElementById('resChannel').textContent = data.channel;

  const badge = document.getElementById('verdictBadge');
  badge.textContent = data.badge_text;
  badge.className = `badge badge-${data.verdict}`;

  document.getElementById('verdictMessage').textContent = data.message;
  document.getElementById('genreTag').textContent = data.genre ? `Genre: ${data.genre}` : 'Genre: Unknown';
  document.getElementById('licenseTag').textContent = data.license_note;

  const recsWrap = document.getElementById('recsWrap');
  const recsList = document.getElementById('recsList');
  recsList.innerHTML = '';

  if (data.recommendations && data.recommendations.length) {
    recsWrap.classList.remove('hidden');
    data.recommendations.forEach(rec => {
      const row = document.createElement('a');
      row.href = rec.url;
      row.target = "_blank";
      row.rel = "noopener noreferrer";
      row.className = "rec-row";
      row.innerHTML = `
        <div class="rec-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <div>
            <p class="rec-title">${rec.title}</p>
            <p class="rec-channel">${rec.channel}</p>
          </div>
        </div>
        <span class="rec-free-tag">FREE</span>
      `;
      recsList.appendChild(row);
    });
  } else {
    recsWrap.classList.add('hidden');
  }

  results.classList.remove('hidden');
}

async function runCheck() {
  const url = urlInput.value.trim();
  if (!url) { urlInput.focus(); return; }

  hideError();
  results.classList.add('hidden');
  checkBtn.disabled = true;
  checkBtn.textContent = "Checking...";
  setWaveformState('idle');
  waveformWrap.classList.add('state-idle');

  try {
    const response = await fetch(`${API_BASE}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Request failed (${response.status})`);
    }

    const data = await response.json();
    setWaveformState(data.verdict); // "clear" | "verify" | "claim"
    renderResult(data);

  } catch (err) {
    showError(err.message || "Something went wrong. Is the backend running on port 8000?");
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = "Check";
  }
}

checkBtn.addEventListener('click', runCheck);
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runCheck();
});