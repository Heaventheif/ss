import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as facebook_1 from "../../../transport/http/facebook.js";
import * as shared_1 from "../shared.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createGetUserIdQuery = createGetUserIdQuery;
function createGetUserIdQuery(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function getUserID(name, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback, []);
        (0, facebook_1.getWithLoginCheck)({
            defaultFuncs,
            ctx,
            url: "https://www.facebook.com/ajax/typeahead/search.php",
            form: {
                value: String(name || "").toLowerCase(),
                viewer: ctx.userID,
                rsp: "search",
                context: "search",
                path: "/home.php",
                request_id: ctx.clientId
            }
        })
            .then((resData) => {
            if (resData.error) {
                throw resData;
            }
            const data = resData.payload.entries;
            cb(null, data.map(shared_1.formatUserIdEntry));
        })
            .catch((error) => {
            logError?.("getUserID", error);
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createGetUserIdQuery = module.exports.createGetUserIdQuery;
export { __export_createGetUserIdQuery as createGetUserIdQuery };
