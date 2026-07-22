import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as facebook_1 from "../../../transport/http/facebook.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createUnfriendCommand = createUnfriendCommand;
function createUnfriendCommand(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function unfriend(userID, callback) {
        const { callback: legacyCallback, promise } = (0, legacy_promise_1.createLegacyPromise)(callback, false);
        (0, facebook_1.postWithLoginCheck)({
            defaultFuncs,
            ctx,
            url: "https://www.facebook.com/ajax/profile/removefriendconfirm.php",
            form: {
                uid: userID,
                unref: "bd_friends_tab",
                floc: "friends_tab",
                "nctr[_mod]": `pagelet_timeline_app_collection_${ctx.userID}:2356318349:2`
            }
        })
            .then((resData) => {
            if (resData.error) {
                throw resData;
            }
            legacyCallback(null, true);
        })
            .catch((error) => {
            logError?.("unfriend", error);
            legacyCallback(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createUnfriendCommand = module.exports.createUnfriendCommand;
export { __export_createUnfriendCommand as createUnfriendCommand };
