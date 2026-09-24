"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncStorageAdapter = asyncStorageAdapter;
const optional_1 = require("../../internal/optional");
/**
 * @react-native-async-storage/async-storage. Returns null if not installed.
 * Note: Android's SQLite backend has a ~6 MB cursor-window limit; prefer fileSystemAdapter for
 * large projects.
 */
function asyncStorageAdapter() {
    const s = (0, optional_1.asyncStorage)();
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
