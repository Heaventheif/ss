import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as graphql_1 from "../../../transport/http/graphql.js";
import * as facebook_1 from "../../../transport/http/facebook.js";
import * as shared_1 from "../shared.js";
import userData from "../../../database/userData.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGetUserInfoQuery = createGetUserInfoQuery;
const userData_1 = __importDefault(userData);
const DOC_PRIMARY = "5009315269112105";
const BATCH_PRIMARY = "MessengerParticipantsFetcher";
const DOC_V2 = "24418640587785718";
const FRIENDLY_V2 = "CometHovercardQueryRendererQuery";
const CALLER_V2 = "RelayModern";
function createGetUserInfoQuery(deps) {
    const { defaultFuncs, api, ctx, logger, logError } = deps;
    const globalConfig = global.fca?.config;
    const disableAntiUserInfo = Boolean(globalConfig?.antiGetInfo?.AntiGetUserInfo === true);
    const userData = (0, userData_1.default)(api);
    const { create, get, update } = userData;
    async function fetchPrimary(ids) {
        if (!ids.length) {
            return {};
        }
        const resData = await (0, graphql_1.postGraphqlBatch)({
            defaultFuncs,
            ctx,
            form: {
                queries: JSON.stringify({
                    o0: {
                        doc_id: DOC_PRIMARY,
                        query_params: { ids }
                    }
                }),
                batch_name: BATCH_PRIMARY
            }
        });
        const first = resData?.[0];
        const actors = first?.o0?.data?.messaging_actors;
        if (!Array.isArray(actors)) {
            return {};
        }
        const out = {};
        for (const actor of actors) {
            const normalized = (0, shared_1.normalizePrimaryActor)(actor);
            if (normalized?.id) {
                out[String(normalized.id)] = normalized;
            }
        }
        return out;
    }
    async function fetchV2One(uid) {
        const raw = await (0, graphql_1.postGraphql)({
            defaultFuncs,
            ctx,
            form: {
                av: String(ctx?.userID || ""),
                fb_api_caller_class: CALLER_V2,
                fb_api_req_friendly_name: FRIENDLY_V2,
                server_timestamps: true,
                doc_id: DOC_V2,
                variables: JSON.stringify({
                    actionBarRenderLocation: "WWW_COMET_HOVERCARD",
                    context: "DEFAULT",
                    entityID: String(uid),
                    scale: 1,
                    __relay_internal__pv__WorkCometIsEmployeeGKProviderrelayprovider: false
                })
            }
        });
        const parsed = (0, shared_1.toJSONMaybe)(raw) ?? raw;
        const root = Array.isArray(parsed) ? parsed[0] : parsed;
        const user = root?.data?.node?.comet_hovercard_renderer?.user || null;
        return (0, shared_1.normalizeCometUser)(user);
    }
    async function fetchMergedUsers(ids) {
        const primary = await fetchPrimary(ids).catch(() => ({}));
        const out = {};
        const missing = [];
        for (const id of ids) {
            if (primary[id]) {
                out[id] = (0, shared_1.toUserInfoEntry)(primary[id], id);
            }
            else {
                missing.push(id);
            }
        }
        if (missing.length) {
            const fallbacks = await Promise.allSettled(missing.map((id) => fetchV2One(id)));
            for (let index = 0; index < missing.length; index += 1) {
                const id = missing[index];
                const settled = fallbacks[index];
                const fallback = settled.status === "fulfilled" ? settled.value : null;
                const merged = (0, shared_1.mergeUserEntry)(primary[id] || null, fallback);
                out[id] = (0, shared_1.toUserInfoEntry)(merged, id);
            }
        }
        return out;
    }
    async function upsertUser(id, entry) {
        try {
            const existing = await get(id);
            if (existing) {
                await update(id, { data: entry });
            }
            else {
                await create(id, { data: entry });
            }
        }
        catch (error) {
            logger?.(`user upsert ${id} error: ${error?.message || String(error)}`, "warn");
        }
    }
    async function loadCached(ids) {
        const out = {};
        const rows = await Promise.all(ids.map((id) => get(id).catch(() => null)));
        for (let index = 0; index < ids.length; index += 1) {
            const id = ids[index];
            const row = rows[index];
            if (row?.data) {
                out[id] = (0, shared_1.toUserInfoEntry)(row.data, id);
            }
        }
        return out;
    }
    function fetchLegacy(ids, callback) {
        const form = {};
        ids.forEach((id, index) => {
            form[`ids[${index}]`] = id;
        });
        (0, facebook_1.postWithLoginCheck)({
            defaultFuncs,
            ctx,
            url: "https://www.facebook.com/chat/user_info/",
            form
        })
            .then((resData) => {
            if (resData?.error) {
                throw resData;
            }
            const profiles = (resData?.payload?.profiles || {});
            const out = {};
            for (const id of Object.keys(profiles)) {
                out[id] = (0, shared_1.toUserInfoEntry)(profiles[id], id);
            }
            callback(null, out);
        })
            .catch((error) => {
            logError?.("getUserInfo", "getUserInfo request failed");
            callback(error);
        });
    }
    return function getUserInfo(idsOrId, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback, {});
        const ids = Array.isArray(idsOrId) ? idsOrId.map((value) => String(value)) : [String(idsOrId)];
        if (disableAntiUserInfo) {
            fetchLegacy(ids, cb);
            return promise;
        }
        (async () => {
            const cached = await loadCached(ids);
            const missing = ids.filter((id) => !cached[id]);
            if (missing.length === 0) {
                cb(null, cached);
                return;
            }
            const fetched = await fetchMergedUsers(missing);
            for (const id of Object.keys(fetched)) {
                await upsertUser(id, fetched[id]);
            }
            cb(null, { ...cached, ...fetched });
        })().catch((error) => {
            logError?.("getUserInfo", "getUserInfo fetch failed");
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createGetUserInfoQuery = module.exports.createGetUserInfoQuery;
export { __export_createGetUserInfoQuery as createGetUserInfoQuery };
