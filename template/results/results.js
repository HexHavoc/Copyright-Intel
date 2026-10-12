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

const PLAY_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>';

function setText(id, value) {
  const el = document.getElementById(id);
  el.textContent = value;
  // Full text on hover for values that get truncated with an ellipsis
  el.title = value;
}

document.addEventListener('DOMContentLoaded', () => {
  const storedData = sessionStorage.getItem('auditResult');

  if (!storedData) {
    window.location.href = '../index.html';
    return;
  }

  let data;
  try {
    data = JSON.parse(storedData);
  } catch (e) {
    window.location.href = '../index.html';
    return;
  }

  const title = data.title || 'Untitled Track';
  setText('resTitle', title);
  setText('resChannel', data.channel ? `Uploaded by ${data.channel}` : 'Unknown Creator');
  document.title = `${title} | Analysis Report`;

  // Verdict: badge + panel accent colour (clear / verify / claim)
  const verdict = data.verdict || '';
  document.getElementById('verdictPanel').dataset.verdict = verdict;

  const badge = document.getElementById('verdictBadge');
  badge.className = `badge badge-${verdict}`;
  badge.textContent = '';
  const dot = document.createElement('i');
  dot.className = 'dot';
  badge.appendChild(dot);
  badge.appendChild(document.createTextNode(data.badge_text || ''));

  document.getElementById('verdictMessage').textContent = data.message || '';
  setText('genreVal', data.genre || 'Unspecified');
  setText('licenseVal', data.license_note || 'Standard License');

  if (data.published_date) {
    const formattedDate = new Date(data.published_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    setText('publishedVal', formattedDate);
  } else {
    setText('publishedVal', 'Unknown');
  }

  const categoryName = YOUTUBE_CATEGORIES[data.category_id] || `ID #${data.category_id}`;
  setText('categoryVal', categoryName);

  setText('kidsVal', data.made_for_kids
    ? 'Designed specifically for Children (COPPA strict)'
    : 'Standard Audience / General Content');

  // Recommendations
  const recsWrap = document.getElementById('recsWrap');
  const recsList = document.getElementById('recsList');
  const recsEmpty = document.getElementById('recsEmpty');
  const recsCount = document.getElementById('recsCount');
  recsList.innerHTML = '';

  const recs = Array.isArray(data.recommendations)
    ? data.recommendations.filter(r => r && /^https?:\/\//i.test(r.url || ''))
    : [];

  if (recs.length > 0) {
    recsWrap.classList.remove('hidden');
    recsEmpty.classList.add('hidden');
    recsCount.textContent = `${recs.length} found`;
    recsCount.classList.remove('hidden');

    recs.forEach((rec, i) => {
      const row = document.createElement('a');
      row.href = rec.url;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
      row.className = 'rec-row';
      row.style.animationDelay = `${i * 60}ms`;

      const info = document.createElement('div');
      info.className = 'rec-info';

      const play = document.createElement('span');
      play.className = 'rec-play';
      play.innerHTML = PLAY_ICON;

      const text = document.createElement('div');
      const recTitle = document.createElement('p');
      recTitle.className = 'rec-title';
      recTitle.textContent = rec.title || 'Untitled';
      const recChannel = document.createElement('p');
      recChannel.className = 'rec-channel';
      recChannel.textContent = rec.channel || '';
      text.appendChild(recTitle);
      text.appendChild(recChannel);

      info.appendChild(play);
      info.appendChild(text);

      const tag = document.createElement('span');
      tag.className = 'rec-free-tag';
      tag.textContent = 'COPYRIGHT FREE';

      row.appendChild(info);
      row.appendChild(tag);
      recsList.appendChild(row);
    });
  } else {
    recsWrap.classList.add('hidden');
    recsCount.classList.add('hidden');
    recsEmpty.classList.remove('hidden');

    const emptyTitle = document.getElementById('recsEmptyTitle');
    const emptyText = document.getElementById('recsEmptyText');

    if (verdict === 'clear') {
      emptyTitle.textContent = 'No replacement needed';
      emptyText.textContent = 'This track looks safe to use, so no alternatives were suggested.';
      emptyText.classList.remove('hidden');
    } else {
      emptyTitle.textContent = 'No alternatives found';
      emptyText.textContent = '';
      emptyText.classList.add('hidden');
    }
  }
});