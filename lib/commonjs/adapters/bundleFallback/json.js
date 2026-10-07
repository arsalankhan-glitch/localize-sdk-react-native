"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonBundleFallback = jsonBundleFallback;
const plural_1 = require("../../domain/plural");
/**
 * Per-key fallback from static objects: `jsonBundleFallback({ en: { hi: 'Hi', items: { one, other } } })`.
 * Plural entries are objects keyed by plural form.
 */
function jsonBundleFallback(bundles) {
    return (locale, key, count) => {
        const value = bundles[locale]?.[key];
        if (value === undefined)
            return null;
        if (typeof value === 'string')
            return count === undefined ? value : null;
        if (count === undefined)
            return null;
        const form = (0, plural_1.selectPluralForm)(locale, count);
        return value[form] ?? value.other ?? Object.values(value)[0] ?? null;
    };
}
