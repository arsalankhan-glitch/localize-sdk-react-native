/**
 * Device locale, tried in order: custom provider → react-native-localize → expo-localization →
 * Intl → NativeModules probing. Returns null if nothing is available.
 */
export declare function detectDeviceLocale(provider?: () => string | null | undefined): string | null;
/**
 * Match a tag against supportedLocales: exact (case-insensitive, `_` ≡ `-`), then primary subtag,
 * then `fallback`. Without supportedLocales the tag is returned unchanged.
 */
export declare function normalizeLocale(tag: string, supported: readonly string[] | undefined, fallback: string | undefined): string;
