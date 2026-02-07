// The Parasite v0.5 — Central State Manager (Background Service Worker)

import type { Message, StateResponse, DayData, EvolutionState, AchievementId, EvoLevel, LockState } from './shared/types';
import {
  LOCKDOWN_SCHEDULE, BINGE_DEVOLVE_THRESHOLDS, DAILY_GOOD_THRESHOLD,
  SCHEMA_VERSION, OLD_DATA_CLEANUP_DAYS, calculateLevel,
} from './shared/constants';
import { safeGet, safeSet, safeRemove, getTodayKey, getDateKey, cleanupOldData } from './shared/storage';

// === Serialization queue — prevents race conditions ===
let queue = Promise.resolve<any>(undefined);

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue = queue
      .then(() => fn().then(resolve, reject))
      .catch(() => {}); // never break the chain
  });
}

// === Helpers ===
function defaultEvo(): EvolutionState { return { level: 0 as EvoLevel, streak: 0 }; }
function defaultDay(): DayData { return { shorts: 0, seconds: 0 }; }

// === Message handler ===
chrome.runtime.onMessage.addListener(
  (msg: Message, _sender: chrome.runtime.MessageSender, sendResponse: (resp: any) => void) => {
    processMessage(msg)
      .then(sendResponse)
      .catch((e) => {
        console.error('\u{1F9A0} BG error:', e);
        sendResponse({ error: String(e) });
      });
    return true; // async response
  }
);

async function processMessage(msg: Message): Promise<StateResponse | null> {
  switch (msg.type) {
    case 'SHORT_VIEWED':
      return serialize(() => handleShortViewed(msg.shortsId, msg.seconds));
    case 'LOCKDOWN_ENDURED':
      return serialize(() => handleLockdownEndured());
    case 'QUICK_ESCAPE':
      return serialize(() => handleUnlockAchievement('quick_escape'));
    case 'ZOMBIE_CHECK':
      return serialize(() => handleUnlockAchievement('zombie'));
    case 'TIME_UPDATE':
      return serialize(() => handleTimeUpdate(msg.seconds));
    case 'GET_STATE':
      return serialize(() => getFullState());
    default:
      return null;
  }
}

// === State reads ===
async function getFullState(): Promise<StateResponse> {
  const key = getTodayKey();
  const result = await safeGet([key, 'p_evolution', 'p_achievements', 'p_lock_state']);
  return {
    today: result[key] ?? defaultDay(),
    evolution: result.p_evolution ?? defaultEvo(),
    achievements: result.p_achievements ?? [],
    lockState: result.p_lock_state || null,
  };
}

// === State mutations (all serialized) ===
async function handleShortViewed(shortsId: string, seconds: number): Promise<StateResponse> {
  const key = getTodayKey();
  const result = await safeGet([key, 'p_evolution', 'p_achievements', 'p_lock_state', 'p_lockdowns_endured']);

  const today: DayData = result[key] ?? defaultDay();
  const evo: EvolutionState = { ...(result.p_evolution ?? defaultEvo()) };
  const achievements = new Set<AchievementId>(result.p_achievements ?? []);
  const lockdownsEndured: number = result.p_lockdowns_endured ?? 0;
  let lockState: LockState | null = result.p_lock_state || null;

  today.shorts++;
  today.seconds = Math.max(today.seconds, seconds);

  const newAchievements: AchievementId[] = [];

  // Count-based achievements
  if (!achievements.has('first_blood') && today.shorts >= 1) {
    achievements.add('first_blood'); newAchievements.push('first_blood');
  }
  if (!achievements.has('algorithm_slave') && today.shorts >= 50) {
    achievements.add('algorithm_slave'); newAchievements.push('algorithm_slave');
  }
  if (!achievements.has('century') && today.shorts >= 100) {
    achievements.add('century'); newAchievements.push('century');
  }

  // Evolution-based achievements
  if (!achievements.has('evolved') && evo.level >= 1) {
    achievements.add('evolved'); newAchievements.push('evolved');
  }
  if (!achievements.has('dragon') && evo.level >= 4) {
    achievements.add('dragon'); newAchievements.push('dragon');
  }
  if (!achievements.has('king') && evo.level >= 5) {
    achievements.add('king'); newAchievements.push('king');
  }

  // Lockdown-based achievements
  if (!achievements.has('iron_will') && lockdownsEndured >= 3) {
    achievements.add('iron_will'); newAchievements.push('iron_will');
  }

  // Devolve on binge
  let evolved: { from: EvoLevel; to: EvoLevel } | undefined;
  if ((BINGE_DEVOLVE_THRESHOLDS as readonly number[]).includes(today.shorts)) {
    const oldLevel = evo.level;
    evo.streak = Math.max(0, evo.streak - 2);
    evo.level = calculateLevel(evo.streak);
    if (evo.level !== oldLevel) {
      evolved = { from: oldLevel, to: evo.level };
    }
  }

  // Check lockdown schedule
  const schedule = LOCKDOWN_SCHEDULE.find((s) => s.at === today.shorts);
  if (schedule) {
    lockState = {
      until: Date.now() + schedule.seconds * 1000,
      message: schedule.msg,
      totalSeconds: schedule.seconds,
    };
  }

  // Atomic save
  const saveData: Record<string, any> = {
    [key]: today,
    p_evolution: evo,
    p_achievements: Array.from(achievements),
  };
  if (lockState) saveData.p_lock_state = lockState;
  await safeSet(saveData);

  return {
    today, evolution: evo, achievements: Array.from(achievements),
    lockState, newAchievements: newAchievements.length > 0 ? newAchievements : undefined, evolved,
  };
}

async function handleLockdownEndured(): Promise<StateResponse> {
  const key = getTodayKey();
  const result = await safeGet([key, 'p_evolution', 'p_achievements', 'p_lockdowns_endured']);

  let lockdownsEndured: number = result.p_lockdowns_endured ?? 0;
  const achievements = new Set<AchievementId>(result.p_achievements ?? []);
  const newAchievements: AchievementId[] = [];

  lockdownsEndured++;
  if (!achievements.has('iron_will') && lockdownsEndured >= 3) {
    achievements.add('iron_will'); newAchievements.push('iron_will');
  }

  await safeSet({ p_lockdowns_endured: lockdownsEndured, p_achievements: Array.from(achievements) });
  await safeRemove(['p_lock_state']);

  return {
    today: result[key] ?? defaultDay(), evolution: result.p_evolution ?? defaultEvo(),
    achievements: Array.from(achievements), lockState: null,
    newAchievements: newAchievements.length > 0 ? newAchievements : undefined,
  };
}

async function handleUnlockAchievement(id: AchievementId): Promise<StateResponse> {
  const key = getTodayKey();
  const result = await safeGet([key, 'p_evolution', 'p_achievements', 'p_lock_state']);
  const achievements = new Set<AchievementId>(result.p_achievements ?? []);
  const newAchievements: AchievementId[] = [];

  if (!achievements.has(id)) {
    achievements.add(id); newAchievements.push(id);
    await safeSet({ p_achievements: Array.from(achievements) });
  }

  return {
    today: result[key] ?? defaultDay(), evolution: result.p_evolution ?? defaultEvo(),
    achievements: Array.from(achievements), lockState: result.p_lock_state || null,
    newAchievements: newAchievements.length > 0 ? newAchievements : undefined,
  };
}

async function handleTimeUpdate(seconds: number): Promise<StateResponse> {
  const key = getTodayKey();
  const result = await safeGet([key, 'p_evolution', 'p_achievements', 'p_lock_state']);
  const today: DayData = result[key] ?? defaultDay();

  if (seconds > today.seconds) {
    today.seconds = seconds;
    await safeSet({ [key]: today });
  }

  return {
    today, evolution: result.p_evolution ?? defaultEvo(),
    achievements: result.p_achievements ?? [], lockState: result.p_lock_state || null,
  };
}

// === Daily streak check (runs in background — single execution, no multi-tab race) ===
async function checkDailyStreak(): Promise<void> {
  try {
    const result = await safeGet(['p_streak_checked_date', 'p_evolution']);
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD, locale-independent
    if (result.p_streak_checked_date === todayStr) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = getDateKey(yesterday);
    const yResult = await safeGet([yKey]);
    const yData: DayData | undefined = yResult[yKey];

    const evo: EvolutionState = { ...(result.p_evolution ?? defaultEvo()) };
    const oldLevel = evo.level;

    if (yData && yData.shorts < DAILY_GOOD_THRESHOLD) {
      evo.streak++;
    } else if (yData && yData.shorts >= DAILY_GOOD_THRESHOLD) {
      evo.streak = 0;
    }
    // If no data yesterday, keep streak (user didn't use YouTube)

    evo.level = calculateLevel(evo.streak);

    // Always save — fixes Critical #4 (streak saved even if level unchanged)
    await safeSet({ p_evolution: evo, p_streak_checked_date: todayStr });
    console.log(`\u{1F9A0} Streak: ${evo.streak}d, Lv.${oldLevel}\u2192${evo.level}`);
  } catch (e) {
    console.warn('\u{1F9A0} Streak check failed:', e);
  }
}

// === Schema migration ===
async function migrateSchema(): Promise<void> {
  try {
    const result = await safeGet(['p_schema_version']);
    const ver = result.p_schema_version ?? 0;
    if (ver < SCHEMA_VERSION) {
      // v0 -> v1: Fix locale-dependent streak date
      if (ver < 1) {
        const old = await safeGet(['p_streak_checked_date']);
        if (old.p_streak_checked_date && old.p_streak_checked_date.includes(' ')) {
          await safeRemove(['p_streak_checked_date']);
        }
      }
      await safeSet({ p_schema_version: SCHEMA_VERSION });
      console.log(`\u{1F9A0} Schema: v${ver} \u2192 v${SCHEMA_VERSION}`);
    }
  } catch (e) {
    console.warn('\u{1F9A0} Migration failed:', e);
  }
}

// === Lifecycle ===
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`\u{1F9A0} The Parasite ${details.reason}: v0.5`);
  await migrateSchema();
  try { await cleanupOldData(OLD_DATA_CLEANUP_DAYS); } catch (e) { console.warn('\u{1F9A0} Cleanup:', e); }
});

// Streak check on every service worker startup (serialized)
serialize(() => checkDailyStreak()).catch((e) => console.warn('\u{1F9A0} Startup streak:', e));
console.log('\u{1F9A0} The Parasite background v0.5 ready');
