import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as threads_1 from "../../../transport/http/threads.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createHandleMessageRequestCommand = createHandleMessageRequestCommand;
function createHandleMessageRequestCommand(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function handleMessageRequest(threadID, accept, callback) {
        if (typeof accept !== "boolean") {
            throw {
                error: "Please pass a boolean as a second argument."
            };
        }
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        const threadIDs = Array.isArray(threadID) ? threadID : [threadID];
        const messageBox = accept ? "inbox" : "other";
        const form = {
            client: "mercury"
        };
        threadIDs.forEach((value, index) => {
            form[`${messageBox}[${index}]`] = value;
        });
        (0, threads_1.moveThreadsViaMercury)({
            defaultFuncs,
            ctx,
            form
        })
            .then((response) => {
            if (response?.error) {
                throw response;
            }
            cb();
        })
            .catch((error) => {
            logError?.("handleMessageRequest", error);
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createHandleMessageRequestCommand = module.exports.createHandleMessageRequestCommand;
export { __export_createHandleMessageRequestCommand as createHandleMessageRequestCommand };
