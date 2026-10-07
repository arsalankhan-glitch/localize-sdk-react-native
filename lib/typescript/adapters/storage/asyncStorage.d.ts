import type { LocalizeStorage } from './types';
/**
 * @react-native-async-storage/async-storage. Returns null if not installed.
 * Note: Android's SQLite backend has a ~6 MB cursor-window limit; prefer fileSystemAdapter for
 * large projects.
 */
export declare function asyncStorageAdapter(): LocalizeStorage | null;
