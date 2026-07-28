import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as graphql_1 from "../../../transport/http/graphql.js";
import * as form_data_1 from "../../../transport/http/form-data.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createChangeAvatarCommand = createChangeAvatarCommand;
function normalizeGraphqlResponse(response) {
    if (Array.isArray(response)) {
        return response[0];
    }
    return response;
}
function createChangeAvatarCommand(deps) {
    const { defaultFuncs, ctx, isReadableStream, logError } = deps;
    return function changeAvatar(image, caption = "", timestamp = null, callback) {
        let effectiveCaption = caption;
        let effectiveTimestamp = timestamp;
        let effectiveCallback = callback;
        if ((effectiveTimestamp === null || typeof effectiveTimestamp === "undefined") &&
            typeof effectiveCaption === "number") {
            effectiveTimestamp = effectiveCaption;
            effectiveCaption = "";
        }
        if ((effectiveTimestamp === null || typeof effectiveTimestamp === "undefined") &&
            typeof effectiveCaption === "function" &&
            !effectiveCallback) {
            effectiveCallback = effectiveCaption;
            effectiveCaption = "";
            effectiveTimestamp = null;
        }
        if (typeof effectiveTimestamp === "function" && !effectiveCallback) {
            effectiveCallback = effectiveTimestamp;
            effectiveTimestamp = null;
        }
        const finalCaption = typeof effectiveCaption === "string" ? effectiveCaption : "";
        const finalTimestamp = typeof effectiveTimestamp === "number" ? effectiveTimestamp : null;
        const { callback: legacyCallback, promise } = (0, legacy_promise_1.createLegacyPromise)(effectiveCallback);
        if (!isReadableStream(image)) {
            legacyCallback("Image is not a readable stream");
            return promise;
        }
        const actorId = ctx.i_userID || ctx.userID;
        (0, form_data_1.postFormDataWithLoginCheck)({
            defaultFuncs,
            ctx,
            url: "https://www.facebook.com/profile/picture/upload/",
            form: {
                profile_id: ctx.userID,
                photo_source: 57,
                av: ctx.userID,
                file: image
            }
        })
            .then((uploadResponse) => {
            if (uploadResponse?.error) {
                throw uploadResponse;
            }
            return (0, graphql_1.postGraphql)({
                defaultFuncs,
                ctx,
                jar: ctx.jar,
                form: {
                    av: actorId,
                    fb_api_req_friendly_name: "ProfileCometProfilePictureSetMutation",
                    fb_api_caller_class: "RelayModern",
                    doc_id: "5066134240065849",
                    variables: JSON.stringify({
                        input: {
                            caption: finalCaption,
                            existing_photo_id: uploadResponse?.payload?.fbid,
                            expiration_time: finalTimestamp,
                            profile_id: actorId,
                            profile_pic_method: "EXISTING",
                            profile_pic_source: "TIMELINE",
                            scaled_crop_rect: {
                                height: 1,
                                width: 1,
                                x: 0,
                                y: 0
                            },
                            skip_cropping: true,
                            actor_id: actorId,
                            client_mutation_id: Math.round(Math.random() * 19).toString()
                        },
                        isPage: false,
                        isProfile: true,
                        scale: 3
                    })
                }
            });
        })
            .then((response) => {
            const root = normalizeGraphqlResponse(response);
            if (root?.errors || response?.errors) {
                throw response;
            }
            legacyCallback(null, root?.data?.profile_picture_set);
        })
            .catch((error) => {
            logError?.("changeAvatar", error);
            legacyCallback(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createChangeAvatarCommand = module.exports.createChangeAvatarCommand;
export { __export_createChangeAvatarCommand as createChangeAvatarCommand };
