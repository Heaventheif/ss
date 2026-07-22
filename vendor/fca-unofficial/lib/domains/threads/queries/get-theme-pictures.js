import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as graphql_1 from "../../../transport/http/graphql.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createGetThemePicturesQuery = createGetThemePicturesQuery;
function createGetThemePicturesQuery(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function getThemePictures(id, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        const normalizedId = typeof id === "string" ? id : "";
        (0, graphql_1.postGraphql)({
            defaultFuncs,
            ctx,
            form: {
                fb_api_caller_class: "RelayModern",
                fb_api_req_friendly_name: "MWPThreadThemeProviderQuery",
                doc_id: "9734829906576883",
                server_timestamps: true,
                variables: JSON.stringify({
                    id: normalizedId
                }),
                av: ctx.userID
            }
        })
            .then((resData) => {
            if (resData?.errors) {
                throw resData;
            }
            cb(null, resData);
        })
            .catch((error) => {
            logError?.("getThemePictures", error);
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createGetThemePicturesQuery = module.exports.createGetThemePicturesQuery;
export { __export_createGetThemePicturesQuery as createGetThemePicturesQuery };
