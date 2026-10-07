import { type LocalizeStore } from '../domain/LocalizeStore';
/** Default loader: no bundled keys. */
export declare const defaultLocalLoader: () => Promise<LocalizeStore>;
/**
 * Parse a bundled `{ "languages": { "en": { "simple": {...}, "plural": {...} } } }` file —
 * the same shape as the export endpoint and the other SDKs' parseLocalBundleJson.
 */
export declare function parseLocalBundleJson(json: string): LocalizeStore | null;
/** Same as parseLocalBundleJson, for an already-imported object (`require('./strings.json')`). */
export declare function parseLocalBundle(value: unknown): LocalizeStore | null;
/** Convenience: `localLoader: bundleLoader(require('./strings.json'))`. */
export declare function bundleLoader(value: unknown): () => Promise<LocalizeStore | null>;
