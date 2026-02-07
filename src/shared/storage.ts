// The Parasite v0.5 — Typed Storage Helpers with Error Handling

export function getTodayKey(): string {
  const d = new Date();
  return 'p_day_' + d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

export function getDateKey(date: Date): string {
  return 'p_day_' + date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

/** Safe chrome.storage.local.get with lastError check */
export function safeGet(keys: string[]): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          console.warn('\u{1F9A0} Storage read error:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message ?? 'Storage read failed'));
          return;
        }
        resolve(result);
      });
    } catch (e) {
      console.warn('\u{1F9A0} Context invalidated during read:', e);
      reject(e);
    }
  });
}

/** Safe chrome.storage.local.get(null) — returns all keys */
export function safeGetAll(): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
          console.warn('\u{1F9A0} Storage getAll error:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message ?? 'Storage getAll failed'));
          return;
        }
        resolve(result);
      });
    } catch (e) {
      console.warn('\u{1F9A0} Context invalidated during getAll:', e);
      reject(e);
    }
  });
}

/** Safe chrome.storage.local.set with lastError check */
export function safeSet(data: Record<string, any>): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          console.warn('\u{1F9A0} Storage write error:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message ?? 'Storage write failed'));
          return;
        }
        resolve();
      });
    } catch (e) {
      console.warn('\u{1F9A0} Context invalidated during write:', e);
      reject(e);
    }
  });
}

/** Safe chrome.storage.local.remove with lastError check */
export function safeRemove(keys: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          console.warn('\u{1F9A0} Storage remove error:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message ?? 'Storage remove failed'));
          return;
        }
        resolve();
      });
    } catch (e) {
      console.warn('\u{1F9A0} Context invalidated during remove:', e);
      reject(e);
    }
  });
}

/** Remove daily data keys older than maxDays */
export async function cleanupOldData(maxDays: number): Promise<number> {
  const all = await safeGetAll();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  const cutoffKey = getDateKey(cutoff);

  const keysToRemove = Object.keys(all).filter(
    (k) => k.startsWith('p_day_') && k < cutoffKey
  );

  if (keysToRemove.length > 0) {
    await safeRemove(keysToRemove);
    console.log(`\u{1F9A0} Cleaned ${keysToRemove.length} old daily records`);
  }
  return keysToRemove.length;
}
