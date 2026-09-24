import { EMPTY_STORE, parseLanguages, type LocalizeStore } from '../domain/LocalizeStore';

/** Default loader: no bundled keys. */
export const defaultLocalLoader = async (): Promise<LocalizeStore> => EMPTY_STORE;

/**
 * Parse a bundled `{ "languages": { "en": { "simple": {...}, "plural": {...} } } }` file —
 * the same shape as the export endpoint and the other SDKs' parseLocalBundleJson.
 */
export function parseLocalBundleJson(json: string): LocalizeStore | null {
  try {
    return parseLanguages(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Same as parseLocalBundleJson, for an already-imported object (`require('./strings.json')`). */
export function parseLocalBundle(value: unknown): LocalizeStore | null {
  return parseLanguages(value);
}

/** Convenience: `localLoader: bundleLoader(require('./strings.json'))`. */
export function bundleLoader(value: unknown): () => Promise<LocalizeStore | null> {
  const store = parseLocalBundle(value);
  return async () => store;
}
