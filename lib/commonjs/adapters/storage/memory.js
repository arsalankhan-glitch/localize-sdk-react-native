"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryStorageAdapter = memoryStorageAdapter;
/** In-memory storage: tests, SSR, and the last-resort fallback. Lost on restart. */
function memoryStorageAdapter(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        async getItem(key) {
            return map.has(key) ? map.get(key) : null;
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
