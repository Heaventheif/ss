import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as publish_1 from "../../../transport/realtime/publish.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createShareContactCommand = createShareContactCommand;
function createShareContactCommand(deps) {
    const { ctx, generateOfflineThreadingID, logError } = deps;
    return function shareContact(text, senderID, threadID, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
            (0, publish_1.publishRealtimeMessage)({
                client: ctx.mqttClient,
                topic: "/ls_req",
                payload: {
                    app_id: "2220391788200892",
                    payload: JSON.stringify({
                        tasks: [
                            {
                                label: "359",
                                payload: JSON.stringify({
                                    contact_id: senderID,
                                    sync_group: 1,
                                    text: text || "",
                                    thread_id: threadID
                                }),
                                queue_name: "messenger_contact_sharing",
                                task_id: Math.floor(Math.random() * 1001),
                                failure_count: null
                            }
                        ],
                        epoch_id: generateOfflineThreadingID(),
                        version_id: "7214102258676893"
                    }),
                    request_id: Math.floor(Math.random() * 1000000),
                    type: 3
                }
            })
                .then(() => cb(null, { success: true }))
                .catch((error) => {
                logError?.("shareContact", error);
                cb(error);
            });
        }
        catch (error) {
            logError?.("shareContact", error);
            cb(error);
        }
        return promise;
    };
}

export default module.exports;
const __export_createShareContactCommand = module.exports.createShareContactCommand;
export { __export_createShareContactCommand as createShareContactCommand };
