import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as graphql_1 from "../../../transport/http/graphql.js";
import format from "../../../utils/format/index.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChangeBioCommand = createChangeBioCommand;
const format_1 = __importDefault(format);
const { getType } = format_1.default;
function createChangeBioCommand(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function changeBio(bio, publish, callback) {
        let shouldPublish = publish;
        let cb = callback;
        if (!cb && (getType(publish) === "Function" || getType(publish) === "AsyncFunction")) {
            cb = publish;
        }
        if (getType(shouldPublish) !== "Boolean") {
            shouldPublish = false;
        }
        if (getType(bio) !== "String") {
            bio = "";
            shouldPublish = false;
        }
        const { callback: legacyCallback, promise } = (0, legacy_promise_1.createLegacyPromise)(cb);
        (0, graphql_1.postGraphql)({
            defaultFuncs,
            ctx,
            jar: ctx.jar,
            form: {
                fb_api_caller_class: "RelayModern",
                fb_api_req_friendly_name: "ProfileCometSetBioMutation",
                doc_id: "2725043627607610",
                variables: JSON.stringify({
                    input: {
                        bio,
                        publish_bio_feed_story: shouldPublish,
                        actor_id: ctx.i_userID || ctx.userID,
                        client_mutation_id: Math.round(Math.random() * 1024).toString()
                    },
                    hasProfileTileViewID: false,
                    profileTileViewID: null,
                    scale: 1
                }),
                av: ctx.i_userID || ctx.userID
            }
        })
            .then((resData) => {
            if (resData.errors) {
                throw resData;
            }
            legacyCallback();
        })
            .catch((error) => {
            logError?.("changeBio", error);
            legacyCallback(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createChangeBioCommand = module.exports.createChangeBioCommand;
export { __export_createChangeBioCommand as createChangeBioCommand };
