import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as graphql_1 from "../../../transport/http/graphql.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createCreateNewGroupCommand = createCreateNewGroupCommand;
function createCreateNewGroupCommand(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function createNewGroup(participantIDs, groupTitle, callback) {
        let effectiveTitle = groupTitle;
        let effectiveCallback = callback;
        if (typeof effectiveTitle === "function") {
            effectiveCallback = effectiveTitle;
            effectiveTitle = null;
        }
        if (!Array.isArray(participantIDs)) {
            throw { error: "createNewGroup: participantIDs should be an array." };
        }
        if (participantIDs.length < 2) {
            throw { error: "createNewGroup: participantIDs should have at least 2 IDs." };
        }
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(effectiveCallback);
        const participants = participantIDs.map((participantID) => ({ fbid: participantID }));
        participants.push({ fbid: ctx.i_userID || ctx.userID });
        (0, graphql_1.postGraphql)({
            defaultFuncs,
            ctx,
            jar: ctx.jar,
            form: {
                fb_api_caller_class: "RelayModern",
                fb_api_req_friendly_name: "MessengerGroupCreateMutation",
                av: ctx.i_userID || ctx.userID,
                doc_id: "577041672419534",
                variables: JSON.stringify({
                    input: {
                        entry_point: "jewel_new_group",
                        actor_id: ctx.i_userID || ctx.userID,
                        participants,
                        client_mutation_id: Math.round(Math.random() * 1024).toString(),
                        thread_settings: {
                            name: typeof effectiveTitle === "string" ? effectiveTitle : null,
                            joinable_mode: "PRIVATE",
                            thread_image_fbid: null
                        }
                    }
                })
            }
        })
            .then((response) => {
            if (response?.errors) {
                throw response;
            }
            cb(null, String(response?.data?.messenger_group_thread_create?.thread?.thread_key?.thread_fbid || ""));
        })
            .catch((error) => {
            logError?.("createNewGroup", error);
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createCreateNewGroupCommand = module.exports.createCreateNewGroupCommand;
export { __export_createCreateNewGroupCommand as createCreateNewGroupCommand };
