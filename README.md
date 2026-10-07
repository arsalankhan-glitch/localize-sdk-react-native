# @adres/react-native-localize-sdk

React Native SDK for the Localize API. Same behaviour as the iOS, Android and Flutter SDKs in this
repo, plus React hooks so the UI updates in place when new keys arrive.

- Pure TypeScript, no native code: works in Expo Go, bare RN, and New and Old Architecture (iOS and Android).
- No required dependencies. Storage and locale detection use optional peers when installed.
- React 18+ (RN 0.71+).

## Install

Install from GitHub, pinned to a tag. This works with npm, Yarn and pnpm:

```bash
npm install github:arsalankhan-glitch/localize-sdk-react-native#0.1.0
```

This adds the following to your `package.json`:

```json
"@adres/react-native-localize-sdk": "github:arsalankhan-glitch/localize-sdk-react-native#0.1.0"
```

Optional peers (install any you want):

| Package | Used for |
|---------|----------|
| `expo-file-system` or `react-native-fs` | Cache files (default storage) |
| `@react-native-async-storage/async-storage` | Cache fallback when no file-system module |
| `react-native-localize` or `expo-localization` | `detectDeviceLocale` |
| `@react-native-community/netinfo` | `refreshOnReconnect` |

Without any storage module, keys are kept in memory only (a dev warning says so).

## Setup

```tsx
import { LocalizeSDK, LocalizeProvider } from '@adres/react-native-localize-sdk';

await LocalizeSDK.configure({ apiKey: 'pk_xxx', fallbackLocale: 'en' }); // do not commit real keys

export default function App() {
  return (
    <LocalizeProvider fallback={<Splash />}>
      <RootNavigator />
    </LocalizeProvider>
  );
}
```

Or let the provider configure it: `<LocalizeProvider config={{ apiKey: 'pk_xxx' }} fallback={<Splash />}>`.

## Usage

```tsx
import { T, useLocalize, useLocalizedString } from '@adres/react-native-localize-sdk';

function Screen() {
  const { t, plural, setLocale, isRTL } = useLocalize();
  const title = useLocalizedString('welcome_message'); // re-renders only when this string changes
  return (
    <View style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <Text>{title}</Text>
      <Text>{t('greeting', ['John'])}</Text>
      <Text>{plural('items_count', 5)}</Text>
      <T k="welcome_message" style={styles.title} />
      <Button title="AR" onPress={() => setLocale('ar')} />
    </View>
  );
}
```

Static API (same names as the other SDKs):

```ts
LocalizeSDK.getString('welcome_message');
LocalizeSDK.getString('greeting', ['John']);                 // %s %d %@, in order
LocalizeSDK.getString('hello', { named: { name: 'John' } }); // {{name}} / {name}
LocalizeSDK.getPlural('items_count', 5);
await LocalizeSDK.setLocale('ar');
await LocalizeSDK.refresh(); // true when new keys were applied
```

Static getters do not re-render components. Use the hooks or `<T>`, or re-render yourself from
`onKeysUpdated`.

## How it works

1. **Start (`configure`)**: loads the current locale (and fallback locale) from the cache, or the
   bundled keys from `localLoader` if there is no cache, and resolves. Takes milliseconds.
2. **Download**: in the background, `GET {baseUrl}/sdk/export?platform=react-native` with
   `X-API-Key`. On success every locale is written to the cache and the UI updates in place.
3. **Cache**: one entry per locale, named `localize_{sha256(apiKey)[0:8]}_{platform}_{locale}` —
   with the file-system adapter, the same file name and format the native SDKs write.
4. **Re-download**: `refresh()`, and optionally on app foreground (`refreshOnAppForeground`) or
   reconnect (`refreshOnReconnect`). Failures keep the current strings. An empty export never
   wipes them.
5. **Switch locale**: `setLocale` reads from the cache, never the network.

Lookup order: current locale → fallback locale → `bundleFallback` (locale, then fallback) →
`missingKeyHandler` → the key itself.

`initStrategy: 'api-first'` waits for the API first (up to `initTimeoutMs`), like iOS/Flutter.

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | — | Project API key (required) |
| `platform` | `'react-native'` | Shares keys with `web` / `other` / `flutter` |
| `baseUrl` | `https://localize-api.adres.ae` | API host |
| `fallbackLocale` | — | Used when a key is missing in the current locale |
| `locale` | `'en'` | Initial locale |
| `timeoutSeconds` | `10` | Background / refresh timeout |
| `initStrategy` | `'cache-first'` | or `'api-first'` |
| `initTimeoutMs` | `3000` | api-first start-up timeout |
| `onKeysUpdated` | — | After every store change |
| `onReady` | — | When the first store is in memory |
| `onError` | — | `{ kind: 'auth' \| 'config' \| 'network' \| 'parse' \| 'timeout', status?, message }` |
| `localLoader` | — | Whole bundled store, e.g. `bundleLoader(require('./strings.json'))` |
| `bundleFallback` | — | Per-key fallback: `jsonBundleFallback`, `i18nextBundleFallback`, `i18nJsBundleFallback` |
| `missingKeyHandler` | — | Return a string to use instead of the key |
| `storage` | auto | A `LocalizeStorage`, or `false` for memory only |
| `cacheTtlSeconds` | `0` | Skip the start-up download while the cache is younger than this |
| `refreshOnAppForeground` | `false` | `true` (at most every 300 s) or seconds |
| `refreshOnReconnect` | `false` | Needs NetInfo |
| `retry` | `{ attempts: 2, baseDelayMs: 500, maxDelayMs: 4000 }` | Network / timeout / 5xx / 429 only |
| `detectDeviceLocale` | `false` | Uses `deviceLocaleProvider`, react-native-localize, expo-localization, Intl |
| `supportedLocales` | — | Normalises tags: `'ar-AE'` → `'ar'` |
| `persistLocale` | `false` | Remember the last `setLocale` |
| `pluralRules` | `'sdk'` | `'intl'` for real CLDR rules (differs from the other SDKs) |
| `autoApplyRTL` | `false` | Calls `I18nManager.forceRTL`; then `onRTLChangeRequiresRestart(locale)` |
| `enableLogging` | dev only | Never logs in release builds; API key is redacted |
| `headers`, `fetchImpl` | — | Extra headers; custom transport |

## Other APIs

`createLocalizeClient(config)` (independent instance; pass to `<LocalizeProvider client>`),
`getStringOrNull`, `getPluralOrNull`, `hasKey`, `getAllKeys`, `getLoadedLocales`, `getSource`,
`preloadLocale`, `clearCache({ all })`, `isRTL`, `subscribe`, `useLocale`, `useLocalizedPlural`,
`parseLocalBundleJson`, `resetForTesting`.

## Testing your app

The package's `react-native` entry points at TypeScript source, so add it to Jest's
`transformIgnorePatterns`:

```js
transformIgnorePatterns: ['node_modules/(?!(jest-)?@?react-native|@adres/react-native-localize-sdk)'],
```

Pass `fetchImpl` and `storage: memoryStorageAdapter()` to run without the network, and call
`LocalizeSDK.resetForTesting()` between tests.

## Security

The API key ships inside the JS bundle and can be extracted. Treat it as a read-only export key,
and keep it out of git (`react-native-config`, EAS secrets).

## Development

```bash
npm install
npm test          # jest
npm run typecheck
npm run build     # lib/commonjs, lib/module, lib/typescript
```

## License

[MIT](LICENSE)
