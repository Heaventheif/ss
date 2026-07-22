import format from "../../utils/format/index.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toJSONMaybe = toJSONMaybe;
exports.usernameFromUrl = usernameFromUrl;
exports.pickMeta = pickMeta;
exports.normalizePrimaryActor = normalizePrimaryActor;
exports.normalizeCometUser = normalizeCometUser;
exports.mergeUserEntry = mergeUserEntry;
exports.toUserInfoEntry = toUserInfoEntry;
exports.formatUserIdEntry = formatUserIdEntry;
const format_1 = __importDefault(format);
const { formatID } = format_1.default;
function toJSONMaybe(input) {
    if (!input) {
        return null;
    }
    if (typeof input === "string") {
        const normalized = input.trim().replace(/^for\s*\(\s*;\s*;\s*\)\s*;/, "");
        try {
            return JSON.parse(normalized);
        }
        catch {
            return null;
        }
    }
    return input;
}
function usernameFromUrl(raw) {
    if (!raw) {
        return null;
    }
    try {
        const parsed = new URL(raw);
        if (/^www\.facebook\.com$/i.test(parsed.hostname)) {
            const segment = parsed.pathname.replace(/^\//, "").replace(/\/$/, "");
            if (segment && !/^profile\.php$/i.test(segment) && !segment.includes("/")) {
                return segment;
            }
        }
    }
    catch { }
    return null;
}
function pickMeta(user) {
    let friendshipStatus = null;
    let gender = null;
    let shortName = user?.short_name || null;
    const primaryActions = Array.isArray(user?.primaryActions) ? user.primaryActions : [];
    const secondaryActions = Array.isArray(user?.secondaryActions) ? user.secondaryActions : [];
    const friendAction = primaryActions.find((entry) => entry?.profile_action_type === "FRIEND");
    if (friendAction?.client_handler?.profile_action?.restrictable_profile_owner) {
        const owner = friendAction.client_handler.profile_action.restrictable_profile_owner;
        friendshipStatus = owner?.friendship_status || null;
        gender = owner?.gender || gender;
        shortName = owner?.short_name || shortName;
    }
    if (!gender || !shortName) {
        const blockAction = secondaryActions.find((entry) => entry?.profile_action_type === "BLOCK");
        const owner2 = blockAction?.client_handler?.profile_action?.profile_owner;
        if (owner2) {
            gender = owner2.gender || gender;
            shortName = owner2.short_name || shortName;
        }
    }
    return { friendshipStatus, gender, shortName };
}
function normalizePrimaryActor(actor) {
    if (!actor) {
        return null;
    }
    return {
        id: actor.id || null,
        name: actor.name || null,
        firstName: actor.short_name || null,
        vanity: actor.username || null,
        thumbSrc: actor.big_image_src?.uri || null,
        profileUrl: actor.url || null,
        gender: actor.gender || null,
        type: actor.__typename || null,
        isFriend: Boolean(actor.is_viewer_friend),
        isBirthday: Boolean(actor.is_birthday),
        isMessengerUser: typeof actor.is_messenger_user === "boolean" ? actor.is_messenger_user : null,
        isMessageBlockedByViewer: Boolean(actor.is_message_blocked_by_viewer),
        workInfo: actor.work_info || null,
        messengerStatus: actor.messenger_account_status_category || null
    };
}
function normalizeCometUser(user) {
    if (!user) {
        return null;
    }
    const vanity = usernameFromUrl(user.profile_url || user.url);
    const meta = pickMeta(user);
    return {
        id: user.id || null,
        name: user.name || null,
        username: vanity || user.username_for_profile || null,
        vanity: vanity || user.username_for_profile || null,
        profileUrl: user.profile_url || user.url || null,
        avatar: user.profile_picture?.uri || null,
        thumbSrc: user.profile_picture?.uri || null,
        shortName: meta.shortName || null,
        firstName: meta.shortName || null,
        gender: meta.gender || null,
        type: "User",
        isFriend: meta.friendshipStatus === "ARE_FRIENDS",
        isBirthday: false,
        isMessengerUser: null,
        isMessageBlockedByViewer: false,
        workInfo: null,
        messengerStatus: null,
        friendshipStatus: meta.friendshipStatus || null
    };
}
function mergeUserEntry(primary, fallback) {
    if (!primary && !fallback) {
        return null;
    }
    const a = primary || {};
    const b = fallback || {};
    return {
        id: a.id || b.id || null,
        name: a.name || b.name || null,
        firstName: a.firstName || a.shortName || b.firstName || b.shortName || null,
        username: a.username || a.vanity || b.username || b.vanity || null,
        vanity: a.vanity || a.username || b.vanity || b.username || null,
        thumbSrc: a.thumbSrc || a.avatar || b.thumbSrc || b.avatar || null,
        avatar: a.avatar || a.thumbSrc || b.avatar || b.thumbSrc || null,
        profileUrl: a.profileUrl || b.profileUrl || null,
        gender: a.gender || b.gender || null,
        type: a.type || b.type || null,
        isFriend: typeof a.isFriend === "boolean" ? a.isFriend : Boolean(b.isFriend),
        isBirthday: typeof a.isBirthday === "boolean" ? a.isBirthday : Boolean(b.isBirthday),
        isMessengerUser: typeof a.isMessengerUser === "boolean" ? a.isMessengerUser : b.isMessengerUser,
        isMessageBlockedByViewer: typeof a.isMessageBlockedByViewer === "boolean"
            ? a.isMessageBlockedByViewer
            : Boolean(b.isMessageBlockedByViewer),
        workInfo: a.workInfo || b.workInfo || null,
        messengerStatus: a.messengerStatus || b.messengerStatus || null
    };
}
function toUserInfoEntry(raw, idFallback) {
    return {
        id: raw?.id ? String(raw.id) : idFallback || null,
        name: raw?.name || null,
        firstName: raw?.firstName || raw?.shortName || null,
        vanity: raw?.vanity || raw?.username || null,
        thumbSrc: raw?.thumbSrc || raw?.avatar || null,
        profileUrl: raw?.profileUrl || raw?.uri || null,
        gender: raw?.gender || null,
        type: raw?.type || null,
        isFriend: Boolean(raw?.isFriend ?? raw?.is_friend),
        isBirthday: Boolean(raw?.isBirthday ?? raw?.is_birthday),
        isMessengerUser: typeof raw?.isMessengerUser === "boolean" ? raw.isMessengerUser : null,
        isMessageBlockedByViewer: Boolean(raw?.isMessageBlockedByViewer),
        workInfo: raw?.workInfo || null,
        messengerStatus: raw?.messengerStatus || null
    };
}
function formatUserIdEntry(data) {
    return {
        userID: formatID(data.uid.toString()) ?? "",
        photoUrl: data.photo,
        indexRank: data.index_rank,
        name: data.text,
        isVerified: data.is_verified,
        profileUrl: data.path,
        category: data.category,
        score: data.score,
        type: data.type
    };
}

export default module.exports;
const __export_toJSONMaybe = module.exports.toJSONMaybe;
const __export_usernameFromUrl = module.exports.usernameFromUrl;
const __export_pickMeta = module.exports.pickMeta;
const __export_normalizePrimaryActor = module.exports.normalizePrimaryActor;
const __export_normalizeCometUser = module.exports.normalizeCometUser;
const __export_mergeUserEntry = module.exports.mergeUserEntry;
const __export_toUserInfoEntry = module.exports.toUserInfoEntry;
const __export_formatUserIdEntry = module.exports.formatUserIdEntry;
export { __export_toJSONMaybe as toJSONMaybe };
export { __export_usernameFromUrl as usernameFromUrl };
export { __export_pickMeta as pickMeta };
export { __export_normalizePrimaryActor as normalizePrimaryActor };
export { __export_normalizeCometUser as normalizeCometUser };
export { __export_mergeUserEntry as mergeUserEntry };
export { __export_toUserInfoEntry as toUserInfoEntry };
export { __export_formatUserIdEntry as formatUserIdEntry };
