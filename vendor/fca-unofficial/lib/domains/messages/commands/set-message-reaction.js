import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as ls_requests_1 from "../../../transport/realtime/ls-requests.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createSetMessageReactionCommand = createSetMessageReactionCommand;
function createSetMessageReactionCommand(deps) {
    const { ctx, generateOfflineThreadingID, getCurrentTimestamp, logError } = deps;
    return function setMessageReaction(reaction, messageID, threadID, callback, forceCustomReaction) {
        let effectiveThreadID = threadID;
        let effectiveCallback = callback;
        let effectiveForceCustomReaction = forceCustomReaction;
        if (typeof threadID === "function") {
            effectiveForceCustomReaction = callback;
            effectiveCallback = threadID;
            effectiveThreadID = undefined;
        }
        else if (typeof threadID === "boolean") {
            effectiveForceCustomReaction = threadID;
            effectiveThreadID = undefined;
        }
        else if (typeof callback === "boolean") {
            effectiveForceCustomReaction = callback;
            effectiveCallback = undefined;
        }
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(effectiveCallback, {
            success: false
        });
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
            if (reaction === undefined || reaction === null || !messageID || !effectiveThreadID) {
                throw new Error("Missing required parameters (reaction, messageID, threadID)");
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
                        epoch_id: Number.parseInt(String(generateOfflineThreadingID()), 10),
                        tasks: [
                            {
                                failure_count: null,
                                label: "29",
                                payload: JSON.stringify({
                                    thread_key: effectiveThreadID,
                                    timestamp_ms: getCurrentTimestamp(),
                                    message_id: messageID,
                                    reaction,
                                    actor_id: ctx.userID,
                                    reaction_style: effectiveForceCustomReaction ? 1 : null,
                                    sync_group: 1,
                                    send_attribution: 65537,
                                    dataclass_params: null,
                                    attachment_fbid: null
                                }),
                                queue_name: `reaction:${messageID}`,
                                task_id: taskId
                            }
                        ],
                        version_id: "24585299697835063"
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
                logError?.("setMessageReaction", error);
                cb(error);
            });
        }
        catch (error) {
            logError?.("setMessageReaction", error);
            cb(error);
        }
        return promise;
    };
}

export default module.exports;
const __export_createSetMessageReactionCommand = module.exports.createSetMessageReactionCommand;
export { __export_createSetMessageReactionCommand as createSetMessageReactionCommand };
