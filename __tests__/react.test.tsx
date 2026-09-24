import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { LocalizeSDK } from '../src/LocalizeSDK';
import { bundleLoader } from '../src/adapters/loader';
import { memoryStorageAdapter } from '../src/adapters/storage/memory';
import { LocalizeProvider } from '../src/react/LocalizeProvider';
import { useLocale, useLocalize, useLocalizedPlural, useLocalizedString } from '../src/react/hooks';
import { T } from '../src/react/T';
import { EN_AR, FakeServer, flush, makeClient } from './helpers';

const bundle = bundleLoader({ languages: { en: { simple: { welcome: 'Bundled', title: 'Title' } } } });

function texts(r: ReactTestRenderer): string[] {
  return r.root.findAll((n) => (n.type as unknown) === 'Text').map((n) => String(n.props.children));
}

async function render(el: React.ReactElement): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(el);
  });
  return r;
}

describe('React layer', () => {
  afterEach(() => LocalizeSDK.resetForTesting());

  it('ACCEPTANCE (D9): offline start shows bundle strings, then every visible string updates in place when the API lands', async () => {
    const server = new FakeServer(EN_AR);
    server.hold();
    const client = makeClient(server, memoryStorageAdapter(), { localLoader: bundle });

    function Screen() {
      const { t } = useLocalize();
      const hook = useLocalizedString('welcome');
      return (
        <>
          <Text>{t('welcome')}</Text>
          <Text>{hook}</Text>
          <T k="welcome" />
        </>
      );
    }

    const r = await render(
      <LocalizeProvider client={client} fallback={<Text>loading</Text>}>
        <Screen />
      </LocalizeProvider>,
    );
    expect(texts(r)).toEqual(['Bundled', 'Bundled', 'Bundled']);

    await act(async () => {
      server.release();
      await flush();
    });
    expect(texts(r)).toEqual(['Welcome', 'Welcome', 'Welcome']);
  });

  it('per-key hooks re-render only when their string changes', async () => {
    const server = new FakeServer({ en: { simple: { a: 'A1', b: 'B1' } } });
    const client = makeClient(server);
    await client.init();
    await flush();
    const renders = { a: 0, b: 0 };
    function A() {
      renders.a++;
      return <Text>{useLocalizedString('a')}</Text>;
    }
    function B() {
      renders.b++;
      return <Text>{useLocalizedString('b')}</Text>;
    }
    const r = await render(
      <LocalizeProvider client={client}>
        <A />
        <B />
      </LocalizeProvider>,
    );
    const before = { ...renders };
    server.languages = { en: { simple: { a: 'A2', b: 'B1' } } };
    await act(async () => {
      await client.refresh();
    });
    expect(texts(r)).toEqual(['A2', 'B1']);
    expect(renders.a).toBe(before.a + 1);
    expect(renders.b).toBe(before.b);
  });

  it('Provider with config configures the static SDK and shows fallback until ready', async () => {
    const server = new FakeServer(EN_AR);
    server.hold();
    function Screen() {
      return <T k="welcome" style={{ fontSize: 20 }} />;
    }
    const r = await render(
      <LocalizeProvider
        config={{ apiKey: 'pk_test', fetchImpl: server.fetch, storage: memoryStorageAdapter(), enableLogging: false, initStrategy: 'api-first' }}
        fallback={<Text>loading</Text>}
      >
        <Screen />
      </LocalizeProvider>,
    );
    expect(texts(r)).toEqual(['loading']);
    await act(async () => {
      server.release();
      await flush();
    });
    expect(texts(r)).toEqual(['Welcome']);
    const t = r.root.find((n) => (n.type as unknown) === 'Text');
    expect(t.props.style).toEqual({ fontSize: 20 });
    expect(LocalizeSDK.isConfigured()).toBe(true);
  });

  it('hooks work without a provider via the static SDK', async () => {
    const server = new FakeServer(EN_AR);
    await LocalizeSDK.configure({ apiKey: 'pk_test', fetchImpl: server.fetch, storage: memoryStorageAdapter(), enableLogging: false, fallbackLocale: 'en' });
    await flush();
    function Screen() {
      const [locale, setLocale] = useLocale();
      const items = useLocalizedPlural('items', 3);
      (globalThis as Record<string, unknown>).__setLocale = setLocale;
      return (
        <>
          <Text>{locale}</Text>
          <Text>{items}</Text>
          <T k="greeting" args={['Sara']} />
        </>
      );
    }
    const r = await render(<Screen />);
    expect(texts(r)).toEqual(['en', '3 items', 'Hello, Sara!']);
    await act(async () => {
      await ((globalThis as Record<string, unknown>).__setLocale as (l: string) => Promise<void>)('ar');
    });
    expect(texts(r)).toEqual(['ar', '3 عناصر', 'Hello, Sara!']);
    delete (globalThis as Record<string, unknown>).__setLocale;
  });

  it('useLocalize exposes locale, isRTL and source', async () => {
    const client = makeClient(new FakeServer(EN_AR), memoryStorageAdapter(), { locale: 'ar' });
    await client.init();
    await flush();
    let seen: ReturnType<typeof useLocalize> | undefined;
    function Probe() {
      seen = useLocalize();
      return null;
    }
    await render(
      <LocalizeProvider client={client}>
        <Probe />
      </LocalizeProvider>,
    );
    expect(seen).toMatchObject({ locale: 'ar', isRTL: true, source: 'api' });
    expect(seen!.plural('items', 2)).toBe('عنصران');
  });
});
