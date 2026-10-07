import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useLocalizeHandle } from './context.js';
/** Re-renders on every store change (refresh, setLocale, init). */
export function useLocalize() {
    const h = useLocalizeHandle();
    const version = useSyncExternalStore(h.subscribe, h.getVersion, h.getVersion);
    return useMemo(() => ({
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
export function useLocalizedString(key, args) {
    const h = useLocalizeHandle();
    const get = () => h.getString(key, args);
    return useSyncExternalStore(h.subscribe, get, get);
}
/** Re-renders only when this key's resolved plural string changes. */
export function useLocalizedPlural(key, count) {
    const h = useLocalizeHandle();
    const get = () => h.getPlural(key, count);
    return useSyncExternalStore(h.subscribe, get, get);
}
/** Current locale and a setter. */
export function useLocale() {
    const h = useLocalizeHandle();
    const locale = useSyncExternalStore(h.subscribe, h.getLocale, h.getLocale);
    const set = useCallback((l) => h.setLocale(l), [h]);
    return [locale, set];
}
