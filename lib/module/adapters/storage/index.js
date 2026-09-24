import { devWarn } from '../../internal/logger.js';
import { asyncStorageAdapter } from './asyncStorage.js';
import { fileSystemAdapter } from './fileSystem.js';
import { memoryStorageAdapter } from './memory.js';
export { asyncStorageAdapter, fileSystemAdapter, memoryStorageAdapter };
/**
 * Default order: expo-file-system / react-native-fs → files; AsyncStorage;
 * otherwise memory (no persistence) with one dev warning.
 */
export function defaultStorage() {
    const fs = fileSystemAdapter();
    if (fs)
        return fs;
    const as = asyncStorageAdapter();
    if (as)
        return as;
    devWarn('No storage module found (expo-file-system, react-native-fs or AsyncStorage). ' +
        'Keys will not be cached across launches.');
    return memoryStorageAdapter();
}
