// The Parasite v0.4 — Weekly Report + Evolution + Achievements Popup

interface DayData {
  shorts: number;
  seconds: number;
}

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

const EVOLUTION = [
  { level: 0, emoji: '🥚', name: '알', next: '1일 10개 미만으로 유충 진화' },
  { level: 1, emoji: '🐛', name: '유충', next: '3일 연속 10개 미만으로 도마뱀 진화' },
  { level: 2, emoji: '🦎', name: '도마뱀', next: '7일 연속 10개 미만으로 문어 진화' },
  { level: 3, emoji: '🐙', name: '문어', next: '14일 연속 10개 미만으로 드래곤 진화' },
  { level: 4, emoji: '🐉', name: '드래곤', next: '30일 연속 10개 미만으로 기생왕 진화' },
  { level: 5, emoji: '👑', name: '기생왕', next: '최종 진화 달성!' },
];

const ACHIEVEMENTS = [
  { id: 'first_blood', emoji: '🩸', title: '첫 감염' },
  { id: 'algorithm_slave', emoji: '⛓️', title: '알고리즘의 노예' },
  { id: 'zombie', emoji: '🧟', title: '새벽 좀비' },
  { id: 'iron_will', emoji: '🪨', title: '철의 의지' },
  { id: 'century', emoji: '💀', title: '센추리' },
  { id: 'quick_escape', emoji: '🏃', title: '배반자' },
  { id: 'evolved', emoji: '🦎', title: '진화 시작' },
  { id: 'dragon', emoji: '🐉', title: '드래곤' },
  { id: 'king', emoji: '👑', title: '기생왕' },
];

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

async function loadEvolution(): Promise<{ level: number; streak: number }> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['p_evolution'], (result) => {
      resolve(result.p_evolution || { level: 0, streak: 0 });
    });
  });
}

async function loadAchievements(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['p_achievements'], (result) => {
      resolve(result.p_achievements || []);
    });
  });
}

async function render() {
  const thisWeek = await loadWeekData(0);
  const lastWeek = await loadWeekData(-1);
  const evo = await loadEvolution();
  const unlocked = new Set(await loadAchievements());

  const today = new Date();
  const todayKey = getDateKey(today);
  const todayEntry = thisWeek.find((d) => getDateKey(d.date) === todayKey);
  const todayData = todayEntry?.data || { shorts: 0, seconds: 0 };

  // --- Evolution section ---
  const evoInfo = EVOLUTION[evo.level] || EVOLUTION[0];
  const evoEmoji = document.getElementById('evoEmoji');
  const evoName = document.getElementById('evoName');
  const evoStreak = document.getElementById('evoStreak');
  const evoNext = document.getElementById('evoNext');
  if (evoEmoji) evoEmoji.textContent = evoInfo.emoji;
  if (evoName) evoName.textContent = 'Lv.' + evoInfo.level + ' ' + evoInfo.name;
  if (evoStreak) evoStreak.textContent = evo.streak > 0 ? '🔥 ' + evo.streak + '일 연속' : '스트릭 없음';
  if (evoNext) evoNext.textContent = evoInfo.next;

  // --- Today section ---
  const todayCountEl = document.getElementById('todayCount');
  const todayTimeEl = document.getElementById('todayTime');
  const todaySection = document.getElementById('today');
  if (todayCountEl) todayCountEl.textContent = String(todayData.shorts);
  if (todayTimeEl) todayTimeEl.textContent = formatMinutes(todayData.seconds);

  if (todaySection) {
    if (todayData.shorts >= 30) todaySection.className = 'today danger';
    else if (todayData.shorts >= 10) todaySection.className = 'today warn';
    else todaySection.className = 'today';
  }

  // --- Weekly chart ---
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

  // --- Summary ---
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
        weekDiffEl.textContent = '+' + diff + '개 (' + pct + '%)';
        weekDiffEl.className = 'diff-up';
      } else if (diff < 0) {
        weekDiffEl.textContent = diff + '개 (' + pct + '%)';
        weekDiffEl.className = 'diff-down';
      } else {
        weekDiffEl.textContent = '동일';
        weekDiffEl.className = '';
      }
    }
  }

  // --- Achievements ---
  const gridEl = document.getElementById('achievementGrid');
  if (gridEl) {
    gridEl.innerHTML = ACHIEVEMENTS.map((ach) => {
      const isUnlocked = unlocked.has(ach.id);
      return `
        <div class="ach ${isUnlocked ? 'ach--unlocked' : 'ach--locked'}">
          <div class="ach__emoji">${ach.emoji}</div>
          <div class="ach__title">${isUnlocked ? ach.title : '???'}</div>
        </div>
      `;
    }).join('');
  }
}

document.addEventListener('DOMContentLoaded', render);
