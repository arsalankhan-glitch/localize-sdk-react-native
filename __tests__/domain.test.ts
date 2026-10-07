import { createHash } from 'crypto';
import { interpolate, interpolateNamed } from '../src/domain/interpolation';
import { resolveStore } from '../src/domain/LocalizeResolver';
import { extractLocale, hasNoKeys, parseLanguages } from '../src/domain/LocalizeStore';
import { selectPluralForm, selectPluralFormIntl } from '../src/domain/plural';
import { cachePrefix } from '../src/adapters/cache';
import { sha256Hex } from '../src/internal/sha256';
import { isRTL } from '../src/internal/rtl';

describe('selectPluralForm (parity with Plural.swift / .kt / .dart)', () => {
  it.each([
    ['en', 0, 'other'], ['en', 1, 'one'], ['en', 2, 'other'], ['en', -1, 'other'],
    ['sw', 1, 'one'], ['de', 5, 'other'],
    ['ar', 0, 'zero'], ['ar', 1, 'one'], ['ar', 2, 'two'], ['ar', 3, 'few'], ['ar', 10, 'few'],
    ['ar', 11, 'many'], ['ar', 99, 'many'], ['ar', 100, 'other'], ['ar', 103, 'other'],
    ['ru', 1, 'one'], ['ru', 21, 'one'], ['ru', 11, 'many'], ['ru', 2, 'few'], ['ru', 24, 'few'],
    ['ru', 12, 'many'], ['ru', 5, 'many'], ['ru', 0, 'many'], ['pl', 22, 'few'], ['uk', 111, 'many'],
    ['fr', 0, 'one'], ['fr', 1, 'one'], ['fr', 2, 'other'],
    ['ar-EG', 3, 'few'], ['AR_ae', 2, 'two'], ['en-GB', 1, 'one'],
  ])('%s %d → %s', (locale, count, form) => {
    expect(selectPluralForm(locale, count)).toBe(form);
  });

  it('intl rules use real CLDR (Arabic 103 → few)', () => {
    expect(selectPluralFormIntl('ar', 103)).toBe('few');
    expect(selectPluralFormIntl('en', 1)).toBe('one');
  });
});

describe('interpolate (single pass, Flutter/Android semantics)', () => {
  it('replaces %s %d %@ in order', () => {
    expect(interpolate('A=%s B=%d C=%@', ['x', 2, 'y'])).toBe('A=x B=2 C=y');
  });
  it('never re-scans injected text', () => {
    expect(interpolate('%s and %s', ['50%d', 'z'])).toBe('50%d and z');
  });
  it('leaves extra placeholders literal and ignores extra args', () => {
    expect(interpolate('%s %s', ['a'])).toBe('a %s');
    expect(interpolate('%s', ['a', 'b'])).toBe('a');
  });
  it('stringifies like toString()', () => {
    expect(interpolate('%s|%s|%s', [null, undefined, { a: 1 }])).toBe('null|undefined|[object Object]');
  });
  it('returns template unchanged with no args', () => {
    expect(interpolate('100%s', [])).toBe('100%s');
  });
  it('named placeholders are opt-in', () => {
    expect(interpolateNamed('Hi {{name}}, {n} new, {missing}', { name: 'Sara', n: 3 })).toBe('Hi Sara, 3 new, {missing}');
  });
});

describe('store parsing', () => {
  it('drops non-string values and non-object plural entries', () => {
    const store = parseLanguages({
      languages: {
        en: {
          simple: { a: 'A', n: 42, x: null, o: { nested: 1 }, e: '' },
          plural: { p: { one: '1', other: 5 }, bad: 'str', empty: {} },
        },
        broken: 'nope',
      },
    });
    expect(store).toEqual({ simple: { en: { a: 'A', e: '' } }, plural: { en: { p: { one: '1' } } } });
  });
  it('returns null without a languages object', () => {
    expect(parseLanguages([])).toBeNull();
    expect(parseLanguages({ platform: 'x' })).toBeNull();
    expect(parseLanguages(null)).toBeNull();
  });
  it('hasNoKeys detects empty exports', () => {
    expect(hasNoKeys({ simple: {}, plural: {} })).toBe(true);
    expect(hasNoKeys({ simple: { en: {} }, plural: { en: {} } })).toBe(true);
    expect(hasNoKeys({ simple: { en: { a: 'b' } }, plural: {} })).toBe(false);
  });
  it('extractLocale keeps current + fallback only', () => {
    const full = { simple: { en: { a: '1' }, ar: { a: '2' }, fr: { a: '3' } }, plural: { fr: { p: { one: 'x' } } } };
    expect(extractLocale(full, 'fr', 'en')).toEqual({
      simple: { fr: { a: '3' }, en: { a: '1' } },
      plural: { fr: { p: { one: 'x' } } },
    });
  });
  it('resolver prefers api/cache over local, whole store', () => {
    const api = { simple: { en: { a: 'api' } }, plural: {} };
    const local = { simple: { en: { a: 'local', b: 'local' } }, plural: {} };
    expect(resolveStore(api, local)).toBe(api);
    expect(resolveStore(null, local)).toBe(local);
    expect(resolveStore({ simple: {}, plural: {} }, local)).toBe(local);
  });
});

describe('sha256 (cache prefix parity)', () => {
  it.each(['', 'abc', 'pk_test', 'pk_live_1234567890', 'مرحبا 👋', 'a'.repeat(55), 'a'.repeat(56), 'b'.repeat(64), 'c'.repeat(1000)])(
    'matches node crypto for %p',
    (input) => {
      expect(sha256Hex(input)).toBe(createHash('sha256').update(input, 'utf8').digest('hex'));
    },
  );
  it('builds the native cache prefix', () => {
    expect(cachePrefix('abc', 'react-native')).toBe('localize_ba7816bf_react-native');
  });
});

describe('isRTL', () => {
  it.each([['ar', true], ['ar-AE', true], ['he', true], ['fa_IR', true], ['en', false], ['fr-CA', false]])(
    '%s → %s',
    (l, v) => expect(isRTL(l)).toBe(v),
  );
});
