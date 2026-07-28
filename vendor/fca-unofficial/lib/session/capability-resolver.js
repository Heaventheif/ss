import * as session_1 from "./session.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveThreadEmojiTransport = void 0;
exports.resolveMarkAsReadTransport = resolveMarkAsReadTransport;
exports.assertMqttCapability = assertMqttCapability;
exports.resolveThreadMutationTransport = resolveThreadMutationTransport;
function resolveMarkAsReadTransport(ctx) {
    if ((0, session_1.getPageID)(ctx)) {
        return "page-http";
    }
    if ((0, session_1.hasMqttClient)(ctx)) {
        return "mqtt";
    }
    throw new Error("You can only use this function after you start listening.");
}
function assertMqttCapability(ctx) {
    if (!(0, session_1.hasMqttClient)(ctx)) {
        throw new Error("MQTT client is not initialized");
    }
}
function resolveThreadMutationTransport(ctx) {
    return (0, session_1.hasMqttClient)(ctx) ? "mqtt" : "http";
}
exports.resolveThreadEmojiTransport = resolveThreadMutationTransport;

export default module.exports;
const __export_resolveThreadEmojiTransport = module.exports.resolveThreadEmojiTransport;
const __export_resolveMarkAsReadTransport = module.exports.resolveMarkAsReadTransport;
const __export_assertMqttCapability = module.exports.assertMqttCapability;
const __export_resolveThreadMutationTransport = module.exports.resolveThreadMutationTransport;
export { __export_resolveThreadEmojiTransport as resolveThreadEmojiTransport };
export { __export_resolveMarkAsReadTransport as resolveMarkAsReadTransport };
export { __export_assertMqttCapability as assertMqttCapability };
export { __export_resolveThreadMutationTransport as resolveThreadMutationTransport };
