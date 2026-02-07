// The Parasite v0.5 — Content Script (UI + Event Detection)
// All state mutations go through background worker via messages.

(function () {
  if (!window.location.hostname.includes('youtube.com')) return;
  if (document.getElementById('parasite-box')) return;

  // === Imports (inlined by esbuild) ===
  // Using inline imports — esbuild resolves these at build time
  type Message = import('../shared/types').Message;
  type StateResponse = import('../shared/types').StateResponse;
  type LockState = import('../shared/types').LockState;
  type AchievementId = import('../shared/types').AchievementId;

  // We can't use ES imports in an IIFE directly, so we inline the shared data.
  // esbuild will bundle these if we use top-level imports, but since this is wrapped
  // in an IIFE, we duplicate the constants here. The background is the source of truth
  // for state; these are only for UI rendering.

  const EVOLUTION = [
    { level: 0, emoji: '\u{1F95A}', name: '\uC54C' },
    { level: 1, emoji: '\u{1F41B}', name: '\uC720\uCDA9' },
    { level: 2, emoji: '\u{1F98E}', name: '\uB3C4\uB9C8\uBF40' },
    { level: 3, emoji: '\u{1F419}', name: '\uBB38\uC5B4' },
    { level: 4, emoji: '\u{1F409}', name: '\uB4DC\uB798\uACE4' },
    { level: 5, emoji: '\u{1F451}', name: '\uAE30\uC0DD\uC655' },
  ];

  const ACHIEVEMENTS = [
    { id: 'first_blood', emoji: '\u{1FA78}', title: '\uCCAB \uAC10\uC5FC' },
    { id: 'algorithm_slave', emoji: '\u26D3\uFE0F', title: '\uC54C\uACE0\uB9AC\uC998\uC758 \uB178\uC608' },
    { id: 'zombie', emoji: '\u{1F9DF}', title: '\uC0C8\uBCBD \uC880\uBE44' },
    { id: 'iron_will', emoji: '\u{1FAA8}', title: '\uCCA0\uC758 \uC758\uC9C0' },
    { id: 'century', emoji: '\u{1F480}', title: '\uC13C\uCD94\uB9AC' },
    { id: 'quick_escape', emoji: '\u{1F3C3}', title: '\uC54C\uACE0\uB9AC\uC998 \uBC30\uBC18\uC790' },
    { id: 'evolved', emoji: '\u{1F98E}', title: '\uC9C4\uD654 \uC2DC\uC791' },
    { id: 'dragon', emoji: '\u{1F409}', title: '\uB4DC\uB798\uACE4 \uB2EC\uC131' },
    { id: 'king', emoji: '\u{1F451}', title: '\uAE30\uC0DD\uC655' },
  ];

  // === Local State (UI-only, not persisted) ===
  let lastShortsId = '';
  let shortsEnteredAt = 0;
  let totalShortsSeconds = 0;
  let currentShortsStart = 0;
  let isLocked = false;
  let tickId: number | null = null;
  let timeUpdateId: number | null = null;
  let lockdownTimerId: number | null = null;

  // Cached state from background
  let state: StateResponse = {
    today: { shorts: 0, seconds: 0 },
    evolution: { level: 0 as any, streak: 0 },
    achievements: [],
    lockState: null,
  };

  // === UI Elements ===

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

  box.innerHTML = [
    '<div style="display:flex !important; align-items:center !important; gap:8px !important;">',
    '  <span id="p-evo" style="font-size:22px !important;">\u{1F95A}</span>',
    '  <span id="p-evo-name" style="font-size:11px !important; color:#888 !important;">Lv.0 \uC54C</span>',
    '  <span id="p-streak" style="font-size:10px !important; color:#555 !important; margin-left:auto !important;"></span>',
    '</div>',
    '<div style="display:flex !important; align-items:baseline !important; gap:8px !important; margin-top:2px !important;">',
    '  <span id="p-count" style="font-size:18px !important;">0\uAC1C</span>',
    '  <span id="p-time" style="color:#888 !important; font-size:12px !important; margin-left:auto !important;">0:00</span>',
    '</div>',
    '<div id="p-toast" style="display:none !important; font-size:11px !important; color:#f59e0b !important; margin-top:2px !important;"></div>',
  ].join('');
  document.documentElement.appendChild(box);

  // Toast animation
  const toastStyle = document.createElement('style');
  toastStyle.textContent = '@keyframes p-fade-in{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}@keyframes p-fade-out{0%{opacity:1}100%{opacity:0;transform:translateY(-8px)}}';
  if (document.head) document.head.appendChild(toastStyle);

  // Lockdown overlay
  const overlay = document.createElement('div');
  overlay.id = 'parasite-lockdown';
  overlay.setAttribute('style', [
    'position: fixed', 'top: 0', 'left: 0', 'width: 100vw', 'height: 100vh',
    'z-index: 2147483647', 'background: rgba(0, 0, 0, 0.95)',
    'display: none', 'justify-content: center', 'align-items: center',
    'flex-direction: column', 'gap: 20px', 'font-family: Arial, sans-serif',
    'pointer-events: all', 'cursor: not-allowed', 'user-select: none',
  ].join(' !important; ') + ' !important');

  overlay.innerHTML = [
    '<div id="p-lock-evo" style="font-size: 80px !important;">\u{1F95A}</div>',
    '<div id="p-lock-msg" style="color: #ef4444 !important; font-size: 24px !important; font-weight: bold !important; text-align: center !important; line-height: 1.6 !important; white-space: pre-line !important; padding: 0 20px !important;"></div>',
    '<div id="p-lock-timer" style="color: #f59e0b !important; font-size: 72px !important; font-weight: bold !important; font-variant-numeric: tabular-nums !important;"></div>',
    '<div id="p-lock-sub" style="color: #666 !important; font-size: 14px !important;"></div>',
    '<div style="color: #444 !important; font-size: 12px !important; margin-top: 20px !important;">\uD074\uB9AD \uBD88\uAC00. \uAE30\uB2E4\uB824\uC57C \uD574\uC81C\uB428.</div>',
  ].join('');
  document.documentElement.appendChild(overlay);

  // Block all interaction on overlay
  ['click', 'mousedown', 'touchstart', 'keydown', 'scroll', 'wheel'].forEach((evt) => {
    overlay.addEventListener(evt, (e) => { e.stopPropagation(); e.preventDefault(); }, true);
  });

  // Also block keyboard at document level during lockdown
  document.addEventListener('keydown', (e) => {
    if (isLocked) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  // === Helpers ===

  function formatTime(sec: number): string {
    if (sec < 0) sec = 0; // Fix #20: prevent negative output
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

  function getCurrentSeconds(): number {
    let total = totalShortsSeconds;
    if (currentShortsStart > 0) {
      total += Math.floor((Date.now() - currentShortsStart) / 1000);
    }
    return total;
  }

  // === Messaging ===

  async function sendMsg(msg: Message): Promise<StateResponse | null> {
    try {
      return await chrome.runtime.sendMessage(msg);
    } catch (e) {
      console.warn('\u{1F9A0} Message failed:', e);
      return null;
    }
  }

  // === Toast ===

  let toastTimeout: ReturnType<typeof setTimeout> | null = null;

  function showToast(text: string) {
    const el = document.getElementById('p-toast');
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
    el.style.animation = 'p-fade-in 0.5s ease';
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      el.style.animation = 'p-fade-out 0.5s ease forwards';
      setTimeout(() => { el.style.display = 'none'; }, 500);
    }, 4000);
  }

  // === UI Update ===

  function updateUI() {
    const evo = EVOLUTION[state.evolution.level] ?? EVOLUTION[0];

    const evoEl = document.getElementById('p-evo');
    const nameEl = document.getElementById('p-evo-name');
    const streakEl = document.getElementById('p-streak');
    const countEl = document.getElementById('p-count');
    const timeEl = document.getElementById('p-time');
    const lockEvoEl = document.getElementById('p-lock-evo');

    if (evoEl) evoEl.textContent = evo.emoji;
    if (nameEl) nameEl.textContent = 'Lv.' + evo.level + ' ' + evo.name;
    if (streakEl) streakEl.textContent = state.evolution.streak > 0 ? '\u{1F525}' + state.evolution.streak + '\uC77C' : '';
    if (countEl) countEl.textContent = state.today.shorts + '\uAC1C';
    if (timeEl) timeEl.textContent = formatTime(getCurrentSeconds());
    if (lockEvoEl) lockEvoEl.textContent = evo.emoji;

    // Color based on count
    const c = state.today.shorts;
    if (c >= 30) {
      box.style.borderColor = '#ef4444';
      box.style.color = '#ef4444';
      box.style.boxShadow = '0 0 20px rgba(239,68,68,0.5)';
    } else if (c >= 10) {
      box.style.borderColor = '#f59e0b';
      box.style.color = '#f59e0b';
      box.style.boxShadow = '0 0 20px rgba(245,158,11,0.4)';
    } else {
      box.style.borderColor = '#22c55e';
      box.style.color = '#22c55e';
      box.style.boxShadow = '0 0 20px rgba(34,197,94,0.3)';
    }
  }

  // === Apply state response from background ===

  function applyState(resp: StateResponse) {
    state = resp;

    if (resp.newAchievements) {
      for (const id of resp.newAchievements) {
        const ach = ACHIEVEMENTS.find((a) => a.id === id);
        if (ach) showToast(ach.emoji + ' \uC5C5\uC801 \uD574\uAE08: ' + ach.title);
      }
    }

    if (resp.evolved) {
      const newEvo = EVOLUTION[resp.evolved.to] ?? EVOLUTION[0];
      if (resp.evolved.to > resp.evolved.from) {
        showToast('\u2B06\uFE0F \uC9C4\uD654! ' + newEvo.emoji + ' ' + newEvo.name + '!');
      } else {
        showToast('\u2B07\uFE0F \uD1F4\uD654... ' + newEvo.emoji + ' ' + newEvo.name + '\uC73C\uB85C \uD1F4\uBCF4');
      }
    }

    // Lockdown check (persisted — survives refresh, fixes #7)
    if (resp.lockState && resp.lockState.until > Date.now()) {
      showLockdown(resp.lockState);
    }

    updateUI();
  }

  // === Lockdown ===

  function showLockdown(lock: LockState) {
    if (isLocked) return;
    isLocked = true;

    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (video) video.pause();

    // Prevent video play during lockdown (fixes #13)
    const preventPlay = () => {
      if (isLocked) {
        const v = document.querySelector('video') as HTMLVideoElement | null;
        if (v) v.pause();
      }
    };
    document.addEventListener('play', preventPlay, true);

    overlay.style.display = 'flex';
    updateUI();

    const msgEl = document.getElementById('p-lock-msg');
    const timerEl = document.getElementById('p-lock-timer');
    const subEl = document.getElementById('p-lock-sub');
    if (msgEl) msgEl.innerText = lock.message;
    if (subEl) subEl.textContent = '\uCC28\uB2E8 \uC2DC\uAC04: ' + formatTime(lock.totalSeconds);

    function countdownTick() {
      const remaining = Math.max(0, Math.ceil((lock.until - Date.now()) / 1000));
      if (timerEl) timerEl.textContent = formatTime(remaining);
      preventPlay();

      if (remaining <= 0) {
        if (lockdownTimerId) { clearInterval(lockdownTimerId); lockdownTimerId = null; }
        overlay.style.display = 'none';
        isLocked = false;
        document.removeEventListener('play', preventPlay, true);
        sendMsg({ type: 'LOCKDOWN_ENDURED' }).then((resp) => {
          if (resp) applyState(resp);
        });
      }
    }

    if (lockdownTimerId) clearInterval(lockdownTimerId);
    lockdownTimerId = window.setInterval(countdownTick, 1000);
    countdownTick();
  }

  // === Main Tick (500ms) ===

  function tick() {
    if (isLocked) return;

    // Track time on shorts pages
    if (isOnShorts()) {
      if (currentShortsStart === 0) currentShortsStart = Date.now();
    } else {
      if (currentShortsStart > 0) {
        totalShortsSeconds += Math.floor((Date.now() - currentShortsStart) / 1000);
        currentShortsStart = 0;
      }
    }

    // Track shorts enter/exit for quick_escape
    if (isOnShorts() && shortsEnteredAt === 0) {
      shortsEnteredAt = Date.now();
    }
    if (!isOnShorts() && shortsEnteredAt > 0) {
      const elapsed = Date.now() - shortsEnteredAt;
      shortsEnteredAt = 0;
      if (elapsed > 0 && elapsed < 5000) {
        sendMsg({ type: 'QUICK_ESCAPE' }).then((resp) => {
          if (resp) applyState(resp);
        });
      }
    }

    // Detect new shorts video
    const id = getShortsId();
    if (id && id !== lastShortsId) {
      lastShortsId = id;

      // Zombie check (2am-5am)
      const h = new Date().getHours();
      if (h >= 2 && h < 5) {
        sendMsg({ type: 'ZOMBIE_CHECK' }).then((resp) => {
          if (resp) applyState(resp);
        });
      }

      // Report new short to background
      sendMsg({ type: 'SHORT_VIEWED', shortsId: id, seconds: getCurrentSeconds() }).then((resp) => {
        if (resp) applyState(resp);
      });
    }

    updateUI();
  }

  // === Cross-tab sync via storage.onChanged (fixes #14) ===

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;

      if (changes.p_lock_state) {
        const newLock: LockState | null = changes.p_lock_state.newValue || null;
        if (newLock && newLock.until > Date.now() && !isLocked) {
          showLockdown(newLock);
        } else if ((!newLock || newLock.until <= Date.now()) && isLocked) {
          if (lockdownTimerId) { clearInterval(lockdownTimerId); lockdownTimerId = null; }
          overlay.style.display = 'none';
          isLocked = false;
        }
      }

      if (changes.p_achievements) {
        state.achievements = changes.p_achievements.newValue ?? [];
      }
      if (changes.p_evolution) {
        state.evolution = changes.p_evolution.newValue ?? { level: 0, streak: 0 };
      }

      // Sync today's count from other tabs
      const todayKey = getTodayKey();
      if (changes[todayKey]) {
        const newData = changes[todayKey].newValue;
        if (newData && newData.shorts > state.today.shorts) {
          state.today = newData;
        }
      }

      updateUI();
    });
  } catch { /* context invalidated */ }

  // Helper for today key (duplicated from shared — needed in IIFE scope)
  function getTodayKey(): string {
    const d = new Date();
    return 'p_day_' + d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // === Cleanup (fixes #12) ===

  function cleanup() {
    if (tickId) { clearInterval(tickId); tickId = null; }
    if (timeUpdateId) { clearInterval(timeUpdateId); timeUpdateId = null; }
    if (lockdownTimerId) { clearInterval(lockdownTimerId); lockdownTimerId = null; }
  }

  // beforeunload: final time save (fixes #8)
  window.addEventListener('beforeunload', () => {
    const seconds = getCurrentSeconds();
    if (seconds > 0) {
      try {
        // Best-effort sync save — navigator.sendBeacon doesn't work for extension messaging
        chrome.runtime.sendMessage({ type: 'TIME_UPDATE', seconds });
      } catch { /* context may be invalidated */ }
    }
    cleanup();
  });

  // === Boot ===

  async function boot() {
    const resp = await sendMsg({ type: 'GET_STATE' });
    if (resp) {
      state = resp;
      // Check if lockdown persisted across refresh (fixes #7)
      if (state.lockState && state.lockState.until > Date.now()) {
        showLockdown(state.lockState);
      }
    }

    updateUI();

    tickId = window.setInterval(tick, 500);
    // Periodic time update to background (every 10s)
    timeUpdateId = window.setInterval(() => {
      const seconds = getCurrentSeconds();
      if (seconds > state.today.seconds) {
        sendMsg({ type: 'TIME_UPDATE', seconds });
      }
    }, 10000);

    tick();
  }

  boot().catch((e) => console.warn('\u{1F9A0} Boot failed:', e));
  console.log('\u{1F9A0} The Parasite v0.5 content loaded');
})();
