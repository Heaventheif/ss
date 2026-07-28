import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as mercury_1 from "../../../transport/http/mercury.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createMarkDeliveredCommand = createMarkDeliveredCommand;
function createMarkDeliveredCommand(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function markAsDelivered(threadID, messageID, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        if (!threadID || !messageID) {
            cb("Error: messageID or threadID is not defined");
            return promise;
        }
        (0, mercury_1.markDeliveredViaMercury)({
            defaultFuncs,
            ctx,
            threadID,
            messageID
        })
            .then((response) => {
            if (response?.error) {
                throw response;
            }
            cb();
        })
            .catch((error) => {
            logError?.("markAsDelivered", error);
            if (typeof error === "object" && error && error.error === "Not logged in.") {
                ctx.loggedIn = false;
            }
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createMarkDeliveredCommand = module.exports.createMarkDeliveredCommand;
export { __export_createMarkDeliveredCommand as createMarkDeliveredCommand };
