import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as ls_requests_1 from "../../../transport/realtime/ls-requests.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createAddUsersToGroupCommand = createAddUsersToGroupCommand;
function createAddUsersToGroupCommand(deps) {
    const { ctx, generateOfflineThreadingID, logError } = deps;
    return function addUsersToGroup(userID, threadID, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
            if (typeof threadID !== "string" && typeof threadID !== "number") {
                throw new Error("ThreadID should be of type Number or String.");
            }
            const userIDs = Array.isArray(userID) ? userID : [userID];
            if (!userIDs.length) {
                throw new Error("userID is required");
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
                                label: "23",
                                payload: JSON.stringify({
                                    thread_key: threadID,
                                    contact_ids: userIDs,
                                    sync_group: 1
                                }),
                                queue_name: String(threadID),
                                task_id: taskId
                            }
                        ],
                        version_id: "24502707779384158"
                    }),
                    request_id: requestId,
                    type: 3
                },
                extract: (message) => ({
                    success: true,
                    response: message.payload
                })
            })
                .then((result) => cb(null, result))
                .catch((error) => {
                logError?.("addUserToGroup", error);
                cb(error);
            });
        }
        catch (error) {
            logError?.("addUserToGroup", error);
            cb(error);
        }
        return promise;
    };
}

export default module.exports;
const __export_createAddUsersToGroupCommand = module.exports.createAddUsersToGroupCommand;
export { __export_createAddUsersToGroupCommand as createAddUsersToGroupCommand };
