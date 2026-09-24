import { EMPTY_STORE, parseLanguages } from '../domain/LocalizeStore.js';
/** Default loader: no bundled keys. */
export const defaultLocalLoader = async () => EMPTY_STORE;
/**
 * Parse a bundled `{ "languages": { "en": { "simple": {...}, "plural": {...} } } }` file —
 * the same shape as the export endpoint and the other SDKs' parseLocalBundleJson.
 */
export function parseLocalBundleJson(json) {
    try {
        return parseLanguages(JSON.parse(json));
    }
    catch {
        return null;
    }
}
/** Same as parseLocalBundleJson, for an already-imported object (`require('./strings.json')`). */
export function parseLocalBundle(value) {
    return parseLanguages(value);
}
/** Convenience: `localLoader: bundleLoader(require('./strings.json'))`. */
export function bundleLoader(value) {
    const store = parseLocalBundle(value);
    return async () => store;
}
