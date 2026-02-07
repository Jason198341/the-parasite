// The Parasite — Weekly Report Popup

interface DayData {
  shorts: number;
  seconds: number;
}

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function getDateKey(date: Date): string {
  return 'p_day_' + date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function formatMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return m + '분';
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return h + '시간 ' + rm + '분';
}

function getWeekDates(offset: number = 0): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + (offset * 7));

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

async function loadWeekData(offset: number): Promise<{ date: Date; data: DayData }[]> {
  const dates = getWeekDates(offset);
  const keys = dates.map(getDateKey);

  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(dates.map((date, i) => ({
        date,
        data: result[keys[i]] || { shorts: 0, seconds: 0 },
      })));
    });
  });
}

async function render() {
  const thisWeek = await loadWeekData(0);
  const lastWeek = await loadWeekData(-1);

  const today = new Date();
  const todayKey = getDateKey(today);
  const todayEntry = thisWeek.find((d) => getDateKey(d.date) === todayKey);
  const todayData = todayEntry?.data || { shorts: 0, seconds: 0 };

  // Today section
  const todayCountEl = document.getElementById('todayCount');
  const todayTimeEl = document.getElementById('todayTime');
  const todaySection = document.getElementById('today');
  if (todayCountEl) todayCountEl.textContent = String(todayData.shorts);
  if (todayTimeEl) todayTimeEl.textContent = formatMinutes(todayData.seconds);

  // Color today based on count
  if (todaySection) {
    if (todayData.shorts >= 30) todaySection.className = 'today danger';
    else if (todayData.shorts >= 10) todaySection.className = 'today warn';
    else todaySection.className = 'today';
  }

  // Weekly chart
  const maxShorts = Math.max(...thisWeek.map((d) => d.data.shorts), 1);
  const chartEl = document.getElementById('weekChart');
  if (chartEl) {
    chartEl.innerHTML = thisWeek.map((entry) => {
      const dayIdx = entry.date.getDay();
      const dayLabel = DAYS_KO[dayIdx];
      const pct = Math.round((entry.data.shorts / maxShorts) * 100);
      const isToday = getDateKey(entry.date) === todayKey;
      const isFuture = entry.date > today;
      let barClass = 'bar__fill';
      if (entry.data.shorts >= 30) barClass += ' danger';
      else if (entry.data.shorts >= 10) barClass += ' warn';

      return `
        <div class="bar ${isToday ? 'bar--today' : ''} ${isFuture ? 'bar--future' : ''}">
          <div class="bar__count">${isFuture ? '' : entry.data.shorts}</div>
          <div class="bar__track">
            <div class="${barClass}" style="height: ${isFuture ? 0 : pct}%"></div>
          </div>
          <div class="bar__label">${dayLabel}</div>
        </div>
      `;
    }).join('');
  }

  // Summary
  const thisWeekTotal = thisWeek.reduce((s, d) => s + d.data.shorts, 0);
  const thisWeekSecs = thisWeek.reduce((s, d) => s + d.data.seconds, 0);
  const lastWeekTotal = lastWeek.reduce((s, d) => s + d.data.shorts, 0);

  const weekTotalEl = document.getElementById('weekTotal');
  const weekTimeEl = document.getElementById('weekTime');
  const weekDiffEl = document.getElementById('weekDiff');

  if (weekTotalEl) weekTotalEl.textContent = thisWeekTotal + '개';
  if (weekTimeEl) weekTimeEl.textContent = formatMinutes(thisWeekSecs);

  if (weekDiffEl) {
    if (lastWeekTotal === 0) {
      weekDiffEl.textContent = '지난주 데이터 없음';
      weekDiffEl.className = '';
    } else {
      const diff = thisWeekTotal - lastWeekTotal;
      const pct = Math.round((diff / lastWeekTotal) * 100);
      if (diff > 0) {
        weekDiffEl.textContent = '+' + diff + '개 (' + pct + '%) 📈';
        weekDiffEl.className = 'diff-up';
      } else if (diff < 0) {
        weekDiffEl.textContent = diff + '개 (' + pct + '%) 📉';
        weekDiffEl.className = 'diff-down';
      } else {
        weekDiffEl.textContent = '동일';
        weekDiffEl.className = '';
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', render);
