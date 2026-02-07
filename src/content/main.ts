// The Parasite — YouTube Shorts Counter + Progressive Lockdown

(function () {
  if (!window.location.hostname.includes('youtube.com')) return;
  if (document.getElementById('parasite-box')) return;

  // === STATE ===
  let shortsCount = 0;
  let lastShortsId = '';
  let startTime = Date.now();
  let isLocked = false;

  // === LOCKDOWN SCHEDULE: 10개마다, 시간 두 배씩 ===
  // 10→30s, 20→60s, 30→120s, 40→240s, 50→480s, 60→960s, 70→1920s, 80→3840s, 90→7680s, 100→15360s
  const LOCKDOWN_SCHEDULE: { at: number; seconds: number; msg: string }[] = [
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

  // === COUNTER UI ===
  const box = document.createElement('div');
  box.id = 'parasite-box';
  box.setAttribute('style', [
    'position: fixed',
    'top: 10px',
    'left: 10px',
    'z-index: 2147483647',
    'background: rgba(0, 0, 0, 0.92)',
    'color: #22c55e',
    'padding: 10px 18px',
    'font-size: 15px',
    'font-weight: bold',
    'font-family: Arial, sans-serif',
    'border: 2px solid #22c55e',
    'border-radius: 10px',
    'box-shadow: 0 0 20px rgba(34, 197, 94, 0.3)',
    'display: flex',
    'align-items: center',
    'gap: 10px',
    'pointer-events: none',
    'user-select: none',
  ].join(' !important; ') + ' !important');

  box.innerHTML = '<span>🦠</span><span id="p-count">쇼츠: 0개</span><span id="p-time" style="color:#888 !important; font-size:13px !important;">0초</span>';
  document.documentElement.appendChild(box);

  // === LOCKDOWN OVERLAY ===
  const overlay = document.createElement('div');
  overlay.id = 'parasite-lockdown';
  overlay.setAttribute('style', [
    'position: fixed',
    'top: 0',
    'left: 0',
    'width: 100vw',
    'height: 100vh',
    'z-index: 2147483647',
    'background: rgba(0, 0, 0, 0.95)',
    'display: none',
    'justify-content: center',
    'align-items: center',
    'flex-direction: column',
    'gap: 20px',
    'font-family: Arial, sans-serif',
    'pointer-events: all',
    'cursor: not-allowed',
    'user-select: none',
  ].join(' !important; ') + ' !important');

  overlay.innerHTML = `
    <div style="font-size: 60px !important;">🦠</div>
    <div id="p-lock-msg" style="color: #ef4444 !important; font-size: 26px !important; font-weight: bold !important; text-align: center !important; line-height: 1.6 !important; white-space: pre-line !important; padding: 0 20px !important;"></div>
    <div id="p-lock-timer" style="color: #f59e0b !important; font-size: 72px !important; font-weight: bold !important; font-variant-numeric: tabular-nums !important;"></div>
    <div id="p-lock-sub" style="color: #666 !important; font-size: 14px !important; margin-top: 10px !important;"></div>
    <div style="color: #444 !important; font-size: 12px !important; margin-top: 30px !important;">클릭 불가. 기다려야 해제됨.</div>
  `;

  document.documentElement.appendChild(overlay);

  // Block everything during lockdown
  ['click', 'mousedown', 'touchstart', 'keydown', 'scroll', 'wheel'].forEach((evt) => {
    overlay.addEventListener(evt, (e) => { e.stopPropagation(); e.preventDefault(); }, true);
  });

  // === FORMAT TIME ===
  function formatTime(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    return m + ':' + String(s).padStart(2, '0');
  }

  // === LOCKDOWN ===
  function triggerLockdown(schedule: typeof LOCKDOWN_SCHEDULE[0]) {
    if (isLocked) return;
    isLocked = true;

    // Pause video
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (video) video.pause();

    overlay.style.display = 'flex';
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

      // Keep pausing video (in case user somehow unpauses)
      const v = document.querySelector('video') as HTMLVideoElement | null;
      if (v && !v.paused) v.pause();

      if (remaining <= 0) {
        clearInterval(countdownId);
        overlay.style.display = 'none';
        isLocked = false;
      }
    }, 1000);

    console.log('🦠 LOCKDOWN: ' + schedule.seconds + '초 (' + formatTime(schedule.seconds) + ')');
  }

  // === LOGIC ===
  function getShortsId(): string | null {
    const m = window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }

  function tick() {
    if (isLocked) return;

    const id = getShortsId();
    if (id && id !== lastShortsId) {
      lastShortsId = id;
      shortsCount++;
      console.log('🦠 쇼츠 #' + shortsCount + ' → ' + id);

      // Check lockdown schedule
      const schedule = LOCKDOWN_SCHEDULE.find((s) => s.at === shortsCount);
      if (schedule) {
        triggerLockdown(schedule);
      }
    }

    // Update counter
    const countEl = document.getElementById('p-count');
    const timeEl = document.getElementById('p-time');
    if (countEl) countEl.textContent = '쇼츠: ' + shortsCount + '개';
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

  setInterval(tick, 500);
  tick();

  console.log('🦠 The Parasite ON — 10개마다 차단, 두 배씩 증가');
})();
