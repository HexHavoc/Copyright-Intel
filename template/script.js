const API_BASE = "http://127.0.0.1:8000";

const checkBtn = document.getElementById('checkBtn');
const urlInput = document.getElementById('urlInput');
const waveformWrap = document.getElementById('waveformWrap');
const errorMsg = document.getElementById('errorMsg');

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