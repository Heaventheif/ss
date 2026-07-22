import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as publish_1 from "../../../transport/realtime/publish.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createRemoveUserFromGroupCommand = createRemoveUserFromGroupCommand;
function createRemoveUserFromGroupCommand(deps) {
    const { ctx, generateOfflineThreadingID, logError } = deps;
    return function removeUserFromGroup(userID, threadID, callback) {
        if (!callback && typeof threadID === "function") {
            throw { error: "please pass a threadID as a second argument." };
        }
        const actualThreadID = threadID;
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback, false);
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
            if (typeof actualThreadID !== "string" && typeof actualThreadID !== "number") {
                throw { error: `threadID should be of type Number or String and not ${typeof actualThreadID}.` };
            }
            if (typeof userID !== "string" && typeof userID !== "number") {
                throw { error: `userID should be of type Number or String and not ${typeof userID}.` };
            }
            if (typeof ctx.wsReqNumber !== "number") {
                ctx.wsReqNumber = 0;
            }
            (0, publish_1.publishRealtimeMessage)({
                client: ctx.mqttClient,
                topic: "/ls_req",
                payload: {
                    app_id: "2220391788200892",
                    payload: JSON.stringify({
                        epoch_id: generateOfflineThreadingID(),
                        tasks: [
                            {
                                failure_count: null,
                                label: "140",
                                payload: JSON.stringify({
                                    thread_id: actualThreadID,
                                    contact_id: userID,
                                    sync_group: 1
                                }),
                                queue_name: "remove_participant_v2",
                                task_id: Math.floor(Math.random() * 1001)
                            }
                        ],
                        version_id: "25002366262773827"
                    }),
                    request_id: ++ctx.wsReqNumber,
                    type: 3
                }
            })
                .then(() => cb(null, true))
                .catch((error) => {
                logError?.("removeUserFromGroup", error);
                cb(error);
            });
        }
        catch (error) {
            logError?.("removeUserFromGroup", error);
            cb(error);
        }
        return promise;
    };
}

export default module.exports;
const __export_createRemoveUserFromGroupCommand = module.exports.createRemoveUserFromGroupCommand;
export { __export_createRemoveUserFromGroupCommand as createRemoveUserFromGroupCommand };
