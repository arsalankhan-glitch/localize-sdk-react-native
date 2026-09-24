import type { LocalizeSource } from '../LocalizeConfig';
import type { StringArgs } from '../types';
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
export declare function useLocalize(): UseLocalizeResult;
/** Re-renders only when this key's resolved string changes. */
export declare function useLocalizedString(key: string, args?: StringArgs): string;
/** Re-renders only when this key's resolved plural string changes. */
export declare function useLocalizedPlural(key: string, count: number): string;
/** Current locale and a setter. */
export declare function useLocale(): [string, (locale: string) => Promise<void>];
