const API_BASE = "http://127.0.0.1:8000";

const moodInput = document.getElementById('moodInput');
const discoverBtn = document.getElementById('discoverBtn');
const waveformWrap = document.getElementById('waveformWrap');
const errorMsg = document.getElementById('errorMsg');
const resultsWrap = document.getElementById('resultsWrap');
const resultsHeading = document.getElementById('resultsHeading');
const resultsList = document.getElementById('resultsList');
const emptyState = document.getElementById('emptyState');
const chips = document.querySelectorAll('.chip');

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

function renderResults(data) {
  resultsList.innerHTML = '';

  if (!data.results.length) {
    resultsWrap.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  resultsWrap.classList.remove('hidden');
  resultsHeading.textContent = `Safe tracks for "${data.mood}"`;

  data.results.forEach(track => {
    const row = document.createElement('a');
    row.href = track.url;
    row.target = "_blank";
    row.rel = "noopener noreferrer";
    row.className = "rec-row";
    row.innerHTML = `
      <div class="rec-info">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <div style="min-width:0;">
          <p class="rec-title">${track.title}</p>
          <p class="rec-channel">${track.channel}</p>
        </div>
      </div>
      <span class="badge badge-${track.verdict}"><i class="dot"></i>${track.badge_text}</span>
    `;
    resultsList.appendChild(row);
  });
}

async function runDiscover(mood) {
  if (!mood || !mood.trim()) {
    moodInput.focus();
    return;
  }

  hideError();
  emptyState.classList.add('hidden');
  resultsWrap.classList.add('hidden');
  discoverBtn.disabled = true;
  discoverBtn.querySelector('span').textContent = "Searching...";
  waveformWrap.className = 'waveform state-active';

  try {
    const response = await fetch(`${API_BASE}/api/discover?mood=${encodeURIComponent(mood)}`);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Request failed (${response.status})`);
    }

    const data = await response.json();
    waveformWrap.className = 'waveform state-idle';
    renderResults(data);

  } catch (err) {
    showError(err.message || "Failed to reach backend server on port 8000.");
  } finally {
    discoverBtn.disabled = false;
    discoverBtn.querySelector('span').textContent = "Discover";
  }
}

discoverBtn.addEventListener('click', () => runDiscover(moodInput.value.trim()));
moodInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runDiscover(moodInput.value.trim());
});

chips.forEach(chip => {
  chip.addEventListener('click', () => {
    moodInput.value = chip.dataset.mood;
    runDiscover(chip.dataset.mood);
  });
});