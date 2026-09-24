import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { LocalizeSource } from '../LocalizeConfig';
import type { StringArgs } from '../types';
import { useLocalizeHandle } from './context';

export interface UseLocalizeResult {
  t: (key: string, args?: StringArgs) => string;
  plural: (key: string, count: number) => string;
  locale: string;
  setLocale: (locale: string) => Promise<void>;
  refresh: () => Promise<boolean>;
  isRTL: boolean;
  source: LocalizeSource;
  /** Changes whenever keys or locale change. */
  version: number;
}

/** Re-renders on every store change (refresh, setLocale, init). */
export function useLocalize(): UseLocalizeResult {
  const h = useLocalizeHandle();
  const version = useSyncExternalStore(h.subscribe, h.getVersion, h.getVersion);
  return useMemo(
    () => ({
      t: (key: string, args?: StringArgs) => h.getString(key, args),
      plural: (key: string, count: number) => h.getPlural(key, count),
      locale: h.getLocale(),
      setLocale: h.setLocale,
      refresh: h.refresh,
      isRTL: h.isRTL(),
      source: h.getSource(),
      version,
    }),
    [h, version],
  );
}

/** Re-renders only when this key's resolved string changes. */
export function useLocalizedString(key: string, args?: StringArgs): string {
  const h = useLocalizeHandle();
  const get = () => h.getString(key, args);
  return useSyncExternalStore(h.subscribe, get, get);
}

/** Re-renders only when this key's resolved plural string changes. */
export function useLocalizedPlural(key: string, count: number): string {
  const h = useLocalizeHandle();
  const get = () => h.getPlural(key, count);
  return useSyncExternalStore(h.subscribe, get, get);
}

/** Current locale and a setter. */
export function useLocale(): [string, (locale: string) => Promise<void>] {
  const h = useLocalizeHandle();
  const locale = useSyncExternalStore(h.subscribe, h.getLocale, h.getLocale);
  const set = useCallback((l: string) => h.setLocale(l), [h]);
  return [locale, set];
}
