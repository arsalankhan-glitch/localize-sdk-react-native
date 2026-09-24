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
export declare function defaultStorage(): LocalizeStorage;
