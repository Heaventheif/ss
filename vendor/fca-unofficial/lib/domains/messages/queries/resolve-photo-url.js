import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as facebook_1 from "../../../transport/http/facebook.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createResolvePhotoUrlQuery = createResolvePhotoUrlQuery;
function createResolvePhotoUrlQuery(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function resolvePhotoUrl(photoID, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        (0, facebook_1.getWithLoginCheck)({
            defaultFuncs,
            ctx,
            url: "https://www.facebook.com/mercury/attachments/photo",
            form: {
                photo_id: photoID
            }
        })
            .then((response) => {
            if (response?.error) {
                throw response;
            }
            const photoUrl = response?.jsmods?.require?.[0]?.[3]?.[0];
            cb(null, String(photoUrl || ""));
        })
            .catch((error) => {
            logError?.("resolvePhotoUrl", error);
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createResolvePhotoUrlQuery = module.exports.createResolvePhotoUrlQuery;
export { __export_createResolvePhotoUrlQuery as createResolvePhotoUrlQuery };
