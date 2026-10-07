import { LocalizeSDKImpl } from './usecase/LocalizeSDKImpl.js';
/**
 * An independent instance (own store, cache namespace, fetcher). Use for multiple surfaces,
 * micro-apps, or isolated tests. Call `await client.init()` (or pass it to LocalizeProvider).
 */
export function createLocalizeClient(config, deps) {
    return new LocalizeSDKImpl(config, deps);
}
