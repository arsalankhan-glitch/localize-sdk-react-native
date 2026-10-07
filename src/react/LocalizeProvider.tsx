import { useEffect, useState, type ReactNode } from 'react';
import type { LocalizeConfigInput } from '../LocalizeConfig';
import { LocalizeSDK } from '../LocalizeSDK';
import type { LocalizeHandle } from '../types';
import { LocalizeContext } from './context';

export interface LocalizeProviderProps {
  /** A client from createLocalizeClient(). Default: the static LocalizeSDK. */
  client?: LocalizeHandle;
  /** Configure the static LocalizeSDK from here instead of before render. */
  config?: LocalizeConfigInput;
  /** Rendered until the first strings are in memory. Without it, children render immediately. */
  fallback?: ReactNode;
  children?: ReactNode;
}

export function LocalizeProvider({ client, config, fallback, children }: LocalizeProviderProps) {
  const handle = client ?? LocalizeSDK;
  const [ready, setReady] = useState(() => handle.isReady());

  useEffect(() => {
    let alive = true;
    const pending = config && !client ? LocalizeSDK.configure(config) : handle.whenReady();
    void pending.then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
    // Re-run only when the identity of the target changes, not on every config object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, config?.apiKey, config?.platform]);

  return (
    <LocalizeContext.Provider value={handle}>
      {ready || fallback === undefined ? children : fallback}
    </LocalizeContext.Provider>
  );
}
