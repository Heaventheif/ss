import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as threads_1 from "../../../transport/http/threads.js";
import * as publish_1 from "../../../transport/realtime/publish.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createSetTitleCommand = createSetTitleCommand;
function buildSetTitleForm(params) {
    const { ctx, newTitle, threadID, generateOfflineThreadingID, generateTimestampRelative, generateThreadingID } = params;
    const messageAndOTID = generateOfflineThreadingID();
    const clientID = String(ctx.clientID || ctx.clientId || "0");
    return {
        client: "mercury",
        action_type: "ma-type:log-message",
        author: `fbid:${ctx.userID}`,
        author_email: "",
        coordinates: "",
        timestamp: Date.now(),
        timestamp_absolute: "Today",
        timestamp_relative: generateTimestampRelative(),
        timestamp_time_passed: "0",
        is_unread: false,
        is_cleared: false,
        is_forward: false,
        is_filtered_content: false,
        is_spoof_warning: false,
        source: "source:chat:web",
        "source_tags[0]": "source:chat",
        status: "0",
        offline_threading_id: messageAndOTID,
        message_id: messageAndOTID,
        threading_id: generateThreadingID(clientID),
        manual_retry_cnt: "0",
        thread_fbid: threadID,
        thread_name: newTitle,
        thread_id: threadID,
        log_message_type: "log:thread-name"
    };
}
function createSetTitleCommand(deps) {
    const { defaultFuncs, ctx, generateOfflineThreadingID, generateTimestampRelative, generateThreadingID, logError } = deps;
    return function setTitle(newTitle, threadID, callback) {
        if (!callback && typeof threadID === "function") {
            throw { error: "please pass a threadID as a second argument." };
        }
        const actualThreadID = threadID;
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        const transport = (0, capability_resolver_1.resolveThreadMutationTransport)(ctx);
        if (transport === "mqtt") {
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
                                label: "32",
                                payload: JSON.stringify({
                                    thread_key: actualThreadID,
                                    thread_name: newTitle,
                                    sync_group: 1
                                }),
                                queue_name: actualThreadID,
                                task_id: Math.floor(Math.random() * 1001)
                            }
                        ],
                        version_id: "8798795233522156"
                    }),
                    request_id: ++ctx.wsReqNumber,
                    type: 3
                }
            })
                .then(() => {
                cb(null, { success: true });
            })
                .catch((error) => {
                logError?.("setTitle", error);
                cb(error);
            });
            return promise;
        }
        (0, threads_1.setThreadTitleViaHttp)({
            defaultFuncs,
            ctx,
            form: buildSetTitleForm({
                ctx,
                newTitle,
                threadID: actualThreadID,
                generateOfflineThreadingID,
                generateTimestampRelative,
                generateThreadingID
            })
        })
            .then((response) => {
            if (response?.error === 1545012) {
                throw { error: "Cannot change chat title: Not member of chat." };
            }
            if (response?.error === 1545003) {
                throw { error: "Cannot set title of single-user chat." };
            }
            if (response?.error) {
                throw response;
            }
            cb();
        })
            .catch((error) => {
            logError?.("setTitle", error);
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createSetTitleCommand = module.exports.createSetTitleCommand;
export { __export_createSetTitleCommand as createSetTitleCommand };
