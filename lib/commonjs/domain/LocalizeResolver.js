"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveStore = resolveStore;
const LocalizeStore_1 = require("./LocalizeStore");
/**
 * Resolution order:
 * 1. API response (stored in cache)
 * 2. Cached API data
 * 3. Local bundled keys
 *
 * Picks one whole store; API/cache data is never merged with local data.
 */
function resolveStore(apiOrCache, local) {
    if (apiOrCache && !(0, LocalizeStore_1.isStoreEmpty)(apiOrCache))
        return apiOrCache;
    if (local && !(0, LocalizeStore_1.isStoreEmpty)(local))
        return local;
    return apiOrCache ?? local ?? LocalizeStore_1.EMPTY_STORE;
}
