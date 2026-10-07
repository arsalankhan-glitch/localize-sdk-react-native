describe('storage adapters', () => {
  beforeEach(() => jest.resetModules());

  it('fileSystemAdapter uses expo-file-system files named like the native cache', async () => {
    const files = new Map<string, string>();
    jest.doMock(
      'expo-file-system/legacy',
      () => ({
        cacheDirectory: 'file:///cache/',
        getInfoAsync: async (uri: string) => ({ exists: files.has(uri) }),
        readAsStringAsync: async (uri: string) => files.get(uri)!,
        writeAsStringAsync: async (uri: string, v: string) => void files.set(uri, v),
        deleteAsync: async (uri: string) => void files.delete(uri),
        readDirectoryAsync: async () => Array.from(files.keys()).map((u) => u.split('/').pop()!),
      }),
      { virtual: true },
    );
    const { fileSystemAdapter } = require('../src/adapters/storage/fileSystem');
    const s = fileSystemAdapter();
    await s.setItem('localize_ba7816bf_react-native_en', '{}');
    expect(Array.from(files.keys())).toEqual(['file:///cache/localize_ba7816bf_react-native_en.json']);
    expect(await s.getItem('localize_ba7816bf_react-native_en')).toBe('{}');
    expect(await s.getItem('missing')).toBeNull();
    expect(await s.getAllKeys()).toEqual(['localize_ba7816bf_react-native_en']);
    await s.removeItem('localize_ba7816bf_react-native_en');
    expect(files.size).toBe(0);
  });

  it('fileSystemAdapter falls back to react-native-fs', async () => {
    const files = new Map<string, string>();
    jest.doMock('expo-file-system/legacy', () => { throw new Error('missing'); }, { virtual: true });
    jest.doMock('expo-file-system', () => { throw new Error('missing'); }, { virtual: true });
    jest.doMock(
      'react-native-fs',
      () => ({
        CachesDirectoryPath: '/data/cache',
        exists: async (p: string) => files.has(p),
        readFile: async (p: string) => files.get(p)!,
        writeFile: async (p: string, v: string) => void files.set(p, v),
        unlink: async (p: string) => void files.delete(p),
        readdir: async () => Array.from(files.keys()).map((p) => p.split('/').pop()!),
      }),
      { virtual: true },
    );
    const { fileSystemAdapter } = require('../src/adapters/storage/fileSystem');
    const s = fileSystemAdapter();
    await s.setItem('k', 'v');
    expect(Array.from(files.keys())).toEqual(['/data/cache/k.json']);
    expect(await s.getItem('k')).toBe('v');
  });

  it('defaultStorage: file system → AsyncStorage → memory', async () => {
    jest.doMock('expo-file-system/legacy', () => { throw new Error('missing'); }, { virtual: true });
    jest.doMock('expo-file-system', () => { throw new Error('missing'); }, { virtual: true });
    jest.doMock('react-native-fs', () => { throw new Error('missing'); }, { virtual: true });
    const store = new Map<string, string>();
    jest.doMock(
      '@react-native-async-storage/async-storage',
      () => ({
        default: {
          getItem: async (k: string) => store.get(k) ?? null,
          setItem: async (k: string, v: string) => void store.set(k, v),
          removeItem: async (k: string) => void store.delete(k),
          getAllKeys: async () => Array.from(store.keys()),
        },
      }),
      { virtual: true },
    );
    const { defaultStorage } = require('../src/adapters/storage');
    const s = defaultStorage();
    await s.setItem('a', 'b');
    expect(store.get('a')).toBe('b');
  });

  it('defaultStorage falls back to memory with a warning', async () => {
    jest.doMock('expo-file-system/legacy', () => { throw new Error('missing'); }, { virtual: true });
    jest.doMock('expo-file-system', () => { throw new Error('missing'); }, { virtual: true });
    jest.doMock('react-native-fs', () => { throw new Error('missing'); }, { virtual: true });
    jest.doMock('@react-native-async-storage/async-storage', () => { throw new Error('missing'); }, { virtual: true });
    const { defaultStorage } = require('../src/adapters/storage');
    const s = defaultStorage();
    await s.setItem('a', 'b');
    expect(await s.getItem('a')).toBe('b');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('No storage module found'));
  });
});
