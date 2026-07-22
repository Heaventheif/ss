import * as callbackify_1 from "../../../compat/callbackify.js";
import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as mercury_1 from "../../../transport/http/mercury.js";
import * as publish_1 from "../../../transport/realtime/publish.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createMarkReadCommand = createMarkReadCommand;
function createMarkReadCommand(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return async function markAsRead(threadID, read, callback) {
        const cb = typeof read === "function"
            ? (0, callbackify_1.ensureNodeCallback)(read)
            : (0, callbackify_1.ensureNodeCallback)(callback);
        const shouldRead = typeof read === "boolean" ? read : true;
        try {
            const transport = (0, capability_resolver_1.resolveMarkAsReadTransport)(ctx);
            if (transport === "page-http") {
                const resData = await (0, mercury_1.changeReadStatusViaMercury)({
                    defaultFuncs,
                    ctx,
                    threadID,
                    read: shouldRead
                });
                if (resData?.error) {
                    const error = resData.error;
                    logError?.("markAsRead", error);
                    if (typeof error === "object" && error && error.error === "Not logged in.") {
                        ctx.loggedIn = false;
                    }
                    cb(error);
                    return error;
                }
                cb();
                return null;
            }
            await (0, publish_1.publishRealtimeMessage)({
                client: ctx.mqttClient,
                topic: "/mark_thread",
                payload: {
                    threadID,
                    mark: "read",
                    state: shouldRead
                }
            });
            cb();
            return null;
        }
        catch (error) {
            cb(error);
            return error;
        }
    };
}

export default module.exports;
const __export_createMarkReadCommand = module.exports.createMarkReadCommand;
export { __export_createMarkReadCommand as createMarkReadCommand };
