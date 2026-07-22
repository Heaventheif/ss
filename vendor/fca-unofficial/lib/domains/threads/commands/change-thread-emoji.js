import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as threads_1 from "../../../transport/http/threads.js";
import * as publish_1 from "../../../transport/realtime/publish.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createChangeThreadEmojiCommand = createChangeThreadEmojiCommand;
const THREAD_EMOJI_ERROR = "Trying to change emoji of a chat that doesn't exist. Have at least one message in the thread before trying to change the emoji.";
function createChangeThreadEmojiCommand(deps) {
    const { defaultFuncs, ctx, generateOfflineThreadingID, logError } = deps;
    return function changeThreadEmoji(emoji, threadID, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        if (!emoji || threadID === null || typeof threadID === "undefined" || threadID === "") {
            cb(new Error("emoji and threadID are required"));
            return promise;
        }
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
                                label: "100003",
                                payload: JSON.stringify({
                                    thread_key: threadID,
                                    custom_emoji: emoji,
                                    avatar_sticker_instruction_key_id: null,
                                    sync_group: 1
                                }),
                                queue_name: "thread_quick_reaction",
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
                logError?.("changeThreadEmoji", error);
                cb(error);
            });
            return promise;
        }
        (0, threads_1.changeThreadEmojiViaHttp)({
            defaultFuncs: defaultFuncs,
            ctx,
            emoji,
            threadID
        })
            .then((response) => {
            if (response?.error === 1357031) {
                throw { error: THREAD_EMOJI_ERROR };
            }
            if (response?.error) {
                throw response;
            }
            cb(null, { success: true });
        })
            .catch((error) => {
            logError?.("changeThreadEmoji", error);
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createChangeThreadEmojiCommand = module.exports.createChangeThreadEmojiCommand;
export { __export_createChangeThreadEmojiCommand as createChangeThreadEmojiCommand };
