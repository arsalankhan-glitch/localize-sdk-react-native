"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLocalLoader = void 0;
exports.parseLocalBundleJson = parseLocalBundleJson;
exports.parseLocalBundle = parseLocalBundle;
exports.bundleLoader = bundleLoader;
const LocalizeStore_1 = require("../domain/LocalizeStore");
/** Default loader: no bundled keys. */
const defaultLocalLoader = async () => LocalizeStore_1.EMPTY_STORE;
exports.defaultLocalLoader = defaultLocalLoader;
/**
 * Parse a bundled `{ "languages": { "en": { "simple": {...}, "plural": {...} } } }` file —
 * the same shape as the export endpoint and the other SDKs' parseLocalBundleJson.
 */
function parseLocalBundleJson(json) {
    try {
        return (0, LocalizeStore_1.parseLanguages)(JSON.parse(json));
    }
    catch {
        return null;
    }
}
/** Same as parseLocalBundleJson, for an already-imported object (`require('./strings.json')`). */
function parseLocalBundle(value) {
    return (0, LocalizeStore_1.parseLanguages)(value);
}
/** Convenience: `localLoader: bundleLoader(require('./strings.json'))`. */
function bundleLoader(value) {
    const store = parseLocalBundle(value);
    return async () => store;
}
