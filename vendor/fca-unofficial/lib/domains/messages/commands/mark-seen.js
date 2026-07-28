import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as mercury_1 from "../../../transport/http/mercury.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createMarkSeenCommand = createMarkSeenCommand;
function createMarkSeenCommand(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function markAsSeen(seenTimestamp, callback) {
        let effectiveTimestamp = typeof seenTimestamp === "number" ? seenTimestamp : Date.now();
        const effectiveCallback = typeof seenTimestamp === "function" ? seenTimestamp : callback;
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(effectiveCallback);
        (0, mercury_1.markSeenViaMercury)({
            defaultFuncs,
            ctx,
            seenTimestamp: effectiveTimestamp
        })
            .then((response) => {
            if (response?.error) {
                throw response;
            }
            cb();
        })
            .catch((error) => {
            logError?.("markAsSeen", error);
            if (typeof error === "object" && error && error.error === "Not logged in.") {
                ctx.loggedIn = false;
            }
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createMarkSeenCommand = module.exports.createMarkSeenCommand;
export { __export_createMarkSeenCommand as createMarkSeenCommand };
