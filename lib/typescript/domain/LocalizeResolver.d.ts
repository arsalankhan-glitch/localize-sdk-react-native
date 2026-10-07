import { type LocalizeStore } from './LocalizeStore';
/**
 * Resolution order:
 * 1. API response (stored in cache)
 * 2. Cached API data
 * 3. Local bundled keys
 *
 * Picks one whole store; API/cache data is never merged with local data.
 */
export declare function resolveStore(apiOrCache: LocalizeStore | null | undefined, local: LocalizeStore | null | undefined): LocalizeStore;
