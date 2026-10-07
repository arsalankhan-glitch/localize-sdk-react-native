import { AppState, I18nManager } from 'react-native';
import { memoryStorageAdapter } from '../src/adapters/storage/memory';
import { bundleLoader } from '../src/adapters/loader';
import { jsonBundleFallback } from '../src/adapters/bundleFallback/json';
import { EN_AR, FakeServer, flush, makeClient } from './helpers';

const PREFIX = 'localize_'; // entries are namespaced; tests only check presence

describe('download, cache, re-download', () => {
  it('first launch online (cache-first): resolves empty, then applies API keys and caches every locale', async () => {
    const server = new FakeServer(EN_AR);
    const storage = memoryStorageAdapter();
    const updates = jest.fn();
    const client = makeClient(server, storage, { onKeysUpdated: updates });

    const result = await client.init();
    expect(result.source).toBe('none');

    await flush();
    expect(client.getSource()).toBe('api');
    expect(client.getString('welcome')).toBe('Welcome');
    expect(updates).toHaveBeenCalledTimes(2); // initial store, then API store
    const keys = (await storage.getAllKeys!()).filter((k) => k.startsWith(PREFIX)).sort();
    expect(keys.map((k) => k.split('_').pop())).toEqual(['ar', 'en', 'meta']);
  });

  it('relaunch offline: serves from cache, including locale switch and fallback', async () => {
    const server = new FakeServer(EN_AR);
    const storage = memoryStorageAdapter();
    await makeClient(server, storage).init();
    await flush();

    server.offline = true;
    const onError = jest.fn();
    const app = makeClient(server, storage, { onError });
    expect(await app.init()).toEqual({ source: 'cache', locales: ['en'] });
    expect(app.getString('welcome')).toBe('Welcome');

    await app.setLocale('ar');
    expect(app.getString('welcome')).toBe('أهلا');
    expect(app.getString('only_en')).toBe('English only');
    await flush();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'network' }));
  });

  it('refresh picks up changed, added and deleted keys, updates the cache and notifies', async () => {
    const server = new FakeServer(EN_AR);
    const storage = memoryStorageAdapter();
    const app = makeClient(server, storage);
    await app.init();
    await flush();

    server.languages = { en: { simple: { welcome: 'Welcome v2', new_key: 'New' } } };
    const listener = jest.fn();
    app.subscribe(listener);
    expect(await app.refresh()).toBe(true);
    expect(listener).toHaveBeenCalled();
    expect(app.getString('welcome')).toBe('Welcome v2');
    expect(app.getString('new_key')).toBe('New');
    expect(app.getString('only_en')).toBe('only_en');

    server.offline = true;
    const relaunched = makeClient(server, storage);
    await relaunched.init();
    expect(relaunched.getString('welcome')).toBe('Welcome v2');
  });

  it.each(['offline', '401', '500'])('refresh failing (%s) keeps current values and still fires onKeysUpdated', async (mode) => {
    const server = new FakeServer(EN_AR);
    const updates = jest.fn();
    const app = makeClient(server, memoryStorageAdapter(), { onKeysUpdated: updates });
    await app.init();
    await flush();
    updates.mockClear();

    if (mode === 'offline') server.offline = true;
    else server.status = Number(mode);
    expect(await app.refresh()).toBe(false);
    expect(app.getString('welcome')).toBe('Welcome');
    expect(updates).toHaveBeenCalledTimes(1);
  });

  it('an empty export does NOT wipe working strings (§15.2 fixed)', async () => {
    const server = new FakeServer(EN_AR);
    const app = makeClient(server);
    await app.init();
    await flush();

    server.languages = {};
    expect(await app.refresh()).toBe(false);
    expect(app.getString('welcome')).toBe('Welcome');

    server.rawBody = '';
    expect(await app.refresh()).toBe(false);
    expect(app.getString('welcome')).toBe('Welcome');
  });

  it('concurrent refresh() calls share one request and one promise', async () => {
    const server = new FakeServer(EN_AR);
    const app = makeClient(server);
    await app.init();
    await flush();
    server.requests = [];

    server.hold();
    const a = app.refresh();
    const b = app.refresh();
    expect(a).toBe(b);
    server.release();
    expect(await Promise.all([a, b])).toEqual([true, true]);
    expect(server.requests).toHaveLength(1);
  });

  it('refresh() during configure joins the start-up fetch', async () => {
    const server = new FakeServer(EN_AR);
    server.hold();
    const app = makeClient(server);
    const init = app.init();
    const refreshed = app.refresh();
    await init;
    server.release();
    expect(await refreshed).toBe(true);
    expect(server.requests).toHaveLength(1);
  });

  it('only init() and refresh() touch the network', async () => {
    const server = new FakeServer(EN_AR);
    const app = makeClient(server);
    await app.init();
    await flush();
    await app.setLocale('ar');
    app.getString('welcome');
    app.getPlural('items', 3);
    expect(server.requests).toHaveLength(1);
  });

  it('cacheTtlSeconds skips the start-up fetch while the cache is fresh', async () => {
    const server = new FakeServer(EN_AR);
    const storage = memoryStorageAdapter();
    await makeClient(server, storage).init();
    await flush();
    server.requests = [];

    await makeClient(server, storage, { cacheTtlSeconds: 3600 }).init();
    await flush();
    expect(server.requests).toHaveLength(0);

    await makeClient(server, storage, { cacheTtlSeconds: 0 }).init();
    await flush();
    expect(server.requests).toHaveLength(1);
  });

  it('retries a failed start-up fetch with backoff', async () => {
    const server = new FakeServer(EN_AR);
    server.status = 503;
    const app = makeClient(server, memoryStorageAdapter(), { retry: { attempts: 2, baseDelayMs: 1, maxDelayMs: 2 } });
    await app.init();
    await new Promise<void>((r) => setTimeout(r, 30));
    expect(server.requests).toHaveLength(3);
  });
});

describe('api-first', () => {
  it('waits for the API when it answers', async () => {
    const server = new FakeServer(EN_AR);
    const app = makeClient(server, memoryStorageAdapter(), { initStrategy: 'api-first' });
    expect(await app.init()).toEqual({ source: 'api', locales: ['en'] });
    expect(app.getString('welcome')).toBe('Welcome');
  });

  it('falls back to cache after initTimeoutMs', async () => {
    const server = new FakeServer(EN_AR);
    const storage = memoryStorageAdapter();
    await makeClient(server, storage).init();
    await flush();

    server.delayMs = 500;
    const app = makeClient(server, storage, { initStrategy: 'api-first', initTimeoutMs: 20 });
    const started = Date.now();
    expect((await app.init()).source).toBe('cache');
    expect(Date.now() - started).toBeLessThan(300);
  });
});

describe('bundle and fallbacks', () => {
  const bundle = bundleLoader({
    languages: { en: { simple: { welcome: 'Bundled welcome', bundled_only: 'B' } }, ar: { simple: { welcome: 'مرحبا (bundle)' } } },
  });

  it('offline first launch uses the bundled store, then API replaces it', async () => {
    const server = new FakeServer(EN_AR);
    server.hold();
    const app = makeClient(server, memoryStorageAdapter(), { localLoader: bundle });
    expect((await app.init()).source).toBe('bundle');
    expect(app.getString('welcome')).toBe('Bundled welcome');
    server.release();
    await flush();
    expect(app.getString('welcome')).toBe('Welcome');
    expect(app.getSource()).toBe('api');
  });

  it('setLocale with no cache merges that locale from the bundle', async () => {
    const server = new FakeServer(EN_AR);
    server.offline = true;
    const app = makeClient(server, memoryStorageAdapter(), { localLoader: bundle });
    await app.init();
    await app.setLocale('ar');
    expect(app.getString('welcome')).toBe('مرحبا (bundle)');
  });

  it('getString chain: locale → fallback → bundleFallback(locale) → bundleFallback(fallback) → missingKeyHandler → key', async () => {
    const server = new FakeServer(EN_AR);
    const app = makeClient(server, memoryStorageAdapter(), {
      locale: 'ar',
      bundleFallback: jsonBundleFallback({ ar: { b_ar: 'ب' }, en: { b_en: 'E', items_b: { one: 'one b', other: '%d b' } } }),
      missingKeyHandler: (key) => (key === 'handled' ? 'HANDLED' : undefined),
    });
    await app.init();
    await flush();
    expect(app.getString('welcome')).toBe('أهلا');
    expect(app.getString('only_en')).toBe('English only');
    expect(app.getString('b_ar')).toBe('ب');
    expect(app.getString('b_en')).toBe('E');
    expect(app.getString('handled')).toBe('HANDLED');
    expect(app.getString('nope')).toBe('nope');
    expect(app.getStringOrNull('nope')).toBeNull();
    expect(app.getPlural('items_b', 1)).toBe('one b');
  });

  it('getPlural uses the locale rules and interpolates count', async () => {
    const app = makeClient(new FakeServer(EN_AR));
    await app.init();
    await flush();
    expect(app.getPlural('items', 1)).toBe('1 item');
    expect(app.getPlural('items', 5)).toBe('5 items');
    await app.setLocale('ar');
    expect(app.getPlural('items', 0)).toBe('لا عناصر');
    expect(app.getPlural('items', 7)).toBe('7 عناصر');
    expect(app.getPlural('items', 150)).toBe('150 عنصر');
    expect(app.getPlural('missing', 2)).toBe('missing');
  });

  it('interpolates positional and named args', async () => {
    const server = new FakeServer({ en: { simple: { greeting: 'Hello, %s!', named: 'Hi {{name}}, %d new' } } });
    const app = makeClient(server);
    await app.init();
    await flush();
    expect(app.getString('greeting', ['Sara'])).toBe('Hello, Sara!');
    expect(app.getString('named', { args: [3], named: { name: 'Sara' } })).toBe('Hi Sara, 3 new');
  });

  it('a throwing callback never breaks the SDK', async () => {
    const server = new FakeServer(EN_AR);
    const app = makeClient(server, memoryStorageAdapter(), {
      onKeysUpdated: () => {
        throw new Error('boom');
      },
      missingKeyHandler: () => {
        throw new Error('boom');
      },
    });
    await app.init();
    await flush();
    expect(app.getString('welcome')).toBe('Welcome');
    expect(app.getString('nope')).toBe('nope');
  });
});

describe('locales', () => {
  it('rapid setLocale: last call wins', async () => {
    const server = new FakeServer({ ...EN_AR, fr: { simple: { welcome: 'Bienvenue' } } });
    const app = makeClient(server);
    await app.init();
    await flush();
    const a = app.setLocale('ar');
    const b = app.setLocale('fr');
    await Promise.all([a, b]);
    expect(app.getLocale()).toBe('fr');
    expect(app.getString('welcome')).toBe('Bienvenue');
  });

  it('rapid setLocale: a slower earlier load is discarded', async () => {
    const server = new FakeServer({ ...EN_AR, fr: { simple: { welcome: 'Bienvenue' } } });
    const inner = memoryStorageAdapter();
    const slowAr = {
      ...inner,
      getItem: async (k: string) => {
        if (k.endsWith('_ar')) await new Promise<void>((r) => setTimeout(r, 30));
        return inner.getItem(k);
      },
    };
    const app = makeClient(server, slowAr);
    await app.init();
    await flush();
    const a = app.setLocale('ar');
    const b = app.setLocale('fr');
    await Promise.all([a, b]);
    expect(app.getLocale()).toBe('fr');
    expect(app.getString('welcome')).toBe('Bienvenue');
    expect(app.getLoadedLocales()).not.toContain('ar');
  });

  it('a cache read that started before an API response is discarded', async () => {
    const server = new FakeServer(EN_AR);
    const inner = memoryStorageAdapter();
    await makeClient(server, inner).init();
    await flush();
    let releaseRead: () => void = () => undefined;
    const slow = {
      ...inner,
      getItem: async (k: string) => {
        const value = await inner.getItem(k); // old value, read before the API lands
        if (k.endsWith('_en')) await new Promise<void>((r) => (releaseRead = r));
        return value;
      },
    };
    server.languages = { en: { simple: { welcome: 'Fresh' } } };
    const app = makeClient(server, slow);
    const init = app.init();
    await app.refresh(); // API lands while the start-up cache read is still pending
    releaseRead();
    await init;
    expect(app.getString('welcome')).toBe('Fresh');
  });

  it('setLocale during a refresh: the refresh extracts the new locale', async () => {
    const server = new FakeServer(EN_AR);
    const app = makeClient(server);
    await app.init();
    await flush();
    server.hold();
    const refreshing = app.refresh();
    await app.setLocale('ar');
    server.release();
    await refreshing;
    expect(app.getString('welcome')).toBe('أهلا');
    expect(app.getLoadedLocales().sort()).toEqual(['ar', 'en']);
  });

  it('supportedLocales normalises tags', async () => {
    const app = makeClient(new FakeServer(EN_AR), memoryStorageAdapter(), {
      locale: 'ar-AE',
      supportedLocales: ['en', 'ar'],
    });
    await app.init();
    expect(app.getLocale()).toBe('ar');
    await app.setLocale('en_GB');
    expect(app.getLocale()).toBe('en');
  });

  it('persistLocale restores the last choice', async () => {
    const storage = memoryStorageAdapter();
    const server = new FakeServer(EN_AR);
    const first = makeClient(server, storage, { persistLocale: true });
    await first.init();
    await first.setLocale('ar');
    await flush();
    const second = makeClient(server, storage, { persistLocale: true });
    await second.init();
    expect(second.getLocale()).toBe('ar');
  });

  it('detectDeviceLocale uses a custom provider', async () => {
    const app = makeClient(new FakeServer(EN_AR), memoryStorageAdapter(), {
      detectDeviceLocale: true,
      deviceLocaleProvider: () => 'ar-EG',
      supportedLocales: ['en', 'ar'],
    });
    await app.init();
    expect(app.getLocale()).toBe('ar');
  });

  it('preloadLocale warms a locale from cache', async () => {
    const server = new FakeServer(EN_AR);
    const storage = memoryStorageAdapter();
    await makeClient(server, storage).init();
    await flush();
    server.offline = true;
    const app = makeClient(server, storage);
    await app.init();
    expect(await app.preloadLocale('ar')).toBe(true);
    expect(await app.preloadLocale('xx')).toBe(false);
  });

  it('autoApplyRTL flips I18nManager and asks for a restart', async () => {
    I18nManager.isRTL = false;
    const restart = jest.fn();
    const app = makeClient(new FakeServer(EN_AR), memoryStorageAdapter(), {
      autoApplyRTL: true,
      onRTLChangeRequiresRestart: restart,
    });
    await app.init();
    await app.setLocale('ar');
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
    expect(restart).toHaveBeenCalledWith('ar');
    expect(app.isRTL()).toBe(true);
    I18nManager.isRTL = false;
  });
});

describe('RN lifecycle', () => {
  it('refreshOnAppForeground refreshes on resume, throttled', async () => {
    const server = new FakeServer(EN_AR);
    const app = makeClient(server, memoryStorageAdapter(), { refreshOnAppForeground: 0 });
    await app.init();
    await flush();
    server.requests = [];

    (AppState as unknown as { __emit(s: string): void }).__emit('background');
    (AppState as unknown as { __emit(s: string): void }).__emit('active');
    await flush();
    expect(server.requests).toHaveLength(1);

    app.dispose();
    expect((AppState as unknown as { __listenerCount(): number }).__listenerCount()).toBe(0);
  });

  it('foreground refresh respects the throttle window', async () => {
    const server = new FakeServer(EN_AR);
    const app = makeClient(server, memoryStorageAdapter(), { refreshOnAppForeground: true });
    await app.init();
    await flush();
    server.requests = [];
    (AppState as unknown as { __emit(s: string): void }).__emit('background');
    (AppState as unknown as { __emit(s: string): void }).__emit('active');
    await flush();
    expect(server.requests).toHaveLength(0);
    app.dispose();
  });

  it('storage: false keeps everything in memory', async () => {
    const server = new FakeServer(EN_AR);
    const app = makeClient(server, undefined as never, { storage: false });
    await app.init();
    await flush();
    expect(app.getString('welcome')).toBe('Welcome');
  });

  it('reports auth errors through onError', async () => {
    const server = new FakeServer(EN_AR);
    const onError = jest.fn();
    const app = makeClient(server, memoryStorageAdapter(), { apiKey: 'wrong', onError });
    await app.init();
    await flush();
    expect(onError).toHaveBeenCalledWith({ kind: 'auth', status: 401, message: 'Invalid API key (401)' });
  });
});
