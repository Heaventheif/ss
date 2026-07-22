import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as ls_requests_1 from "../../../transport/realtime/ls-requests.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeleteMessageCommand = createDeleteMessageCommand;
function createDeleteMessageCommand(deps) {
    const { ctx, generateOfflineThreadingID, logError } = deps;
    return function deleteMessage(messageOrMessages, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
            const messages = Array.isArray(messageOrMessages) ? messageOrMessages : [messageOrMessages];
            if (messages.length === 0 || messages.some((value) => value === null || typeof value === "undefined" || value === "")) {
                throw new Error("messageOrMessages must contain at least one message identifier");
            }
            if (typeof ctx.wsReqNumber !== "number") {
                ctx.wsReqNumber = 0;
            }
            if (typeof ctx.wsTaskNumber !== "number") {
                ctx.wsTaskNumber = 0;
            }
            const requestId = ++ctx.wsReqNumber;
            const tasks = messages.map((messageID) => {
                const queueName = String(messageID);
                const taskId = ++ctx.wsTaskNumber;
                return {
                    failure_count: null,
                    label: "146",
                    payload: JSON.stringify({
                        thread_key: queueName,
                        remove_type: 0,
                        sync_group: 1
                    }),
                    queue_name: queueName,
                    task_id: taskId
                };
            });
            (0, ls_requests_1.publishLsRequestWithAck)({
                client: ctx.mqttClient,
                requestId,
                timeoutMs: 20000,
                content: {
                    app_id: "2220391788200892",
                    payload: JSON.stringify({
                        epoch_id: Number.parseInt(String(generateOfflineThreadingID()), 10),
                        tasks,
                        version_id: "25909428212080747"
                    }),
                    request_id: requestId,
                    type: 3
                },
                extract: (message) => ({
                    success: true,
                    response: message.payload
                })
            })
                .then((result) => {
                cb(null, result);
            })
                .catch((error) => {
                logError?.("deleteMessage", error);
                cb(error);
            });
        }
        catch (error) {
            logError?.("deleteMessage", error);
            cb(error);
        }
        return promise;
    };
}

export default module.exports;
const __export_createDeleteMessageCommand = module.exports.createDeleteMessageCommand;
export { __export_createDeleteMessageCommand as createDeleteMessageCommand };
