import type { LocalizeStorage } from './types';

/** In-memory storage: tests, SSR, and the last-resort fallback. Lost on restart. */
export function memoryStorageAdapter(initial: Record<string, string> = {}): LocalizeStorage {
  const map = new Map(Object.entries(initial));
  return {
    async getItem(key) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
    async getAllKeys() {
      return Array.from(map.keys());
    },
  };
}
