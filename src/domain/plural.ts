/**
 * Plural form selection based on count. Literal port of Plural.swift / Plural.kt / plural.dart,
 * including their approximations (e.g. Arabic > 99 → 'other'), so all four SDKs agree.
 */
export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export function selectPluralForm(locale: string, count: number): PluralForm {
  const lang = (locale.split(/[-_]/)[0] ?? '').toLowerCase();
  switch (lang) {
    case 'ar':
      return arabicPlural(count);
    case 'ru':
    case 'uk':
    case 'pl':
      return slavicPlural(count);
    case 'fr':
      return frenchPlural(count);
    default:
      return defaultPlural(count);
  }
}

function defaultPlural(count: number): PluralForm {
  return count === 1 ? 'one' : 'other';
}

function arabicPlural(count: number): PluralForm {
  if (count === 0) return 'zero';
  if (count === 1) return 'one';
  if (count === 2) return 'two';
  if (count >= 3 && count <= 10) return 'few';
  if (count >= 11 && count <= 99) return 'many';
  return 'other';
}

// Dart/Kotlin/Swift `%` keeps the dividend's sign, same as JS `%`.
function slavicPlural(count: number): PluralForm {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'few';
  if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 19)) return 'many';
  return 'other';
}

function frenchPlural(count: number): PluralForm {
  return count === 0 || count === 1 ? 'one' : 'other';
}

/** Opt-in CLDR rules via Intl.PluralRules (`pluralRules: 'intl'`); falls back to SDK rules. */
export function selectPluralFormIntl(locale: string, count: number): PluralForm {
  try {
    const Rules = (globalThis as { Intl?: typeof Intl }).Intl?.PluralRules;
    if (Rules) return new Rules(locale.replace('_', '-')).select(count) as PluralForm;
  } catch {
    // unsupported locale tag or missing ICU data
  }
  return selectPluralForm(locale, count);
}
