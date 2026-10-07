import { jsx as _jsx } from "react/jsx-runtime";
import { useSyncExternalStore } from 'react';
import { Text } from 'react-native';
import { useLocalizeHandle } from './context.js';
/** `<T k="welcome_message" style={...} />` — a Text that updates in place when keys change. */
export function T({ k, args, named, count, ...textProps }) {
    const h = useLocalizeHandle();
    const get = () => (count === undefined ? h.getString(k, { args, named }) : h.getPlural(k, count));
    const text = useSyncExternalStore(h.subscribe, get, get);
    return _jsx(Text, { ...textProps, children: text });
}
