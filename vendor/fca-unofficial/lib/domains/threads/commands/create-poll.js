import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as publish_1 from "../../../transport/realtime/publish.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createCreatePollCommand = createCreatePollCommand;
function createCreatePollCommand(deps) {
    const { ctx, generateOfflineThreadingID, logError } = deps;
    return function createPoll(threadID, questionText, options) {
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
        }
        catch (error) {
            logError?.("createPoll", error);
            return Promise.reject(error);
        }
        return (0, publish_1.publishRealtimeMessage)({
            client: ctx.mqttClient,
            topic: "/ls_req",
            payload: {
                app_id: "2220391788200892",
                payload: JSON.stringify({
                    epoch_id: generateOfflineThreadingID(),
                    tasks: [
                        {
                            failure_count: null,
                            label: "163",
                            payload: JSON.stringify({
                                question_text: questionText,
                                thread_key: threadID,
                                options,
                                sync_group: 1
                            }),
                            queue_name: "poll_creation",
                            task_id: Math.floor(Math.random() * 1001)
                        }
                    ],
                    version_id: "34195258046739157"
                }),
                request_id: Math.floor(Math.random() * 1000000),
                type: 3
            }
        }).catch((error) => {
            logError?.("createPoll", error);
            throw error;
        });
    };
}

export default module.exports;
const __export_createCreatePollCommand = module.exports.createCreatePollCommand;
export { __export_createCreatePollCommand as createCreatePollCommand };
