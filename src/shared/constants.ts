// The Parasite v0.5 — Single Source of Truth for Constants

import type { AchievementId, EvoLevel } from './types';

export interface EvoInfo {
  level: EvoLevel;
  emoji: string;
  name: string;
  next: string;
}

export const EVOLUTION: readonly EvoInfo[] = [
  { level: 0, emoji: '\u{1F95A}', name: '\uC54C', next: '1\uC77C 10\uAC1C \uBBF8\uB9CC\uC73C\uB85C \uC720\uCDA9 \uC9C4\uD654' },
  { level: 1, emoji: '\u{1F41B}', name: '\uC720\uCDA9', next: '3\uC77C \uC5F0\uC18D 10\uAC1C \uBBF8\uB9CC\uC73C\uB85C \uB3C4\uB9C8\uBF40 \uC9C4\uD654' },
  { level: 2, emoji: '\u{1F98E}', name: '\uB3C4\uB9C8\uBF40', next: '7\uC77C \uC5F0\uC18D 10\uAC1C \uBBF8\uB9CC\uC73C\uB85C \uBB38\uC5B4 \uC9C4\uD654' },
  { level: 3, emoji: '\u{1F419}', name: '\uBB38\uC5B4', next: '14\uC77C \uC5F0\uC18D 10\uAC1C \uBBF8\uB9CC\uC73C\uB85C \uB4DC\uB798\uACE4 \uC9C4\uD654' },
  { level: 4, emoji: '\u{1F409}', name: '\uB4DC\uB798\uACE4', next: '30\uC77C \uC5F0\uC18D 10\uAC1C \uBBF8\uB9CC\uC73C\uB85C \uAE30\uC0DD\uC655 \uC9C4\uD654' },
  { level: 5, emoji: '\u{1F451}', name: '\uAE30\uC0DD\uC655', next: '\uCD5C\uC885 \uC9C4\uD654 \uB2EC\uC131!' },
];

export interface AchievementInfo {
  id: AchievementId;
  emoji: string;
  title: string;
  desc: string;
}

export const ACHIEVEMENTS: readonly AchievementInfo[] = [
  { id: 'first_blood', emoji: '\u{1FA78}', title: '\uCCAB \uAC10\uC5FC', desc: '\uAE30\uC0DD\uCDA9\uACFC \uD568\uAED8\uD55C \uCCAB \uC1FC\uCE20' },
  { id: 'algorithm_slave', emoji: '\u26D3\uFE0F', title: '\uC54C\uACE0\uB9AC\uC998\uC758 \uB178\uC608', desc: '\uD558\uB8E8 50\uAC1C \uC1FC\uCE20 \uB2EC\uC131' },
  { id: 'zombie', emoji: '\u{1F9DF}', title: '\uC0C8\uBCBD \uC880\uBE44', desc: '\uC0C8\uBCBD 2\uC2DC~5\uC2DC\uC5D0 \uC1FC\uCE20 \uC2DC\uCCAD' },
  { id: 'iron_will', emoji: '\u{1FAA8}', title: '\uCCA0\uC758 \uC758\uC9C0', desc: '\uCC28\uB2E8 \uD654\uBA74 \uD480 \uCE74\uC6B4\uD2B8 3\uD68C \uBC84\uD41C' },
  { id: 'century', emoji: '\u{1F480}', title: '\uC13C\uCD94\uB9AC', desc: '\uD558\uB8E8 100\uAC1C \uC1FC\uCE20... \uB808\uC804\uB4DC' },
  { id: 'quick_escape', emoji: '\u{1F3C3}', title: '\uC54C\uACE0\uB9AC\uC998 \uBC30\uBC18\uC790', desc: '\uC1FC\uCE20 \uB4E4\uC5B4\uAC14\uB2E4\uAC00 5\uCD08 \uC548\uC5D0 \uD0C8\uCD9C' },
  { id: 'evolved', emoji: '\u{1F98E}', title: '\uC9C4\uD654 \uC2DC\uC791', desc: '\uAE30\uC0DD\uCDA9\uC774 \uC720\uCDA9 \uC774\uC0C1\uC73C\uB85C \uC9C4\uD654' },
  { id: 'dragon', emoji: '\u{1F409}', title: '\uB4DC\uB798\uACE4 \uB2EC\uC131', desc: '14\uC77C \uC5F0\uC18D 10\uAC1C \uBBF8\uB9CC \uC720\uC9C0' },
  { id: 'king', emoji: '\u{1F451}', title: '\uAE30\uC0DD\uC655', desc: '30\uC77C \uC5F0\uC18D 10\uAC1C \uBBF8\uB9CC. \uC804\uC124.' },
];

export const LOCKDOWN_SCHEDULE = [
  { at: 10,  seconds: 30,    msg: '10\uAC1C. 30\uCD08 \uC815\uC9C0.\n\uC54C\uACE0\uB9AC\uC998\uC774 \uB110 \uD14C\uC2A4\uD2B8\uD558\uACE0 \uC788\uC5B4.' },
  { at: 20,  seconds: 60,    msg: '20\uAC1C. 1\uBD84 \uC815\uC9C0.\n\uC774\uAC74 \uC2B5\uAD00\uC774 \uC544\uB2C8\uB77C \uC911\uB3C5\uC774\uC57C.' },
  { at: 30,  seconds: 120,   msg: '30\uAC1C. 2\uBD84 \uC815\uC9C0.\n\uC774 \uC2DC\uAC04\uC5D0 \uD560 \uC218 \uC788\uB294 \uB2E4\uB978 \uC77C\uC744 \uC0DD\uAC01\uD574\uBD10.' },
  { at: 40,  seconds: 240,   msg: '40\uAC1C. 4\uBD84 \uC815\uC9C0.\n\uC9C4\uC9DC\uB85C \uC774\uAC78 \uC6D0\uD574\uC11C \uBCF4\uB294 \uAC70\uC57C?' },
  { at: 50,  seconds: 480,   msg: '50\uAC1C. 8\uBD84 \uC815\uC9C0.\n\uC194\uC9C1\uD788 \uB9D0\uD574\uBD10. \uBA48\uCD9C \uC218 \uC788\uC5B4?' },
  { at: 60,  seconds: 960,   msg: '60\uAC1C. 16\uBD84 \uC815\uC9C0.\n\uD654\uBA74\uC744 \uB044\uACE0 \uCC3D\uBC16\uC744 \uBD10.' },
  { at: 70,  seconds: 1920,  msg: '70\uAC1C. 32\uBD84 \uC815\uC9C0.\n\uB108 \uC624\uB298 \uBB50 \uD558\uB824\uACE0 \uD588\uB294\uC9C0 \uAE30\uC5B5\uB098?' },
  { at: 80,  seconds: 3840,  msg: '80\uAC1C. 1\uC2DC\uAC04 4\uBD84 \uC815\uC9C0.\n\uC774\uCBE4 \uB418\uBA74 \uB124\uAC00 \uC120\uD0DD\uD55C \uAC8C \uC544\uB2C8\uC57C.' },
  { at: 90,  seconds: 7680,  msg: '90\uAC1C. 2\uC2DC\uAC04 8\uBD84 \uC815\uC9C0.\n\uC774\uAC70 \uB05D\uB098\uBA74 \uC9C4\uC9DC \uB2E4\uB978 \uAC70 \uD574.' },
  { at: 100, seconds: 15360, msg: '100\uAC1C. 4\uC2DC\uAC04 16\uBD84 \uC815\uC9C0.\n\uC624\uB298\uC740 \uB05D\uC774\uC57C. \uB0B4\uC77C \uBCF4\uC790.' },
] as const;

export const SCHEMA_VERSION = 1;
export const BINGE_DEVOLVE_THRESHOLDS = [30, 60] as const;
export const DAILY_GOOD_THRESHOLD = 10;
export const OLD_DATA_CLEANUP_DAYS = 90;

export function calculateLevel(streak: number): EvoLevel {
  if (streak >= 30) return 5;
  if (streak >= 14) return 4;
  if (streak >= 7) return 3;
  if (streak >= 3) return 2;
  if (streak >= 1) return 1;
  return 0;
}
