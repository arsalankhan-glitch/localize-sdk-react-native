import { createContext, useContext } from 'react';
import { LocalizeSDK } from '../LocalizeSDK';
import type { LocalizeHandle } from '../types';

/** Defaults to the static LocalizeSDK, so hooks work without a provider. */
export const LocalizeContext = createContext<LocalizeHandle>(LocalizeSDK);

export function useLocalizeHandle(): LocalizeHandle {
  return useContext(LocalizeContext);
}
