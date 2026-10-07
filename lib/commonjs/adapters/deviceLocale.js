"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDeviceLocale = detectDeviceLocale;
exports.normalizeLocale = normalizeLocale;
const optional_1 = require("../internal/optional");
/**
 * Device locale, tried in order: custom provider → react-native-localize → expo-localization →
 * Intl → NativeModules probing. Returns null if nothing is available.
 */
function detectDeviceLocale(provider) {
    const candidates = [
        () => provider?.(),
        () => (0, optional_1.rnLocalize)()?.getLocales()[0]?.languageTag,
        () => (0, optional_1.expoLocalization)()?.getLocales()[0]?.languageTag,
        () => globalThis.Intl?.DateTimeFormat().resolvedOptions().locale,
        () => {
            const nm = (0, optional_1.reactNative)()?.NativeModules;
            const ios = nm?.SettingsManager?.settings;
            return ios?.AppleLocale ?? ios?.AppleLanguages?.[0] ?? nm?.I18nManager?.localeIdentifier;
        },
    ];
    for (const get of candidates) {
        try {
            const tag = get();
            if (typeof tag === 'string' && tag.length > 0)
                return tag;
        }
        catch {
            // try the next provider
        }
    }
    return null;
}
/**
 * Match a tag against supportedLocales: exact (case-insensitive, `_` ≡ `-`), then primary subtag,
 * then `fallback`. Without supportedLocales the tag is returned unchanged.
 */
function normalizeLocale(tag, supported, fallback) {
    if (!supported || supported.length === 0)
        return tag;
    const canon = (s) => s.replace(/_/g, '-').toLowerCase();
    const wanted = canon(tag);
    const exact = supported.find((s) => canon(s) === wanted);
    if (exact)
        return exact;
    const primary = wanted.split('-')[0];
    const byPrimary = supported.find((s) => canon(s) === primary) ?? supported.find((s) => canon(s).split('-')[0] === primary);
    if (byPrimary)
        return byPrimary;
    return fallback ?? supported[0] ?? tag;
}
