import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as shared_photos_1 from "../../../transport/http/shared-photos.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createGetThreadPicturesQuery = createGetThreadPicturesQuery;
function createGetThreadPicturesQuery(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function getThreadPictures(threadID, offset, limit, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback, []);
        (0, shared_photos_1.postSharedPhotosRequest)({
            defaultFuncs,
            ctx,
            form: {
                thread_id: threadID,
                offset,
                limit
            }
        })
            .then((resData) => {
            if (resData.error) {
                throw resData;
            }
            return Promise.all(resData.payload.imagesData.map((image) => (0, shared_photos_1.postSharedPhotosRequest)({
                defaultFuncs,
                ctx,
                form: {
                    thread_id: threadID,
                    image_id: image.fbid
                }
            }).then((detail) => {
                if (detail.error) {
                    throw detail;
                }
                const queryThreadID = detail.jsmods.require[0][3][1].query_metadata.query_path[0].message_thread;
                return detail.jsmods.require[0][3][1].query_results[queryThreadID].message_images.edges[0].node.image2;
            })));
        })
            .then((pictures) => {
            cb(null, pictures);
        })
            .catch((error) => {
            logError?.("Error in getThreadPictures", error);
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createGetThreadPicturesQuery = module.exports.createGetThreadPicturesQuery;
export { __export_createGetThreadPicturesQuery as createGetThreadPicturesQuery };
