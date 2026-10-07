import { type ReactNode } from 'react';
import type { LocalizeConfigInput } from '../LocalizeConfig';
import type { LocalizeHandle } from '../types';
export interface LocalizeProviderProps {
    /** A client from createLocalizeClient(). Default: the static LocalizeSDK. */
    client?: LocalizeHandle;
    /** Configure the static LocalizeSDK from here instead of before render. */
    config?: LocalizeConfigInput;
    /** Rendered until the first strings are in memory. Without it, children render immediately. */
    fallback?: ReactNode;
    children?: ReactNode;
}
export declare function LocalizeProvider({ client, config, fallback, children }: LocalizeProviderProps): import("react/jsx-runtime").JSX.Element;
