import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as graphql_1 from "../../../transport/http/graphql.js";
import * as shared_1 from "../shared.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createGetUserInfoV2Query = createGetUserInfoV2Query;
const DEFAULT_DOC_ID = "24418640587785718";
const DEFAULT_FRIENDLY_NAME = "CometHovercardQueryRendererQuery";
const DEFAULT_CALLER_CLASS = "RelayModern";
function createGetUserInfoV2Query(deps) {
    const { defaultFuncs, ctx, logger } = deps;
    async function fetchOne(uid) {
        const form = {
            av: String(ctx?.userID || ""),
            fb_api_caller_class: DEFAULT_CALLER_CLASS,
            fb_api_req_friendly_name: DEFAULT_FRIENDLY_NAME,
            server_timestamps: true,
            doc_id: DEFAULT_DOC_ID,
            variables: JSON.stringify({
                actionBarRenderLocation: "WWW_COMET_HOVERCARD",
                context: "DEFAULT",
                entityID: String(uid),
                scale: 1,
                __relay_internal__pv__WorkCometIsEmployeeGKProviderrelayprovider: false
            })
        };
        const raw = await (0, graphql_1.postGraphql)({ defaultFuncs, ctx, form });
        const parsed = (0, shared_1.toJSONMaybe)(raw) ?? raw;
        const root = Array.isArray(parsed) ? parsed[0] : parsed;
        const user = root?.data?.node?.comet_hovercard_renderer?.user || null;
        return (0, shared_1.normalizeCometUser)(user);
    }
    return function getUserInfoV2(idOrList, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback, {});
        const ids = Array.isArray(idOrList) ? idOrList.map((value) => String(value)) : [String(idOrList)];
        Promise.allSettled(ids.map((id) => fetchOne(id)))
            .then((results) => {
            const out = {};
            for (let index = 0; index < ids.length; index += 1) {
                const settled = results[index];
                const normalized = settled.status === "fulfilled" ? settled.value : null;
                out[ids[index]] = (0, shared_1.toUserInfoEntry)(normalized, ids[index]);
            }
            cb(null, out);
        })
            .catch((error) => {
            logger?.(`getUserInfoV2 ${error?.message || String(error)}`, "error");
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createGetUserInfoV2Query = module.exports.createGetUserInfoV2Query;
export { __export_createGetUserInfoV2Query as createGetUserInfoV2Query };
