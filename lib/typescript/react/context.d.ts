import type { LocalizeHandle } from '../types';
/** Defaults to the static LocalizeSDK, so hooks work without a provider. */
export declare const LocalizeContext: import("react").Context<LocalizeHandle>;
export declare function useLocalizeHandle(): LocalizeHandle;
