import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as ls_requests_1 from "../../../transport/realtime/ls-requests.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createChangeThreadColorCommand = createChangeThreadColorCommand;
function extractThreadColorResponse(message) {
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
function createChangeThreadColorCommand(deps) {
    const { ctx, generateOfflineThreadingID, logError } = deps;
    return function changeThreadColor(color, threadID, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
            if (!color || threadID === null || typeof threadID === "undefined" || threadID === "") {
                throw new Error("color and threadID are required");
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
                                label: "43",
                                payload: JSON.stringify({
                                    thread_key: threadID,
                                    theme_fbid: color,
                                    source: null,
                                    sync_group: 1,
                                    payload: null
                                }),
                                queue_name: "thread_theme",
                                task_id: taskId
                            }
                        ],
                        version_id: "8798795233522156"
                    }),
                    request_id: requestId,
                    type: 3
                },
                extract: extractThreadColorResponse
            })
                .then((result) => {
                cb(null, result);
            })
                .catch((error) => {
                logError?.("changeThreadColor", error);
                cb(error);
            });
        }
        catch (error) {
            logError?.("changeThreadColor", error);
            cb(error);
        }
        return promise;
    };
}

export default module.exports;
const __export_createChangeThreadColorCommand = module.exports.createChangeThreadColorCommand;
export { __export_createChangeThreadColorCommand as createChangeThreadColorCommand };
