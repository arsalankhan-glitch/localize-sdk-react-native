import type { LocalizeConfigInput } from './LocalizeConfig';
import { LocalizeSDKImpl, type LocalizeDependencies } from './usecase/LocalizeSDKImpl';
export type LocalizeClient = LocalizeSDKImpl;
/**
 * An independent instance (own store, cache namespace, fetcher). Use for multiple surfaces,
 * micro-apps, or isolated tests. Call `await client.init()` (or pass it to LocalizeProvider).
 */
export declare function createLocalizeClient(config: LocalizeConfigInput, deps?: LocalizeDependencies): LocalizeClient;
