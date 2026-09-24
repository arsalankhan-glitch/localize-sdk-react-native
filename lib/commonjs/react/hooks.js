"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLocalize = useLocalize;
exports.useLocalizedString = useLocalizedString;
exports.useLocalizedPlural = useLocalizedPlural;
exports.useLocale = useLocale;
const react_1 = require("react");
const context_1 = require("./context");
/** Re-renders on every store change (refresh, setLocale, init). */
function useLocalize() {
    const h = (0, context_1.useLocalizeHandle)();
    const version = (0, react_1.useSyncExternalStore)(h.subscribe, h.getVersion, h.getVersion);
    return (0, react_1.useMemo)(() => ({
        t: (key, args) => h.getString(key, args),
        plural: (key, count) => h.getPlural(key, count),
        locale: h.getLocale(),
        setLocale: h.setLocale,
        refresh: h.refresh,
        isRTL: h.isRTL(),
        source: h.getSource(),
        version,
    }), [h, version]);
}
/** Re-renders only when this key's resolved string changes. */
function useLocalizedString(key, args) {
    const h = (0, context_1.useLocalizeHandle)();
    const get = () => h.getString(key, args);
    return (0, react_1.useSyncExternalStore)(h.subscribe, get, get);
}
/** Re-renders only when this key's resolved plural string changes. */
function useLocalizedPlural(key, count) {
    const h = (0, context_1.useLocalizeHandle)();
    const get = () => h.getPlural(key, count);
    return (0, react_1.useSyncExternalStore)(h.subscribe, get, get);
}
/** Current locale and a setter. */
function useLocale() {
    const h = (0, context_1.useLocalizeHandle)();
    const locale = (0, react_1.useSyncExternalStore)(h.subscribe, h.getLocale, h.getLocale);
    const set = (0, react_1.useCallback)((l) => h.setLocale(l), [h]);
    return [locale, set];
}
