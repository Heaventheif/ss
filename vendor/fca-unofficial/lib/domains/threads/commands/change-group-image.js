import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as threads_1 from "../../../transport/http/threads.js";
import * as ls_requests_1 from "../../../transport/realtime/ls-requests.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createChangeGroupImageCommand = createChangeGroupImageCommand;
function createChangeGroupImageCommand(deps) {
    const { defaultFuncs, ctx, generateOfflineThreadingID, logError } = deps;
    return function changeGroupImage(image, threadID, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
            if (!threadID || typeof threadID !== "string") {
                throw new Error("Invalid threadID");
            }
            if (typeof ctx.wsReqNumber !== "number") {
                ctx.wsReqNumber = 0;
            }
            if (typeof ctx.wsTaskNumber !== "number") {
                ctx.wsTaskNumber = 0;
            }
            const requestId = ++ctx.wsReqNumber;
            const taskId = ++ctx.wsTaskNumber;
            (0, threads_1.uploadGroupImageViaMercury)({
                defaultFuncs,
                ctx,
                image
            })
                .then((uploadResponse) => {
                if (uploadResponse?.error) {
                    throw uploadResponse;
                }
                const imageID = uploadResponse?.payload?.metadata?.[0]?.image_id;
                if (!imageID) {
                    throw new Error("Could not resolve uploaded image_id");
                }
                return (0, ls_requests_1.publishLsRequestWithAck)({
                    client: ctx.mqttClient,
                    requestId,
                    content: {
                        app_id: "2220391788200892",
                        payload: JSON.stringify({
                            epoch_id: generateOfflineThreadingID(),
                            tasks: [
                                {
                                    failure_count: null,
                                    label: "37",
                                    payload: JSON.stringify({
                                        thread_key: threadID,
                                        image_id: imageID,
                                        sync_group: 1
                                    }),
                                    queue_name: "thread_image",
                                    task_id: taskId
                                }
                            ],
                            version_id: "8798795233522156"
                        }),
                        request_id: requestId,
                        type: 3
                    },
                    extract: (message) => ({
                        success: true,
                        response: message.payload
                    })
                });
            })
                .then((result) => cb(null, result))
                .catch((error) => {
                logError?.("changeGroupImage", error);
                cb(error);
            });
        }
        catch (error) {
            logError?.("changeGroupImage", error);
            cb(error);
        }
        return promise;
    };
}

export default module.exports;
const __export_createChangeGroupImageCommand = module.exports.createChangeGroupImageCommand;
export { __export_createChangeGroupImageCommand as createChangeGroupImageCommand };
