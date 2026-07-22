import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as facebook_1 from "../../../transport/http/facebook.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createHandleFriendRequestCommand = createHandleFriendRequestCommand;
function createHandleFriendRequestCommand(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function handleFriendRequest(userID, accept, callback) {
        if (typeof accept !== "boolean") {
            throw {
                error: "Please pass a boolean as a second argument."
            };
        }
        const { callback: legacyCallback, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        (0, facebook_1.postWithLoginCheck)({
            defaultFuncs,
            ctx,
            url: "https://www.facebook.com/requests/friends/ajax/",
            form: {
                viewer_id: ctx.userID,
                "frefs[0]": "jwl",
                floc: "friend_center_requests",
                ref: "/reqs.php",
                action: accept ? "confirm" : "reject"
            }
        })
            .then((resData) => {
            if (resData.payload.err) {
                throw {
                    err: resData.payload.err
                };
            }
            legacyCallback();
        })
            .catch((error) => {
            logError?.("handleFriendRequest", error);
            legacyCallback(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createHandleFriendRequestCommand = module.exports.createHandleFriendRequestCommand;
export { __export_createHandleFriendRequestCommand as createHandleFriendRequestCommand };
