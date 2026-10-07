import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { LocalizeSDK } from '../LocalizeSDK.js';
import { LocalizeContext } from './context.js';
export function LocalizeProvider({ client, config, fallback, children }) {
    const handle = client ?? LocalizeSDK;
    const [ready, setReady] = useState(() => handle.isReady());
    useEffect(() => {
        let alive = true;
        const pending = config && !client ? LocalizeSDK.configure(config) : handle.whenReady();
        void pending.then(() => {
            if (alive)
                setReady(true);
        });
        return () => {
            alive = false;
        };
        // Re-run only when the identity of the target changes, not on every config object.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handle, config?.apiKey, config?.platform]);
    return (_jsx(LocalizeContext.Provider, { value: handle, children: ready || fallback === undefined ? children : fallback }));
}
