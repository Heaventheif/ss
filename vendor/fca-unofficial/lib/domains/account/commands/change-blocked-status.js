import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as facebook_1 from "../../../transport/http/facebook.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createChangeBlockedStatusCommand = createChangeBlockedStatusCommand;
function createChangeBlockedStatusCommand(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function changeBlockedStatus(userID, block, callback) {
        const { callback: legacyCallback, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        (0, facebook_1.postWithSavedCookiesAndLoginCheck)({
            defaultFuncs,
            ctx,
            url: `https://www.facebook.com/messaging/${block ? "" : "un"}block_messages/`,
            form: {
                fbid: userID
            }
        })
            .then((response) => {
            if (response?.error) {
                throw response;
            }
            legacyCallback();
        })
            .catch((error) => {
            logError?.("changeBlockedStatus", error);
            legacyCallback(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createChangeBlockedStatusCommand = module.exports.createChangeBlockedStatusCommand;
export { __export_createChangeBlockedStatusCommand as createChangeBlockedStatusCommand };
