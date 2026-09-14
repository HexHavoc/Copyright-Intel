const API_BASE = "http://127.0.0.1:8000";

const checkBtn = document.getElementById('checkBtn');
const urlInput = document.getElementById('urlInput');
const micBtn = document.getElementById('micBtn');
const micStatus = document.getElementById('micStatus');
const micSeconds = document.getElementById('micSeconds');
const waveformWrap = document.getElementById('waveformWrap');
const errorMsg = document.getElementById('errorMsg');
const urlPanel = document.getElementById('urlPanel');
const micPanel = document.getElementById('micPanel');
const modeTabs = document.querySelectorAll('.mode-tab');

let currentMode = 'url';

function buildWaveform() {
  const bars = Array.from({ length: 42 }).map((_, i) => {
    const h = 10 + Math.round(Math.sin(i * 0.7) * 10 + Math.random() * 14);
    const delay = (i * 0.035).toFixed(2);
    return `<span style="height:${h}px; animation-delay:${delay}s"></span>`;
  }).join('');
  waveformWrap.innerHTML = bars;
}
buildWaveform();

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove('hidden');
  waveformWrap.className = 'waveform state-idle';
}

function hideError() {
  errorMsg.classList.add('hidden');
}

// ---------- Mode switching (URL vs. Listen) ----------

function setMode(mode) {
  currentMode = mode;
  hideError();
  waveformWrap.className = 'waveform state-idle';

  modeTabs.forEach(tab => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  urlPanel.classList.toggle('hidden', mode !== 'url');
  micPanel.classList.toggle('hidden', mode !== 'mic');
}

modeTabs.forEach(tab => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});

// ---------- URL check flow ----------

async function runCheck() {
  const url = urlInput.value.trim();
  if (!url) {
    urlInput.focus();
    return;
  }

  hideError();
  checkBtn.disabled = true;
  checkBtn.querySelector('span').textContent = "Analyzing...";
  waveformWrap.className = 'waveform state-active';

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

    sessionStorage.setItem('auditResult', JSON.stringify(data));
    window.location.href = 'results/results.html';

  } catch (err) {
    showError(err.message || "Failed to reach backend server on port 8000.");
  } finally {
    checkBtn.disabled = false;
    checkBtn.querySelector('span').textContent = "Analyze Track";
  }
}

checkBtn.addEventListener('click', runCheck);
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runCheck();
});

// ---------- Mic recognition flow ----------

async function runRecognize() {
  const seconds = micSeconds.value;

  hideError();
  micBtn.disabled = true;
  micBtn.classList.add('listening');
  micSeconds.disabled = true;
  micStatus.textContent = `Listening... (${seconds}s)`;
  waveformWrap.className = 'waveform state-listening';

  try {
    const response = await fetch(`${API_BASE}/api/recognize?seconds=${seconds}`, {
      method: "POST"
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Request failed (${response.status})`);
    }

    const data = await response.json();

    sessionStorage.setItem('auditResult', JSON.stringify(data));
    window.location.href = 'results/results.html';

  } catch (err) {
    showError(err.message || "Failed to reach backend server on port 8000.");
    micStatus.textContent = "Tap to listen";
  } finally {
    micBtn.disabled = false;
    micBtn.classList.remove('listening');
    micSeconds.disabled = false;
  }
}

micBtn.addEventListener('click', runRecognize);