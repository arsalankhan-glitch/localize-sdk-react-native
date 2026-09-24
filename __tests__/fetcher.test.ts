import { resolveConfig } from '../src/LocalizeConfig';
import { fetchWithRetry, HttpLocalizeFetcher, type FetchResult } from '../src/adapters/fetcher';
import { EN_AR, FakeServer } from './helpers';

function fetcherFor(server: FakeServer, extra: Record<string, unknown> = {}) {
  return new HttpLocalizeFetcher(
    resolveConfig({ apiKey: 'pk_test', fetchImpl: server.fetch, enableLogging: false, ...extra }),
  );
}

describe('HttpLocalizeFetcher', () => {
  it('calls the production export URL with the expected headers', async () => {
    const server = new FakeServer(EN_AR);
    const result = await fetcherFor(server).fetch(1000);
    expect(result.ok).toBe(true);
    const req = server.requests[0]!;
    expect(req.url).toBe('https://localize-api.adres.ae/sdk/export?platform=react-native');
    expect(req.headers).toMatchObject({
      'X-API-Key': 'pk_test',
      Accept: 'application/json',
      'User-Agent': 'localize-sdk-react-native/0.1.0',
    });
  });

  it('normalises baseUrl and encodes platform', async () => {
    const server = new FakeServer(EN_AR);
    await fetcherFor(server, { baseUrl: 'https://x.test//', platform: 'a b' }).fetch(1000);
    expect(server.requests[0]!.url).toBe('https://x.test/sdk/export?platform=a%20b');
  });

  it('extra headers cannot override the API key', async () => {
    const server = new FakeServer(EN_AR);
    await fetcherFor(server, { headers: { 'X-API-Key': 'evil', 'X-Trace': '1' } }).fetch(1000);
    expect(server.requests[0]!.headers).toMatchObject({ 'X-API-Key': 'pk_test', 'X-Trace': '1' });
  });

  it('parses 200 into a store', async () => {
    const result = await fetcherFor(new FakeServer(EN_AR)).fetch(1000);
    expect(result).toMatchObject({ ok: true, store: { simple: { en: { welcome: 'Welcome' } } } });
  });

  it.each<[number, string, boolean]>([
    [401, 'auth', false],
    [403, 'auth', false],
    [400, 'config', false],
    [404, 'config', false],
    [409, 'config', false],
    [500, 'network', true],
    [503, 'network', true],
    [429, 'network', true],
    [302, 'network', false],
  ])('status %d → %s (retryable=%s)', async (status, kind, retryable) => {
    const server = new FakeServer(EN_AR);
    server.status = status;
    const result = await fetcherFor(server).fetch(1000);
    expect(result).toMatchObject({ ok: false, error: { kind, status }, retryable });
  });

  it('bad key → auth', async () => {
    const result = await new HttpLocalizeFetcher(
      resolveConfig({ apiKey: 'wrong', fetchImpl: new FakeServer(EN_AR).fetch, enableLogging: false }),
    ).fetch(1000);
    expect(result).toMatchObject({ ok: false, error: { kind: 'auth', status: 401 } });
  });

  it('empty 200 body → empty store (caller decides it is a soft miss)', async () => {
    const server = new FakeServer();
    server.rawBody = '';
    expect(await fetcherFor(server).fetch(1000)).toEqual({ ok: true, store: { simple: {}, plural: {} } });
  });

  it.each(['<html>login</html>', '[]', 'null', '"text"', '{"platform":"x"}'])('non-export body %p → parse error', async (body) => {
    const server = new FakeServer();
    server.rawBody = body;
    expect(await fetcherFor(server).fetch(1000)).toMatchObject({ ok: false, error: { kind: 'parse' }, retryable: false });
  });

  it('network failure → network, retryable', async () => {
    const server = new FakeServer(EN_AR);
    server.offline = true;
    expect(await fetcherFor(server).fetch(1000)).toMatchObject({ ok: false, error: { kind: 'network' }, retryable: true });
  });

  it('times out with AbortController', async () => {
    const server = new FakeServer(EN_AR);
    server.delayMs = 200;
    const started = Date.now();
    const result = await fetcherFor(server).fetch(20);
    expect(result).toMatchObject({ ok: false, error: { kind: 'timeout' }, retryable: true });
    expect(Date.now() - started).toBeLessThan(150);
  });

  it('reads Retry-After on 429', async () => {
    const server = new FakeServer(EN_AR);
    server.status = 429;
    server.headers = { 'Retry-After': '2' };
    expect(await fetcherFor(server).fetch(1000)).toMatchObject({ retryAfterMs: 2000 });
  });

  it('redacts the API key in logs', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await fetcherFor(new FakeServer(EN_AR), { enableLogging: true }).fetch(1000);
    const output = log.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('X-API-Key: ***');
    expect(output).not.toContain('pk_test');
    expect(output).toContain('│ Status: 200');
  });
});

describe('fetchWithRetry', () => {
  const failing = (results: FetchResult[]) => {
    const calls = { n: 0 };
    return {
      calls,
      fetcher: {
        fetch: async () => results[Math.min(calls.n++, results.length - 1)]!,
      },
    };
  };
  const net: FetchResult = { ok: false, error: { kind: 'network', message: 'x' }, retryable: true };
  const auth: FetchResult = { ok: false, error: { kind: 'auth', message: 'x' }, retryable: false };
  const okResult: FetchResult = { ok: true, store: { simple: {}, plural: {} } };
  const retry = { attempts: 2, baseDelayMs: 1, maxDelayMs: 5 };

  it('retries retryable failures up to attempts', async () => {
    const { fetcher, calls } = failing([net, net, net, net]);
    expect(await fetchWithRetry(fetcher, 100, retry)).toBe(net);
    expect(calls.n).toBe(3);
  });
  it('stops on success', async () => {
    const { fetcher, calls } = failing([net, okResult]);
    expect(await fetchWithRetry(fetcher, 100, retry)).toBe(okResult);
    expect(calls.n).toBe(2);
  });
  it('never retries auth/config errors', async () => {
    const { fetcher, calls } = failing([auth, okResult]);
    expect(await fetchWithRetry(fetcher, 100, retry)).toBe(auth);
    expect(calls.n).toBe(1);
  });
});
