"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRTL = isRTL;
const RTL_LANGUAGES = new Set([
    'ar', 'he', 'iw', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ku', 'ckb', 'nqo', 'rhg',
]);
/** Pure check over the primary language subtag. No native calls. */
function isRTL(locale) {
    const lang = (locale.split(/[-_]/)[0] ?? '').toLowerCase();
    return RTL_LANGUAGES.has(lang);
}
