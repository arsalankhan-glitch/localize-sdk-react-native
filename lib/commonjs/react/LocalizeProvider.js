"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalizeProvider = LocalizeProvider;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const LocalizeSDK_1 = require("../LocalizeSDK");
const context_1 = require("./context");
function LocalizeProvider({ client, config, fallback, children }) {
    const handle = client ?? LocalizeSDK_1.LocalizeSDK;
    const [ready, setReady] = (0, react_1.useState)(() => handle.isReady());
    (0, react_1.useEffect)(() => {
        let alive = true;
        const pending = config && !client ? LocalizeSDK_1.LocalizeSDK.configure(config) : handle.whenReady();
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
    return ((0, jsx_runtime_1.jsx)(context_1.LocalizeContext.Provider, { value: handle, children: ready || fallback === undefined ? children : fallback }));
}
