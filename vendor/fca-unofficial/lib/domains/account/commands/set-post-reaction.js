import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as graphql_1 from "../../../transport/http/graphql.js";
import format from "../../../utils/format/index.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSetPostReactionCommand = createSetPostReactionCommand;
const format_1 = __importDefault(format);
const { getType } = format_1.default;
function formatData(resData) {
    return {
        viewer_feedback_reaction_info: resData.feedback_react.feedback.viewer_feedback_reaction_info,
        supported_reactions: resData.feedback_react.feedback.supported_reactions,
        top_reactions: resData.feedback_react.feedback.top_reactions.edges,
        reaction_count: resData.feedback_react.feedback.reaction_count
    };
}
function createSetPostReactionCommand(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function setPostReaction(postID, type, callback) {
        let reactionType = type;
        let cb = callback;
        if (!cb && (getType(type) === "Function" || getType(type) === "AsyncFunction")) {
            cb = type;
            reactionType = 0;
        }
        const map = {
            unlike: 0,
            like: 1,
            heart: 2,
            love: 16,
            haha: 4,
            wow: 3,
            sad: 7,
            angry: 8
        };
        if (getType(reactionType) !== "Number" && getType(reactionType) === "String") {
            reactionType = map[String(reactionType).toLowerCase()];
        }
        if (getType(reactionType) !== "Number" && getType(reactionType) !== "String") {
            throw { error: "setPostReaction: Invalid reaction type" };
        }
        if (reactionType != 0 && !reactionType) {
            throw { error: "setPostReaction: Invalid reaction type" };
        }
        const { callback: legacyCallback, promise } = (0, legacy_promise_1.createLegacyPromise)(cb);
        (0, graphql_1.postGraphql)({
            defaultFuncs,
            ctx,
            jar: ctx.jar,
            form: {
                av: ctx.userID,
                fb_api_caller_class: "RelayModern",
                fb_api_req_friendly_name: "CometUFIFeedbackReactMutation",
                doc_id: "4769042373179384",
                variables: JSON.stringify({
                    input: {
                        actor_id: ctx.userID,
                        feedback_id: Buffer.from(`feedback:${postID}`).toString("base64"),
                        feedback_reaction: reactionType,
                        feedback_source: "OBJECT",
                        is_tracking_encrypted: true,
                        tracking: [],
                        session_id: "f7dd50dd-db6e-4598-8cd9-561d5002b423",
                        client_mutation_id: Math.round(Math.random() * 19).toString()
                    },
                    useDefaultActor: false,
                    scale: 3
                })
            }
        })
            .then((resData) => {
            if (resData.errors) {
                throw resData;
            }
            legacyCallback(null, formatData(resData.data));
        })
            .catch((error) => {
            logError?.("setPostReaction", error);
            legacyCallback(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createSetPostReactionCommand = module.exports.createSetPostReactionCommand;
export { __export_createSetPostReactionCommand as createSetPostReactionCommand };
