import { LocalizeCache } from '../src/adapters/cache';
import { memoryStorageAdapter } from '../src/adapters/storage/memory';

const PREFIX = 'localize_ba7816bf_react-native'; // sha256('abc')[0:8]

describe('LocalizeCache', () => {
  it('writes one entry per locale in the native file format', async () => {
    const storage = memoryStorageAdapter();
    const cache = new LocalizeCache(storage, 'abc', 'react-native');
    await cache.save({
      simple: { en: { a: 'A' }, ar: { a: 'ب' } },
      plural: { en: { p: { one: '1', other: 'n' } } },
    });
    expect(await storage.getItem(`${PREFIX}_en`)).toBe(
      '{"locale":"en","simple":{"a":"A"},"plural":{"p":{"one":"1","other":"n"}}}',
    );
    expect(await storage.getItem(`${PREFIX}_ar`)).toBe('{"locale":"ar","simple":{"a":"ب"},"plural":{}}');
    expect((await storage.getAllKeys!()).sort()).toEqual([`${PREFIX}_ar`, `${PREFIX}_en`, `${PREFIX}_meta`]);
  });

  it('round-trips a locale', async () => {
    const cache = new LocalizeCache(memoryStorageAdapter(), 'abc', 'react-native');
    await cache.save({ simple: { en: { a: 'A' } }, plural: { en: { p: { one: '1' } } } });
    expect(await cache.load('en')).toEqual({ simple: { en: { a: 'A' } }, plural: { en: { p: { one: '1' } } } });
    expect(await cache.load('fr')).toBeNull();
  });

  it('reads a file written by the native SDKs', async () => {
    const storage = memoryStorageAdapter({
      [`${PREFIX}_en`]: '{"plural":{"p":{"other":"x"}},"locale":"en","simple":{"k":"v","n":1}}',
    });
    const cache = new LocalizeCache(storage, 'abc', 'react-native');
    expect(await cache.load('en')).toEqual({ simple: { en: { k: 'v' } }, plural: { en: { p: { other: 'x' } } } });
  });

  it('deletes a corrupted entry and returns null', async () => {
    const storage = memoryStorageAdapter({ [`${PREFIX}_en`]: '{"locale":"en","sim' });
    const cache = new LocalizeCache(storage, 'abc', 'react-native');
    expect(await cache.load('en')).toBeNull();
    expect(await storage.getItem(`${PREFIX}_en`)).toBeNull();
  });

  it('migrates the legacy single-file cache', async () => {
    const storage = memoryStorageAdapter({
      [PREFIX]: JSON.stringify({ languages: { en: { simple: { a: 'A' } }, ar: { simple: { a: 'ب' } } } }),
    });
    const cache = new LocalizeCache(storage, 'abc', 'react-native');
    expect(await cache.load('ar')).toEqual({ simple: { ar: { a: 'ب' } }, plural: { ar: {} } });
    expect(await storage.getItem(PREFIX)).toBeNull();
    expect(await storage.getItem(`${PREFIX}_en`)).not.toBeNull();
  });

  it('records age and clears only its own namespace', async () => {
    const storage = memoryStorageAdapter({ 'other_key': 'x', 'localize_deadbeef_ios_en': '{}' });
    const cache = new LocalizeCache(storage, 'abc', 'react-native');
    expect(await cache.age()).toBeNull();
    await cache.save({ simple: { en: { a: 'A' } }, plural: {} });
    expect(await cache.age()).toBeGreaterThanOrEqual(0);
    await cache.clear();
    expect((await storage.getAllKeys!()).sort()).toEqual(['localize_deadbeef_ios_en', 'other_key']);
    await cache.clear(true);
    expect(await storage.getAllKeys!()).toEqual(['other_key']);
  });

  it('survives a throwing storage', async () => {
    const broken = {
      getItem: async () => {
        throw new Error('io');
      },
      setItem: async () => {
        throw new Error('quota');
      },
      removeItem: async () => undefined,
    };
    const cache = new LocalizeCache(broken, 'abc', 'react-native');
    await expect(cache.save({ simple: { en: { a: 'A' } }, plural: {} })).resolves.toBeUndefined();
    await expect(cache.load('en')).resolves.toBeNull();
  });
});
