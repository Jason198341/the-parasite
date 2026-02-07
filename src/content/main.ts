// The Parasite v0.4 — Tamagotchi + Achievements + Lockdown

(function () {
  if (!window.location.hostname.includes('youtube.com')) return;
  if (document.getElementById('parasite-box')) return;

  // === STATE ===
  let shortsCount = 0;
  let lastShortsId = '';
  let startTime = Date.now();
  let isLocked = false;
  let lockdownsEndured = 0;
  let shortsEnteredAt = 0;

  // === EVOLUTION SYSTEM ===
  const EVOLUTION = [
    { level: 0, emoji: '🥚', name: '알', need: '기본' },
    { level: 1, emoji: '🐛', name: '유충', need: '1일 10개 미만' },
    { level: 2, emoji: '🦎', name: '도마뱀', need: '3일 연속 10개 미만' },
    { level: 3, emoji: '🐙', name: '문어', need: '7일 연속 10개 미만' },
    { level: 4, emoji: '🐉', name: '드래곤', need: '14일 연속 10개 미만' },
    { level: 5, emoji: '👑', name: '기생왕', need: '30일 연속 10개 미만' },
  ];

  let evoLevel = 0;
  let evoStreak = 0;

  // === ACHIEVEMENTS ===
  interface Achievement {
    id: string;
    emoji: string;
    title: string;
    desc: string;
    check: () => boolean;
  }

  const unlockedSet = new Set<string>();

  const ACHIEVEMENTS: Achievement[] = [
    {
      id: 'first_blood',
      emoji: '🩸',
      title: '첫 감염',
      desc: '기생충과 함께한 첫 쇼츠',
      check: () => shortsCount >= 1,
    },
    {
      id: 'algorithm_slave',
      emoji: '⛓️',
      title: '알고리즘의 노예',
      desc: '하루 50개 쇼츠 달성',
      check: () => shortsCount >= 50,
    },
    {
      id: 'zombie',
      emoji: '🧟',
      title: '새벽 좀비',
      desc: '새벽 2시~5시에 쇼츠 시청',
      check: () => {
        const h = new Date().getHours();
        return h >= 2 && h < 5 && shortsCount > 0;
      },
    },
    {
      id: 'iron_will',
      emoji: '🪨',
      title: '철의 의지',
      desc: '차단 화면 풀 카운트 3회 버팀',
      check: () => lockdownsEndured >= 3,
    },
    {
      id: 'century',
      emoji: '💀',
      title: '센추리',
      desc: '하루 100개 쇼츠... 레전드',
      check: () => shortsCount >= 100,
    },
    {
      id: 'quick_escape',
      emoji: '🏃',
      title: '알고리즘 배반자',
      desc: '쇼츠 들어갔다가 5초 안에 탈출',
      check: () => {
        if (!window.location.pathname.includes('/shorts/')) {
          if (shortsEnteredAt > 0 && Date.now() - shortsEnteredAt < 5000) {
            return true;
          }
        }
        return false;
      },
    },
    {
      id: 'evolved',
      emoji: '🦎',
      title: '진화 시작',
      desc: '기생충이 유충 이상으로 진화',
      check: () => evoLevel >= 1,
    },
    {
      id: 'dragon',
      emoji: '🐉',
      title: '드래곤 달성',
      desc: '14일 연속 10개 미만 유지',
      check: () => evoLevel >= 4,
    },
    {
      id: 'king',
      emoji: '👑',
      title: '기생왕',
      desc: '30일 연속 10개 미만. 전설.',
      check: () => evoLevel >= 5,
    },
  ];

  // === LOCKDOWN SCHEDULE ===
  const LOCKDOWN_SCHEDULE = [
    { at: 10,  seconds: 30,    msg: '10개. 30초 정지.\n알고리즘이 널 테스트하고 있어.' },
    { at: 20,  seconds: 60,    msg: '20개. 1분 정지.\n이건 습관이 아니라 중독이야.' },
    { at: 30,  seconds: 120,   msg: '30개. 2분 정지.\n이 시간에 할 수 있는 다른 일을 생각해봐.' },
    { at: 40,  seconds: 240,   msg: '40개. 4분 정지.\n진짜로 이걸 원해서 보는 거야?' },
    { at: 50,  seconds: 480,   msg: '50개. 8분 정지.\n솔직히 말해봐. 멈출 수 있어?' },
    { at: 60,  seconds: 960,   msg: '60개. 16분 정지.\n화면을 끄고 창밖을 봐.' },
    { at: 70,  seconds: 1920,  msg: '70개. 32분 정지.\n너 오늘 뭐 하려고 했는지 기억나?' },
    { at: 80,  seconds: 3840,  msg: '80개. 1시간 4분 정지.\n이쯤 되면 네가 선택한 게 아니야.' },
    { at: 90,  seconds: 7680,  msg: '90개. 2시간 8분 정지.\n이거 끝나면 진짜 다른 거 해.' },
    { at: 100, seconds: 15360, msg: '100개. 4시간 16분 정지.\n오늘은 끝이야. 내일 보자.' },
  ];

  // =====================
  // === UI ELEMENTS ===
  // =====================

  // --- Main counter box (always visible) ---
  const box = document.createElement('div');
  box.id = 'parasite-box';
  box.setAttribute('style', [
    'position: fixed', 'top: 10px', 'left: 10px', 'z-index: 2147483647',
    'background: rgba(0, 0, 0, 0.92)', 'color: #22c55e',
    'padding: 10px 16px', 'font-size: 14px', 'font-weight: bold',
    'font-family: Arial, sans-serif', 'border: 2px solid #22c55e',
    'border-radius: 12px', 'box-shadow: 0 0 20px rgba(34, 197, 94, 0.3)',
    'display: flex', 'flex-direction: column', 'gap: 4px',
    'pointer-events: none', 'user-select: none', 'min-width: 160px',
  ].join(' !important; ') + ' !important');

  box.innerHTML = `
    <div style="display:flex !important; align-items:center !important; gap:8px !important;">
      <span id="p-evo" style="font-size:22px !important;">🥚</span>
      <span id="p-evo-name" style="font-size:11px !important; color:#888 !important;">Lv.0 알</span>
      <span id="p-streak" style="font-size:10px !important; color:#555 !important; margin-left:auto !important;"></span>
    </div>
    <div style="display:flex !important; align-items:baseline !important; gap:8px !important; margin-top:2px !important;">
      <span id="p-count" style="font-size:18px !important;">0개</span>
      <span id="p-time" style="color:#888 !important; font-size:12px !important; margin-left:auto !important;">0초</span>
    </div>
    <div id="p-achievement-toast" style="display:none !important; font-size:11px !important; color:#f59e0b !important; margin-top:2px !important; animation: p-toast-in 0.5s ease !important;"></div>
  `;
  document.documentElement.appendChild(box);

  // Toast animation
  const toastStyle = document.createElement('style');
  toastStyle.textContent = `
    @keyframes p-toast-in {
      0% { opacity: 0; transform: translateY(8px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes p-toast-out {
      0% { opacity: 1; }
      100% { opacity: 0; transform: translateY(-8px); }
    }
  `;
  document.head.appendChild(toastStyle);

  // --- Lockdown overlay ---
  const overlay = document.createElement('div');
  overlay.id = 'parasite-lockdown';
  overlay.setAttribute('style', [
    'position: fixed', 'top: 0', 'left: 0', 'width: 100vw', 'height: 100vh',
    'z-index: 2147483647', 'background: rgba(0, 0, 0, 0.95)',
    'display: none', 'justify-content: center', 'align-items: center',
    'flex-direction: column', 'gap: 20px', 'font-family: Arial, sans-serif',
    'pointer-events: all', 'cursor: not-allowed', 'user-select: none',
  ].join(' !important; ') + ' !important');

  overlay.innerHTML = `
    <div id="p-lock-evo" style="font-size: 80px !important;">🥚</div>
    <div id="p-lock-msg" style="color: #ef4444 !important; font-size: 24px !important; font-weight: bold !important; text-align: center !important; line-height: 1.6 !important; white-space: pre-line !important; padding: 0 20px !important;"></div>
    <div id="p-lock-timer" style="color: #f59e0b !important; font-size: 72px !important; font-weight: bold !important; font-variant-numeric: tabular-nums !important;"></div>
    <div id="p-lock-sub" style="color: #666 !important; font-size: 14px !important;"></div>
    <div style="color: #444 !important; font-size: 12px !important; margin-top: 20px !important;">클릭 불가. 기다려야 해제됨.</div>
  `;
  document.documentElement.appendChild(overlay);

  ['click', 'mousedown', 'touchstart', 'keydown', 'scroll', 'wheel'].forEach((evt) => {
    overlay.addEventListener(evt, (e) => { e.stopPropagation(); e.preventDefault(); }, true);
  });

  // ===================
  // === FUNCTIONS ===
  // ===================

  function formatTime(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    return m + ':' + String(s).padStart(2, '0');
  }

  function getShortsId(): string | null {
    const m = window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }

  function isOnShorts(): boolean {
    return window.location.pathname.includes('/shorts/');
  }

  // --- Evolution ---
  function updateEvolution() {
    const evo = EVOLUTION[evoLevel] || EVOLUTION[0];
    const evoEl = document.getElementById('p-evo');
    const nameEl = document.getElementById('p-evo-name');
    const streakEl = document.getElementById('p-streak');
    const lockEvoEl = document.getElementById('p-lock-evo');
    if (evoEl) evoEl.textContent = evo.emoji;
    if (nameEl) nameEl.textContent = 'Lv.' + evo.level + ' ' + evo.name;
    if (streakEl) streakEl.textContent = evoStreak > 0 ? '🔥' + evoStreak + '일' : '';
    if (lockEvoEl) lockEvoEl.textContent = evo.emoji;
  }

  function checkEvolution() {
    // Calculate level from streak
    let newLevel = 0;
    if (evoStreak >= 30) newLevel = 5;
    else if (evoStreak >= 14) newLevel = 4;
    else if (evoStreak >= 7) newLevel = 3;
    else if (evoStreak >= 3) newLevel = 2;
    else if (evoStreak >= 1) newLevel = 1;

    if (newLevel !== evoLevel) {
      const oldLevel = evoLevel;
      evoLevel = newLevel;
      if (newLevel > oldLevel) {
        showToast('⬆️ 진화! ' + EVOLUTION[newLevel].emoji + ' ' + EVOLUTION[newLevel].name + '!');
      } else {
        showToast('⬇️ 퇴화... ' + EVOLUTION[newLevel].emoji + ' ' + EVOLUTION[newLevel].name + '으로 퇴보');
      }
      saveEvolution();
    }
    updateEvolution();
  }

  function devolve() {
    if (evoStreak > 0) {
      evoStreak = Math.max(0, evoStreak - 2); // 폭주하면 2일치 날림
      showToast('💥 폭주! 스트릭 -2일');
      checkEvolution();
      saveEvolution();
    }
  }

  // --- Achievements ---
  function checkAchievements() {
    for (const ach of ACHIEVEMENTS) {
      if (unlockedSet.has(ach.id)) continue;
      if (ach.check()) {
        unlockedSet.add(ach.id);
        showToast(ach.emoji + ' 업적 해금: ' + ach.title);
        saveAchievements();
        console.log('🏆 ' + ach.title + ' — ' + ach.desc);
      }
    }
  }

  // --- Toast (in-page notification) ---
  let toastTimeout: ReturnType<typeof setTimeout> | null = null;
  function showToast(text: string) {
    const toast = document.getElementById('p-achievement-toast');
    if (!toast) return;
    toast.textContent = text;
    toast.style.display = 'block';
    toast.style.animation = 'p-toast-in 0.5s ease';
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.style.animation = 'p-toast-out 0.5s ease forwards';
      setTimeout(() => { toast.style.display = 'none'; }, 500);
    }, 4000);
  }

  // --- Lockdown ---
  function triggerLockdown(schedule: typeof LOCKDOWN_SCHEDULE[0]) {
    if (isLocked) return;
    isLocked = true;

    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (video) video.pause();

    overlay.style.display = 'flex';
    updateEvolution(); // Show current evo in lockdown

    const msgEl = document.getElementById('p-lock-msg');
    const timerEl = document.getElementById('p-lock-timer');
    const subEl = document.getElementById('p-lock-sub');
    if (msgEl) msgEl.innerText = schedule.msg;
    if (subEl) subEl.textContent = '차단 시간: ' + formatTime(schedule.seconds);

    let remaining = schedule.seconds;
    if (timerEl) timerEl.textContent = formatTime(remaining);

    const countdownId = setInterval(() => {
      remaining--;
      if (timerEl) timerEl.textContent = formatTime(remaining);
      const v = document.querySelector('video') as HTMLVideoElement | null;
      if (v && !v.paused) v.pause();

      if (remaining <= 0) {
        clearInterval(countdownId);
        overlay.style.display = 'none';
        isLocked = false;
        lockdownsEndured++;
        checkAchievements();
      }
    }, 1000);
  }

  // --- Main tick ---
  function tick() {
    if (isLocked) return;

    // Track shorts enter/exit
    if (isOnShorts() && shortsEnteredAt === 0) {
      shortsEnteredAt = Date.now();
    }
    if (!isOnShorts() && shortsEnteredAt > 0) {
      // Check quick escape achievement
      checkAchievements();
      shortsEnteredAt = 0;
    }

    const id = getShortsId();
    if (id && id !== lastShortsId) {
      lastShortsId = id;
      shortsCount++;

      // Devolve if bingeing (30+)
      if (shortsCount === 30) devolve();
      if (shortsCount === 60) devolve();

      // Check lockdown
      const schedule = LOCKDOWN_SCHEDULE.find((s) => s.at === shortsCount);
      if (schedule) triggerLockdown(schedule);

      // Check achievements
      checkAchievements();
    }

    // Update counter UI
    const countEl = document.getElementById('p-count');
    const timeEl = document.getElementById('p-time');
    if (countEl) countEl.textContent = shortsCount + '개';
    if (timeEl) {
      const sec = Math.floor((Date.now() - startTime) / 1000);
      timeEl.textContent = formatTime(sec);
    }

    // Counter color
    if (shortsCount >= 30) {
      box.style.borderColor = '#ef4444';
      box.style.color = '#ef4444';
      box.style.boxShadow = '0 0 20px rgba(239,68,68,0.5)';
    } else if (shortsCount >= 10) {
      box.style.borderColor = '#f59e0b';
      box.style.color = '#f59e0b';
      box.style.boxShadow = '0 0 20px rgba(245,158,11,0.4)';
    }
  }

  // ======================
  // === PERSISTENCE ===
  // ======================

  function getTodayKey(): string {
    const d = new Date();
    return 'p_day_' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function saveDaily() {
    try {
      const key = getTodayKey();
      const sec = Math.floor((Date.now() - startTime) / 1000);
      chrome.storage.local.get([key], (result) => {
        const prev = result[key] || { shorts: 0, seconds: 0 };
        chrome.storage.local.set({
          [key]: {
            shorts: Math.max(prev.shorts, shortsCount),
            seconds: Math.max(prev.seconds, sec),
          },
        });
      });
    } catch { /* context invalidated */ }
  }

  function saveEvolution() {
    try {
      chrome.storage.local.set({
        p_evolution: { level: evoLevel, streak: evoStreak },
      });
    } catch {}
  }

  function saveAchievements() {
    try {
      chrome.storage.local.set({
        p_achievements: Array.from(unlockedSet),
      });
    } catch {}
  }

  function loadState() {
    try {
      chrome.storage.local.get(['p_evolution', 'p_achievements', getTodayKey()], (result) => {
        // Load evolution
        if (result.p_evolution) {
          evoLevel = result.p_evolution.level || 0;
          evoStreak = result.p_evolution.streak || 0;
        }
        updateEvolution();

        // Load achievements
        if (result.p_achievements) {
          for (const id of result.p_achievements) unlockedSet.add(id);
        }

        // Load today's count
        const today = result[getTodayKey()];
        if (today && today.shorts > 0) {
          shortsCount = today.shorts;
          console.log('🦠 복원: ' + shortsCount + '개, Lv.' + evoLevel + ' ' + EVOLUTION[evoLevel].name);
        }
      });
    } catch {}
  }

  // Daily streak check (run once per page load)
  function checkDailyStreak() {
    try {
      // Get yesterday's data
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = 'p_day_' + yesterday.getFullYear() + '-' +
        String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
        String(yesterday.getDate()).padStart(2, '0');

      chrome.storage.local.get([yKey, 'p_streak_checked_date'], (result) => {
        const todayStr = new Date().toDateString();
        if (result.p_streak_checked_date === todayStr) return; // Already checked today

        const yData = result[yKey];
        if (yData && yData.shorts < 10) {
          evoStreak++;
          showToast('🔥 ' + evoStreak + '일 연속 10개 미만!');
        } else if (yData && yData.shorts >= 10) {
          evoStreak = 0;
        }
        // If no data yesterday, keep streak (maybe they didn't use YouTube)

        checkEvolution();
        chrome.storage.local.set({ p_streak_checked_date: todayStr });
      });
    } catch {}
  }

  // === BOOT ===
  loadState();
  setTimeout(checkDailyStreak, 2000);
  setInterval(tick, 500);
  setInterval(saveDaily, 5000);
  tick();

  console.log('🦠 The Parasite v0.4 — 타마고치 + 업적 + 차단');
})();
