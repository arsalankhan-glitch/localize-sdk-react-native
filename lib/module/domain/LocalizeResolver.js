import { EMPTY_STORE, isStoreEmpty } from './LocalizeStore.js';
/**
 * Resolution order:
 * 1. API response (stored in cache)
 * 2. Cached API data
 * 3. Local bundled keys
 *
 * Picks one whole store; API/cache data is never merged with local data.
 */
export function resolveStore(apiOrCache, local) {
    if (apiOrCache && !isStoreEmpty(apiOrCache))
        return apiOrCache;
    if (local && !isStoreEmpty(local))
        return local;
    return apiOrCache ?? local ?? EMPTY_STORE;
}
