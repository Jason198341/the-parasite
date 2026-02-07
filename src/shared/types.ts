// The Parasite v0.5 — Shared Type Definitions

export type EvoLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type AchievementId =
  | 'first_blood'
  | 'algorithm_slave'
  | 'zombie'
  | 'iron_will'
  | 'century'
  | 'quick_escape'
  | 'evolved'
  | 'dragon'
  | 'king';

export interface DayData {
  shorts: number;
  seconds: number;
}

export interface EvolutionState {
  level: EvoLevel;
  streak: number;
}

export interface LockState {
  until: number;
  message: string;
  totalSeconds: number;
}

// Content -> Background messages
export type Message =
  | { type: 'SHORT_VIEWED'; shortsId: string; seconds: number }
  | { type: 'LOCKDOWN_ENDURED' }
  | { type: 'QUICK_ESCAPE' }
  | { type: 'ZOMBIE_CHECK' }
  | { type: 'TIME_UPDATE'; seconds: number }
  | { type: 'GET_STATE' };

// Background -> Content response
export interface StateResponse {
  today: DayData;
  evolution: EvolutionState;
  achievements: AchievementId[];
  lockState: LockState | null;
  newAchievements?: AchievementId[];
  evolved?: { from: EvoLevel; to: EvoLevel };
}
