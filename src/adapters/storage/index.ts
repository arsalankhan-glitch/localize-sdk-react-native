import { devWarn } from '../../internal/logger';
import { asyncStorageAdapter } from './asyncStorage';
import { fileSystemAdapter } from './fileSystem';
import { memoryStorageAdapter } from './memory';
import type { LocalizeStorage } from './types';

export type { LocalizeStorage } from './types';
export { asyncStorageAdapter, fileSystemAdapter, memoryStorageAdapter };

/**
 * Default order: expo-file-system / react-native-fs → files; AsyncStorage;
 * otherwise memory (no persistence) with one dev warning.
 */
export function defaultStorage(): LocalizeStorage {
  const fs = fileSystemAdapter();
  if (fs) return fs;
  const as = asyncStorageAdapter();
  if (as) return as;
  devWarn(
    'No storage module found (expo-file-system, react-native-fs or AsyncStorage). ' +
      'Keys will not be cached across launches.',
  );
  return memoryStorageAdapter();
}
