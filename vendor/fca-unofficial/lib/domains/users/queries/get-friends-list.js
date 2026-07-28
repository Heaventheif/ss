import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as form_data_1 from "../../../transport/http/form-data.js";
import format from "../../../utils/format/index.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGetFriendsListQuery = createGetFriendsListQuery;
const format_1 = __importDefault(format);
const { formatID } = format_1.default;
const GENDERS = {
    0: "unknown",
    1: "female_singular",
    2: "male_singular",
    3: "female_singular_guess",
    4: "male_singular_guess",
    5: "mixed",
    6: "neuter_singular",
    7: "unknown_singular",
    8: "female_plural",
    9: "male_plural",
    10: "neuter_plural",
    11: "unknown_plural"
};
function formatFriends(payload) {
    return Object.keys(payload).map((key) => {
        const user = payload[key];
        return {
            alternateName: user.alternateName || null,
            firstName: user.firstName || null,
            gender: GENDERS[user.gender] || "unknown",
            userID: formatID(String(user.id || "")),
            isFriend: Boolean(user.is_friend),
            fullName: user.name || null,
            profilePicture: user.thumbSrc || null,
            type: user.type || null,
            profileUrl: user.uri || null,
            vanity: user.vanity || null,
            isBirthday: Boolean(user.is_birthday)
        };
    });
}
function createGetFriendsListQuery(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function getFriendsList(callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback, []);
        (0, form_data_1.postFormDataWithLoginCheck)({
            defaultFuncs,
            ctx,
            url: "https://www.facebook.com/chat/user_info_all",
            form: {},
            query: {
                viewer: ctx.userID
            }
        })
            .then((response) => {
            if (!response) {
                throw { error: "getFriendsList returned empty object." };
            }
            if (response?.error) {
                throw response;
            }
            cb(null, formatFriends((response.payload || {})));
        })
            .catch((error) => {
            logError?.("getFriendsList", error);
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createGetFriendsListQuery = module.exports.createGetFriendsListQuery;
export { __export_createGetFriendsListQuery as createGetFriendsListQuery };
