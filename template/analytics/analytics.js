Chart.defaults.maintainAspectRatio = false;

const API_BASE = "http://127.0.0.1:8000";

const CHART_COLORS = {
  signal: "#31E096",
  verify: "#FFAE33",
  claim: "#FF526C",
  accent: "#6380FF",
  dim: "#596173",
};

function badgeClass(verdict) {
  return `badge-${verdict}`;
}

function formatDay(isoDay) {
  const d = new Date(isoDay + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function loadAnalytics() {
  const response = await fetch(`${API_BASE}/api/analytics`);
  if (!response.ok) throw new Error("Couldn't load analytics.");
  return response.json();
}

function renderStats(data) {
  document.getElementById('statTotal').textContent = data.total_checks;
  document.getElementById('statClear').textContent = data.verdict_counts.clear || 0;
  document.getElementById('statVerify').textContent = data.verdict_counts.verify || 0;
  document.getElementById('statClaim').textContent = data.verdict_counts.claim || 0;
  document.getElementById('statDiscoveries').textContent = data.total_discoveries || 0;
  document.getElementById('statAvgResults').textContent = data.avg_results_per_discovery || 0;
}



function renderMoodChart(data) {
  const ctx = document.getElementById('moodChart');
  const moods = data.top_moods && data.top_moods.length
    ? data.top_moods
    : [{ mood: "No searches yet", count: 0 }];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: moods.map(m => m.mood),
      datasets: [{
        data: moods.map(m => m.count),
        backgroundColor: CHART_COLORS.signal,
        borderRadius: 6,
        maxBarThickness: 28,
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#596173', font: { family: 'JetBrains Mono', size: 10 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#949BAE', font: { family: 'Plus Jakarta Sans', size: 12 } }, grid: { display: false } },
      }
    }
  });
}

function renderVerdictChart(data) {
  const ctx = document.getElementById('verdictChart');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Not Copyrighted', 'Verify Terms', 'Copyrighted'],
      datasets: [{
        data: [
          data.verdict_counts.clear || 0,
          data.verdict_counts.verify || 0,
          data.verdict_counts.claim || 0,
        ],
        backgroundColor: [CHART_COLORS.signal, CHART_COLORS.verify, CHART_COLORS.claim],
        borderWidth: 0,
      }]
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { color: '#949BAE', font: { family: 'JetBrains Mono', size: 11 }, padding: 16 } } },
      cutout: '68%',
    }
  });
}

function renderGenreChart(data) {
  const ctx = document.getElementById('genreChart');
  const genres = data.top_genres.length ? data.top_genres : [{ genre: "No data yet", count: 0 }];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: genres.map(g => g.genre),
      datasets: [{
        data: genres.map(g => g.count),
        backgroundColor: CHART_COLORS.accent,
        borderRadius: 6,
        maxBarThickness: 28,
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#596173', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#949BAE', font: { family: 'Plus Jakarta Sans', size: 12 } }, grid: { display: false } },
      }
    }
  });
}

function renderTrendChart(data) {
  const ctx = document.getElementById('trendChart');
  const days = data.checks_per_day;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(d => formatDay(d.day)),
      datasets: [{
        data: days.map(d => d.count),
        borderColor: CHART_COLORS.accent,
        backgroundColor: 'rgba(99, 128, 255, 0.12)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: CHART_COLORS.accent,
        pointRadius: 4,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#596173', font: { family: 'JetBrains Mono', size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#596173', font: { family: 'JetBrains Mono', size: 10 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
      }
    }
  });
}

function renderRecentChecks(data) {
  const list = document.getElementById('recentList');
  list.innerHTML = '';

  data.recent_checks.forEach(check => {
    const row = document.createElement('div');
    row.className = "rec-row";
    const when = new Date(check.checked_at).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
    const sourceIcon = check.source === "microphone" ? "🎙" : "🔗";

    row.innerHTML = `
      <div class="rec-info">
        <span style="flex-shrink:0;">${sourceIcon}</span>
        <div style="min-width:0;">
          <p class="rec-title">${check.title}</p>
          <p class="rec-channel">${check.channel} · ${when}</p>
        </div>
      </div>
      <span class="badge ${badgeClass(check.verdict)}"><i class="dot"></i>${check.verdict}</span>
    `;
    list.appendChild(row);
  });
}

async function init() {
  try {
    const data = await loadAnalytics();

    if (data.total_checks === 0 && data.total_discoveries === 0) {
      document.getElementById('emptyState').classList.remove('hidden');
      document.getElementById('analyticsContent').classList.add('hidden');
      return;
    }

    renderStats(data);
    renderVerdictChart(data);
    renderGenreChart(data);
    renderTrendChart(data);
    renderRecentChecks(data);
    renderMoodChart(data);

  } catch (err) {
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('emptyState').innerHTML = `<p>Couldn't load analytics — is the backend running on port 8000?</p>`;
    document.getElementById('analyticsContent').classList.add('hidden');
  }
}

init();