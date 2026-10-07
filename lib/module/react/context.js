import { createContext, useContext } from 'react';
import { LocalizeSDK } from '../LocalizeSDK.js';
/** Defaults to the static LocalizeSDK, so hooks work without a provider. */
export const LocalizeContext = createContext(LocalizeSDK);
export function useLocalizeHandle() {
    return useContext(LocalizeContext);
}
