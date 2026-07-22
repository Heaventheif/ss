import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as publish_1 from "../../../transport/realtime/publish.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createSendTypingIndicatorCommand = createSendTypingIndicatorCommand;
function buildTypingPayload(threadID, isTyping, requestId, attribution) {
    const isGroupThread = Array.isArray(threadID) ? 0 : 1;
    return {
        app_id: "772021112871879",
        payload: JSON.stringify({
            label: "3",
            payload: JSON.stringify({
                thread_key: Number.parseInt(String(threadID), 10),
                is_group_thread: isGroupThread,
                is_typing: isTyping ? 1 : 0,
                attribution,
                sync_group: 1,
                thread_type: isGroupThread ? 2 : 1
            }),
            version: "8965252033599983"
        }),
        request_id: requestId,
        type: 4
    };
}
function createSendTypingIndicatorCommand(deps) {
    const { ctx, logError } = deps;
    return function sendTypingIndicator(threadID, isTyping, options, callback) {
        const effectiveOptions = typeof options === "function" ? {} : options || {};
        const effectiveCallback = typeof options === "function" ? options : callback;
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(effectiveCallback, false);
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
            const threadIDs = Array.isArray(threadID) ? threadID : [threadID];
            if (!threadIDs.length || threadIDs.some((value) => value === null || typeof value === "undefined" || value === "")) {
                throw new Error("threadID is required");
            }
            if (typeof ctx.wsReqNumber !== "number") {
                ctx.wsReqNumber = 0;
            }
            const duration = effectiveOptions.duration || 10000;
            const autoStop = effectiveOptions.autoStop !== false;
            const attribution = effectiveOptions.type || 0;
            Promise.all(threadIDs.map((currentThreadID) => (0, publish_1.publishRealtimeMessage)({
                client: ctx.mqttClient,
                topic: "/ls_req",
                payload: buildTypingPayload(currentThreadID, isTyping, ++ctx.wsReqNumber, attribution)
            })))
                .then(() => {
                if (isTyping && autoStop) {
                    threadIDs.forEach((currentThreadID) => {
                        setTimeout(() => {
                            (0, publish_1.publishRealtimeMessage)({
                                client: ctx.mqttClient,
                                topic: "/ls_req",
                                payload: buildTypingPayload(currentThreadID, false, ++ctx.wsReqNumber, attribution)
                            }).catch((error) => {
                                logError?.("sendTypingIndicator.stop", error);
                            });
                        }, duration);
                    });
                }
                cb(null, true);
            })
                .catch((error) => {
                logError?.("sendTypingIndicator", error);
                cb(error);
            });
        }
        catch (error) {
            logError?.("sendTypingIndicator", error);
            cb(error);
        }
        return promise;
    };
}

export default module.exports;
const __export_createSendTypingIndicatorCommand = module.exports.createSendTypingIndicatorCommand;
export { __export_createSendTypingIndicatorCommand as createSendTypingIndicatorCommand };
