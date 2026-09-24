import { asyncStorage } from '../../internal/optional.js';
/**
 * @react-native-async-storage/async-storage. Returns null if not installed.
 * Note: Android's SQLite backend has a ~6 MB cursor-window limit; prefer fileSystemAdapter for
 * large projects.
 */
export function asyncStorageAdapter() {
    const s = asyncStorage();
    if (!s)
        return null;
    return {
        getItem: (k) => s.getItem(k),
        setItem: (k, v) => s.setItem(k, v),
        removeItem: (k) => s.removeItem(k),
        async getAllKeys() {
            return [...(await s.getAllKeys())];
        },
    };
}
