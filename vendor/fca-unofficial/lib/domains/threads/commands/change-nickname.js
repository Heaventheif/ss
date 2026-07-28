import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as ls_requests_1 from "../../../transport/realtime/ls-requests.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createChangeNicknameCommand = createChangeNicknameCommand;
function createChangeNicknameCommand(deps) {
    const { ctx, generateOfflineThreadingID, logError } = deps;
    return function changeNickname(nickname, threadID, participantID, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
            if (!threadID || !participantID) {
                throw new Error("Missing required parameters");
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
                        epoch_id: generateOfflineThreadingID(),
                        tasks: [
                            {
                                failure_count: null,
                                label: "44",
                                payload: JSON.stringify({
                                    thread_key: threadID,
                                    contact_id: participantID,
                                    nickname: nickname || "",
                                    sync_group: 1
                                }),
                                queue_name: "thread_participant_nickname",
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
            })
                .then((result) => {
                cb(null, result);
            })
                .catch((error) => {
                logError?.("changeNickname", error);
                cb(error);
            });
        }
        catch (error) {
            logError?.("changeNickname", error);
            cb(error);
        }
        return promise;
    };
}

export default module.exports;
const __export_createChangeNicknameCommand = module.exports.createChangeNicknameCommand;
export { __export_createChangeNicknameCommand as createChangeNicknameCommand };
