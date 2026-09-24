import { expoLocalization, reactNative, rnLocalize } from '../internal/optional';

/**
 * Device locale, tried in order: custom provider → react-native-localize → expo-localization →
 * Intl → NativeModules probing. Returns null if nothing is available.
 */
export function detectDeviceLocale(provider?: () => string | null | undefined): string | null {
  const candidates: Array<() => string | null | undefined> = [
    () => provider?.(),
    () => rnLocalize()?.getLocales()[0]?.languageTag,
    () => expoLocalization()?.getLocales()[0]?.languageTag,
    () => (globalThis as { Intl?: typeof Intl }).Intl?.DateTimeFormat().resolvedOptions().locale,
    () => {
      const nm = reactNative()?.NativeModules;
      const ios = nm?.SettingsManager?.settings as
        | { AppleLocale?: string; AppleLanguages?: string[] }
        | undefined;
      return ios?.AppleLocale ?? ios?.AppleLanguages?.[0] ?? (nm?.I18nManager?.localeIdentifier as string | undefined);
    },
  ];
  for (const get of candidates) {
    try {
      const tag = get();
      if (typeof tag === 'string' && tag.length > 0) return tag;
    } catch {
      // try the next provider
    }
  }
  return null;
}

/**
 * Match a tag against supportedLocales: exact (case-insensitive, `_` ≡ `-`), then primary subtag,
 * then `fallback`. Without supportedLocales the tag is returned unchanged.
 */
export function normalizeLocale(
  tag: string,
  supported: readonly string[] | undefined,
  fallback: string | undefined,
): string {
  if (!supported || supported.length === 0) return tag;
  const canon = (s: string) => s.replace(/_/g, '-').toLowerCase();
  const wanted = canon(tag);
  const exact = supported.find((s) => canon(s) === wanted);
  if (exact) return exact;
  const primary = wanted.split('-')[0];
  const byPrimary = supported.find((s) => canon(s) === primary) ?? supported.find((s) => canon(s).split('-')[0] === primary);
  if (byPrimary) return byPrimary;
  return fallback ?? supported[0] ?? tag;
}
