"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalizeContext = void 0;
exports.useLocalizeHandle = useLocalizeHandle;
const react_1 = require("react");
const LocalizeSDK_1 = require("../LocalizeSDK");
/** Defaults to the static LocalizeSDK, so hooks work without a provider. */
exports.LocalizeContext = (0, react_1.createContext)(LocalizeSDK_1.LocalizeSDK);
function useLocalizeHandle() {
    return (0, react_1.useContext)(exports.LocalizeContext);
}
