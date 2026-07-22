import * as callbackify_1 from "../../../compat/callbackify.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as ls_requests_1 from "../../../transport/realtime/ls-requests.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createEditMessageCommand = createEditMessageCommand;
function extractEditMessageResponse(message) {
    const step = message.payload?.step;
    const candidate = step?.[1]?.[2]?.[2]?.[1];
    const messageID = String(candidate?.[2] || "");
    const body = String(candidate?.[4] || "");
    if (!messageID || !body) {
        throw new Error("Invalid edit message response");
    }
    return { body, messageID };
}
function createEditMessageCommand(deps) {
    const { ctx, generateOfflineThreadingID, logError } = deps;
    return function editMessage(text, messageID, callback) {
        const cb = (0, callbackify_1.ensureNodeCallback)(callback);
        let resolvePromise = () => { };
        let rejectPromise = () => { };
        const promise = new Promise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
            if (!text || !messageID) {
                throw new Error("text and messageID are required");
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
                        data_trace_id: null,
                        epoch_id: Number.parseInt(String(generateOfflineThreadingID()), 10),
                        tasks: [
                            {
                                failure_count: null,
                                label: "742",
                                payload: JSON.stringify({
                                    message_id: messageID,
                                    text
                                }),
                                queue_name: "edit_message",
                                task_id: taskId
                            }
                        ],
                        version_id: "6903494529735864"
                    }),
                    request_id: requestId,
                    type: 3
                },
                extract: extractEditMessageResponse
            })
                .then((result) => {
                if (result.body !== text) {
                    const error = {
                        error: "The message is too old or not from you!",
                        result
                    };
                    cb(error, result);
                    rejectPromise(error);
                    return;
                }
                cb(null, result);
                resolvePromise(result);
            })
                .catch((error) => {
                logError?.("editMessage", error);
                cb(error);
                rejectPromise(error);
            });
        }
        catch (error) {
            logError?.("editMessage", error);
            cb(error);
            rejectPromise(error);
        }
        return promise;
    };
}

export default module.exports;
const __export_createEditMessageCommand = module.exports.createEditMessageCommand;
export { __export_createEditMessageCommand as createEditMessageCommand };
