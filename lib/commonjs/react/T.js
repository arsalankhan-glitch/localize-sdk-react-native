"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.T = T;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const context_1 = require("./context");
/** `<T k="welcome_message" style={...} />` — a Text that updates in place when keys change. */
function T({ k, args, named, count, ...textProps }) {
    const h = (0, context_1.useLocalizeHandle)();
    const get = () => (count === undefined ? h.getString(k, { args, named }) : h.getPlural(k, count));
    const text = (0, react_1.useSyncExternalStore)(h.subscribe, get, get);
    return (0, jsx_runtime_1.jsx)(react_native_1.Text, { ...textProps, children: text });
}
