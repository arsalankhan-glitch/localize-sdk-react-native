import type { BundleFallback } from '../../LocalizeConfig';
type Value = string | Readonly<Record<string, string>>;
/**
 * Per-key fallback from static objects: `jsonBundleFallback({ en: { hi: 'Hi', items: { one, other } } })`.
 * Plural entries are objects keyed by plural form.
 */
export declare function jsonBundleFallback(bundles: Readonly<Record<string, Readonly<Record<string, Value>>>>): BundleFallback;
export {};
