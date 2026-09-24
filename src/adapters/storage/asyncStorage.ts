import { asyncStorage } from '../../internal/optional';
import type { LocalizeStorage } from './types';

/**
 * @react-native-async-storage/async-storage. Returns null if not installed.
 * Note: Android's SQLite backend has a ~6 MB cursor-window limit; prefer fileSystemAdapter for
 * large projects.
 */
export function asyncStorageAdapter(): LocalizeStorage | null {
  const s = asyncStorage();
  if (!s) return null;
  return {
    getItem: (k) => s.getItem(k),
    setItem: (k, v) => s.setItem(k, v),
    removeItem: (k) => s.removeItem(k),
    async getAllKeys() {
      return [...(await s.getAllKeys())];
    },
  };
}
