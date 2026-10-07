import { LocalizeSDK } from '../src/LocalizeSDK';
import { memoryStorageAdapter } from '../src/adapters/storage/memory';
import { EN_AR, FakeServer, flush } from './helpers';

const base = (server: FakeServer) => ({
  apiKey: 'pk_test',
  fetchImpl: server.fetch,
  storage: memoryStorageAdapter(),
  enableLogging: false,
  retry: { attempts: 0 },
});

describe('LocalizeSDK (static API)', () => {
  afterEach(() => LocalizeSDK.resetForTesting());

  it('returns the key before configure, with a dev warning', () => {
    expect(LocalizeSDK.isConfigured()).toBe(false);
    expect(LocalizeSDK.getString('any_key')).toBe('any_key');
    expect(LocalizeSDK.getPlural('items', 5)).toBe('items');
    expect(LocalizeSDK.getLocale()).toBe('en');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('before LocalizeSDK.configure()'));
  });

  it('configure then lookups; locale getter', async () => {
    const server = new FakeServer(EN_AR);
    await LocalizeSDK.configure({ ...base(server), fallbackLocale: 'en' });
    await flush();
    expect(LocalizeSDK.getString('welcome')).toBe('Welcome');
    expect(LocalizeSDK.getPlural('items', 2)).toBe('2 items');
    await LocalizeSDK.setLocale('ar');
    expect(LocalizeSDK.locale).toBe('ar');
    expect(LocalizeSDK.isRTL()).toBe(true);
    expect(LocalizeSDK.getSource()).toBe('api');
    expect(LocalizeSDK.hasKey('only_en')).toBe(true);
  });

  it('configure twice with the same key returns the same instance (Fast Refresh / Strict Mode safe)', async () => {
    const server = new FakeServer(EN_AR);
    await LocalizeSDK.configure(base(server));
    await LocalizeSDK.configure(base(server));
    await flush();
    expect(server.requests).toHaveLength(1);
  });

  it('configure with a different key replaces the instance and notifies subscribers', async () => {
    const server = new FakeServer(EN_AR);
    const listener = jest.fn();
    LocalizeSDK.subscribe(listener);
    await LocalizeSDK.configure(base(server));
    await flush();
    const before = LocalizeSDK.getVersion();
    await LocalizeSDK.configure({ ...base(server), apiKey: 'pk_other' });
    expect(LocalizeSDK.getVersion()).toBeGreaterThan(before);
    expect(listener).toHaveBeenCalled();
  });

  it('keeps the instance across module re-evaluation (Fast Refresh)', async () => {
    const server = new FakeServer(EN_AR);
    await LocalizeSDK.configure(base(server));
    await flush();
    let reloaded: typeof LocalizeSDK | undefined;
    jest.isolateModules(() => {
      reloaded = (require('../src/LocalizeSDK') as { LocalizeSDK: typeof LocalizeSDK }).LocalizeSDK;
    });
    expect(reloaded).not.toBe(LocalizeSDK);
    expect(reloaded!.getString('welcome')).toBe('Welcome');
  });

  it('refresh resolves true when new keys land', async () => {
    const server = new FakeServer(EN_AR);
    await LocalizeSDK.configure(base(server));
    await flush();
    server.languages = { en: { simple: { welcome: 'Again' } } };
    expect(await LocalizeSDK.refresh()).toBe(true);
    expect(LocalizeSDK.getString('welcome')).toBe('Again');
  });

  it('resetForTesting drops the instance', async () => {
    await LocalizeSDK.configure(base(new FakeServer(EN_AR)));
    LocalizeSDK.resetForTesting();
    expect(LocalizeSDK.isConfigured()).toBe(false);
  });
});
