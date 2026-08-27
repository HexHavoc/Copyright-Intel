const API_BASE = "http://127.0.0.1:8000";

const checkBtn = document.getElementById('checkBtn');
const urlInput = document.getElementById('urlInput');
const waveformWrap = document.getElementById('waveformWrap');
const results = document.getElementById('results');
const errorMsg = document.getElementById('errorMsg');

const YOUTUBE_CATEGORIES = {
  "1": "Film & Animation",
  "2": "Autos & Vehicles",
  "10": "Music",
  "15": "Pets & Animals",
  "17": "Sports",
  "19": "Travel & Events",
  "20": "Gaming",
  "22": "People & Blogs",
  "23": "Comedy",
  "24": "Entertainment",
  "25": "News & Politics",
  "26": "Howto & Style",
  "27": "Education",
  "28": "Science & Technology",
  "29": "Nonprofits & Activism"
};

function buildWaveform() {
  const bars = Array.from({ length: 42 }).map((_, i) => {
    const h = 10 + Math.round(Math.sin(i * 0.7) * 10 + Math.random() * 14);
    const delay = (i * 0.035).toFixed(2);
    return `<span style="height:${h}px; animation-delay:${delay}s"></span>`;
  }).join('');
  waveformWrap.innerHTML = bars;
}
buildWaveform();

function setWaveformState(state) {
  waveformWrap.className = `waveform state-${state}`;
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
  // Title and Channel Information
  document.getElementById('resTitle').textContent = data.title || 'Untitled Track';
  document.getElementById('resChannel').textContent = data.channel ? `Uploaded by ${data.channel}` : 'Unknown Creator';

  // Badge Status
  const badge = document.getElementById('verdictBadge');
  badge.innerHTML = `<i class="dot"></i>${data.badge_text}`;
  badge.className = `badge badge-${data.verdict}`;

  // Verdict Explanation Message
  document.getElementById('verdictMessage').textContent = data.message;

  // Metadata Grid Population
  document.getElementById('genreVal').textContent = data.genre || 'Unspecified';
  document.getElementById('licenseVal').textContent = data.license_note || 'Standard License';

  if (data.published_date) {
    const formattedDate = new Date(data.published_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    document.getElementById('publishedVal').textContent = formattedDate;
  } else {
    document.getElementById('publishedVal').textContent = 'Unknown';
  }

  const categoryName = YOUTUBE_CATEGORIES[data.category_id] || `ID #${data.category_id}`;
  document.getElementById('categoryVal').textContent = categoryName;

  document.getElementById('kidsVal').textContent = data.made_for_kids
    ? 'Designed specifically for Children (COPPA strict)'
    : 'Standard Audience / General Content';

  // Alternative Recommendations
  const recsWrap = document.getElementById('recsWrap');
  const recsList = document.getElementById('recsList');
  recsList.innerHTML = '';

  if (data.recommendations && data.recommendations.length > 0) {
    recsWrap.classList.remove('hidden');
    data.recommendations.forEach(rec => {
      const row = document.createElement('a');
      row.href = rec.url;
      row.target = "_blank";
      row.rel = "noopener noreferrer";
      row.className = "rec-row";
      row.innerHTML = `
        <div class="rec-info">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <div>
            <p class="rec-title">${rec.title}</p>
            <p class="rec-channel">${rec.channel}</p>
          </div>
        </div>
        <span class="rec-free-tag">ROYALTY FREE</span>
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
  if (!url) {
    urlInput.focus();
    return;
  }

  hideError();
  results.classList.add('hidden');
  checkBtn.disabled = true;
  checkBtn.querySelector('span').textContent = "Analyzing...";
  setWaveformState('idle');

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
    setWaveformState(data.verdict);
    renderResult(data);
  } catch (err) {
    showError(err.message || "Failed to reach server. Ensure FastAPI is running on port 8000.");
  } finally {
    checkBtn.disabled = false;
    checkBtn.querySelector('span').textContent = "Analyze Track";
  }
}

checkBtn.addEventListener('click', runCheck);
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runCheck();
});