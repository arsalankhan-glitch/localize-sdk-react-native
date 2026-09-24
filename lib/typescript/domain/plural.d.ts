/**
 * Plural form selection based on count. Literal port of Plural.swift / Plural.kt / plural.dart,
 * including their approximations (e.g. Arabic > 99 → 'other'), so all four SDKs agree.
 */
export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
export declare function selectPluralForm(locale: string, count: number): PluralForm;
/** Opt-in CLDR rules via Intl.PluralRules (`pluralRules: 'intl'`); falls back to SDK rules. */
export declare function selectPluralFormIntl(locale: string, count: number): PluralForm;
