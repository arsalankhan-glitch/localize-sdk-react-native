"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.i18nJsBundleFallback = i18nJsBundleFallback;
const MISSING = '\u0000localize-missing\u0000';
/** Per-key fallback backed by an existing i18n-js instance. */
function i18nJsBundleFallback(i18n) {
    return (locale, key, count) => {
        const value = i18n.t(key, {
            locale,
            defaultValue: MISSING,
            ...(count === undefined ? {} : { count }),
        });
        if (typeof value !== 'string' || value === MISSING || value.startsWith('[missing'))
            return null;
        return value;
    };
}
