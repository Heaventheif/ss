import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as threads_1 from "../../../transport/http/threads.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeleteThreadCommand = createDeleteThreadCommand;
function createDeleteThreadCommand(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function deleteThread(threadOrThreads, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        const threadIDs = Array.isArray(threadOrThreads) ? threadOrThreads : [threadOrThreads];
        (0, threads_1.deleteThreadsViaMercury)({
            defaultFuncs,
            ctx,
            threadIDs
        })
            .then((response) => {
            if (response?.error) {
                throw response;
            }
            cb();
        })
            .catch((error) => {
            logError?.("deleteThread", error);
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createDeleteThreadCommand = module.exports.createDeleteThreadCommand;
export { __export_createDeleteThreadCommand as createDeleteThreadCommand };
