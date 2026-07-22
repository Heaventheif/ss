import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as ls_requests_1 from "../../../transport/realtime/ls-requests.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createForwardAttachmentCommand = createForwardAttachmentCommand;
function createForwardAttachmentCommand(deps) {
    const { ctx, generateOfflineThreadingID, logError } = deps;
    return function forwardAttachment(threadID, forwardedMsgID, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback, {
            success: true
        });
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
            if (threadID === null || typeof threadID === "undefined" || threadID === "" || !forwardedMsgID) {
                throw new Error("threadID and forwardedMsgID are required");
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
                    app_id: "772021112871879",
                    payload: JSON.stringify({
                        epoch_id: generateOfflineThreadingID(),
                        tasks: [
                            {
                                failure_count: null,
                                label: "46",
                                payload: JSON.stringify({
                                    thread_id: String(threadID),
                                    otid: generateOfflineThreadingID(),
                                    source: 65544,
                                    send_type: 5,
                                    sync_group: 1,
                                    mark_thread_read: 0,
                                    forwarded_msg_id: forwardedMsgID,
                                    strip_forwarded_msg_caption: 0,
                                    initiating_source: 1
                                }),
                                queue_name: String(threadID),
                                task_id: taskId
                            }
                        ],
                        version_id: "8768858626531631"
                    }),
                    request_id: requestId,
                    type: 3
                },
                extract: () => ({ success: true })
            })
                .then((result) => {
                cb(null, result);
            })
                .catch((error) => {
                logError?.("forwardAttachment", error);
                cb(error);
            });
        }
        catch (error) {
            logError?.("forwardAttachment", error);
            cb(error);
        }
        return promise;
    };
}

export default module.exports;
const __export_createForwardAttachmentCommand = module.exports.createForwardAttachmentCommand;
export { __export_createForwardAttachmentCommand as createForwardAttachmentCommand };
