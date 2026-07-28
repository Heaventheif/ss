import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as ls_requests_1 from "../../../transport/realtime/ls-requests.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createUnsendMessageCommand = createUnsendMessageCommand;
function extractUnsendMessageResponse(message) {
    try {
        const step = message.payload?.step;
        const candidate = step?.[1]?.[2]?.[2]?.[1];
        const messageID = String(candidate?.[2] || "");
        const body = String(candidate?.[4] || "");
        if (messageID && body) {
            return { body, messageID };
        }
    }
    catch { }
    return { success: true };
}
function createUnsendMessageCommand(deps) {
    const { ctx, generateOfflineThreadingID, logError } = deps;
    return function unsendMessage(messageID, threadID, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback, {
            success: true
        });
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
            if (!messageID || threadID === null || typeof threadID === "undefined" || threadID === "") {
                throw new Error("messageID and threadID are required");
            }
            if (typeof ctx.wsReqNumber !== "number") {
                ctx.wsReqNumber = 0;
            }
            if (typeof ctx.wsTaskNumber !== "number") {
                ctx.wsTaskNumber = 0;
            }
            const requestId = ++ctx.wsReqNumber;
            const taskId = ++ctx.wsTaskNumber;
            (0, ls_requests_1.publishLsRequestWithAck)({
                client: ctx.mqttClient,
                requestId,
                content: {
                    app_id: "2220391788200892",
                    payload: JSON.stringify({
                        tasks: [
                            {
                                failure_count: null,
                                label: "33",
                                payload: JSON.stringify({
                                    message_id: messageID,
                                    thread_key: threadID,
                                    sync_group: 1
                                }),
                                queue_name: "unsend_message",
                                task_id: taskId
                            }
                        ],
                        epoch_id: Number.parseInt(String(generateOfflineThreadingID()), 10),
                        version_id: "25393437286970779"
                    }),
                    request_id: requestId,
                    type: 3
                },
                extract: extractUnsendMessageResponse
            })
                .then((result) => {
                cb(null, result);
            })
                .catch((error) => {
                logError?.("unsendMessage", error);
                cb(error);
            });
        }
        catch (error) {
            logError?.("unsendMessage", error);
            cb(error);
        }
        return promise;
    };
}

export default module.exports;
const __export_createUnsendMessageCommand = module.exports.createUnsendMessageCommand;
export { __export_createUnsendMessageCommand as createUnsendMessageCommand };
