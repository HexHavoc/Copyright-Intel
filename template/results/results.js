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

document.addEventListener('DOMContentLoaded', () => {
  const storedData = sessionStorage.getItem('auditResult');

  if (!storedData) {

    window.location.href = '../index.html';
    return;
  }

  const data = JSON.parse(storedData);

  document.getElementById('resTitle').textContent = data.title || 'Untitled Track';
  document.getElementById('resChannel').textContent = data.channel ? `Uploaded by ${data.channel}` : 'Unknown Creator';

  const badge = document.getElementById('verdictBadge');
  badge.innerHTML = `<i class="dot"></i>${data.badge_text}`;
  badge.className = `badge badge-${data.verdict}`;

  document.getElementById('verdictMessage').textContent = data.message;
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
        <span class="rec-free-tag">COPYRIGHT FREE</span>
      `;
      recsList.appendChild(row);
    });
  } else {
    recsWrap.classList.add('hidden');
  }
});