import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as graphql_1 from "../../../transport/http/graphql.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createCreateThemeAICommand = createCreateThemeAICommand;
function createCreateThemeAICommand(deps) {
    const { defaultFuncs, ctx, createClientMutationId = () => Math.round(Math.random() * 19).toString(), logError } = deps;
    return function createThemeAI(prompt, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        if (typeof prompt !== "string") {
            cb({ error: "Invalid prompt. Please provide a string." });
            return promise;
        }
        const normalizedPrompt = prompt.trim();
        if (!normalizedPrompt) {
            cb({ error: "Prompt cannot be empty." });
            return promise;
        }
        (0, graphql_1.postGraphql)({
            defaultFuncs,
            ctx,
            form: {
                av: ctx.userID,
                fb_api_caller_class: "RelayModern",
                fb_api_req_friendly_name: "useGenerateAIThemeMutation",
                doc_id: "23873748445608673",
                variables: JSON.stringify({
                    input: {
                        client_mutation_id: createClientMutationId(),
                        actor_id: ctx.userID,
                        bypass_cache: true,
                        caller: "MESSENGER",
                        num_themes: 1,
                        prompt: normalizedPrompt
                    }
                }),
                server_timestamps: true
            }
        })
            .then((resData) => {
            if (resData?.errors) {
                throw resData;
            }
            const themes = resData?.data?.xfb_generate_ai_themes_from_prompt?.themes;
            if (!Array.isArray(themes) || themes.length === 0) {
                throw {
                    error: "No themes generated",
                    res: resData
                };
            }
            const theme = themes[0];
            if (!theme?.id || !theme?.background_asset) {
                throw {
                    error: "Invalid theme data",
                    res: resData
                };
            }
            cb(null, {
                id: String(theme.id),
                accessibility_label: theme.accessibility_label || null,
                background_asset: {
                    id: theme.background_asset.id || null,
                    image: {
                        url: theme.background_asset.image?.uri || null
                    }
                }
            });
        })
            .catch((error) => {
            logError?.("createThemeAI", error);
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createCreateThemeAICommand = module.exports.createCreateThemeAICommand;
export { __export_createCreateThemeAICommand as createCreateThemeAICommand };
