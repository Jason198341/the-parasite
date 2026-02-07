// The Parasite v0.5 — Popup (Weekly Report + Evolution + Achievements)

import type { DayData, EvolutionState, AchievementId } from '../shared/types';
import { EVOLUTION, ACHIEVEMENTS } from '../shared/constants';
import { safeGet, getDateKey } from '../shared/storage';

const DAYS_KO = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0'];

function formatMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return m + '\uBD84';
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return h + '\uC2DC\uAC04 ' + rm + '\uBD84';
}

function getWeekDates(offset: number = 0): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
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
  try {
    const result = await safeGet(keys);
    return dates.map((date, i) => ({
      date,
      data: result[keys[i]] ?? { shorts: 0, seconds: 0 },
    }));
  } catch {
    return dates.map((date) => ({ date, data: { shorts: 0, seconds: 0 } }));
  }
}

async function loadEvolution(): Promise<EvolutionState> {
  try {
    const result = await safeGet(['p_evolution']);
    return result.p_evolution ?? { level: 0, streak: 0 };
  } catch {
    return { level: 0, streak: 0 };
  }
}

async function loadAchievements(): Promise<AchievementId[]> {
  try {
    const result = await safeGet(['p_achievements']);
    return result.p_achievements ?? [];
  } catch {
    return [];
  }
}

async function render() {
  const [thisWeek, lastWeek, evo, unlockedArr] = await Promise.all([
    loadWeekData(0),
    loadWeekData(-1),
    loadEvolution(),
    loadAchievements(),
  ]);
  const unlocked = new Set(unlockedArr);

  const today = new Date();
  const todayKey = getDateKey(today);
  const todayEntry = thisWeek.find((d) => getDateKey(d.date) === todayKey);
  const todayData = todayEntry?.data ?? { shorts: 0, seconds: 0 };

  // --- Evolution ---
  const evoInfo = EVOLUTION[evo.level] ?? EVOLUTION[0];
  const evoEmoji = document.getElementById('evoEmoji');
  const evoName = document.getElementById('evoName');
  const evoStreak = document.getElementById('evoStreak');
  const evoNext = document.getElementById('evoNext');
  if (evoEmoji) evoEmoji.textContent = evoInfo.emoji;
  if (evoName) evoName.textContent = 'Lv.' + evoInfo.level + ' ' + evoInfo.name;
  if (evoStreak) evoStreak.textContent = evo.streak > 0
    ? '\u{1F525} ' + evo.streak + '\uC77C \uC5F0\uC18D'
    : '\uC2A4\uD2B8\uB9AD \uC5C6\uC74C';
  if (evoNext) evoNext.textContent = evoInfo.next;

  // --- Today ---
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
        </div>`;
    }).join('');
  }

  // --- Summary ---
  const thisWeekTotal = thisWeek.reduce((s, d) => s + d.data.shorts, 0);
  const thisWeekSecs = thisWeek.reduce((s, d) => s + d.data.seconds, 0);
  const lastWeekTotal = lastWeek.reduce((s, d) => s + d.data.shorts, 0);

  const weekTotalEl = document.getElementById('weekTotal');
  const weekTimeEl = document.getElementById('weekTime');
  const weekDiffEl = document.getElementById('weekDiff');

  if (weekTotalEl) weekTotalEl.textContent = thisWeekTotal + '\uAC1C';
  if (weekTimeEl) weekTimeEl.textContent = formatMinutes(thisWeekSecs);
  if (weekDiffEl) {
    if (lastWeekTotal === 0) {
      weekDiffEl.textContent = '\uC9C0\uB09C\uC8FC \uB370\uC774\uD130 \uC5C6\uC74C';
      weekDiffEl.className = '';
    } else {
      const diff = thisWeekTotal - lastWeekTotal;
      const pct = Math.round((diff / lastWeekTotal) * 100);
      if (diff > 0) {
        weekDiffEl.textContent = '+' + diff + '\uAC1C (' + pct + '%)';
        weekDiffEl.className = 'diff-up';
      } else if (diff < 0) {
        weekDiffEl.textContent = diff + '\uAC1C (' + pct + '%)';
        weekDiffEl.className = 'diff-down';
      } else {
        weekDiffEl.textContent = '\uB3D9\uC77C';
        weekDiffEl.className = '';
      }
    }
  }

  // --- Achievements (uses shared ACHIEVEMENTS — fixes #16) ---
  const gridEl = document.getElementById('achievementGrid');
  if (gridEl) {
    gridEl.innerHTML = ACHIEVEMENTS.map((ach) => {
      const isUnlocked = unlocked.has(ach.id);
      return `
        <div class="ach ${isUnlocked ? 'ach--unlocked' : 'ach--locked'}">
          <div class="ach__emoji">${ach.emoji}</div>
          <div class="ach__title">${isUnlocked ? ach.title : '???'}</div>
        </div>`;
    }).join('');
  }

  // Hide loading indicator
  const footer = document.getElementById('footer');
  if (footer) footer.textContent = '\uC8FC\uAC04 \uB514\uC9C0\uD138 \uBA74\uC5ED \uB9AC\uD3EC\uD2B8';
}

document.addEventListener('DOMContentLoaded', () => {
  // Timeout for hung promises (fixes #11)
  const timeout = setTimeout(() => {
    const footer = document.getElementById('footer');
    if (footer) footer.textContent = '\uB370\uC774\uD130 \uB85C\uB4DC \uC2E4\uD328';
  }, 5000);

  render()
    .catch((e) => {
      console.error('\u{1F9A0} Popup error:', e);
      const footer = document.getElementById('footer');
      if (footer) footer.textContent = '\uB80C\uB354\uB9C1 \uC624\uB958';
    })
    .finally(() => clearTimeout(timeout));
});
