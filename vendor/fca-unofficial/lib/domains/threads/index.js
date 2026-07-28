import * as get_thread_info_1 from "./queries/get-thread-info.js";
import * as get_thread_list_1 from "./queries/get-thread-list.js";
import * as get_thread_history_1 from "./queries/get-thread-history.js";
import * as get_thread_pictures_1 from "./queries/get-thread-pictures.js";
import * as change_thread_color_1 from "./commands/change-thread-color.js";
import * as change_thread_emoji_1 from "./commands/change-thread-emoji.js";
import * as mute_thread_1 from "./commands/mute-thread.js";
import * as change_archived_status_1 from "./commands/change-archived-status.js";
import * as add_users_to_group_1 from "./commands/add-users-to-group.js";
import * as remove_user_from_group_1 from "./commands/remove-user-from-group.js";
import * as change_admin_status_1 from "./commands/change-admin-status.js";
import * as change_group_image_1 from "./commands/change-group-image.js";
import * as change_nickname_1 from "./commands/change-nickname.js";
import * as create_new_group_1 from "./commands/create-new-group.js";
import * as create_poll_1 from "./commands/create-poll.js";
import * as create_theme_ai_1 from "./commands/create-theme-ai.js";
import * as handle_message_request_1 from "./commands/handle-message-request.js";
import * as delete_thread_1 from "./commands/delete-thread.js";
import * as set_title_1 from "./commands/set-title.js";
import * as search_for_thread_1 from "./queries/search-for-thread.js";
import * as get_theme_pictures_1 from "./queries/get-theme-pictures.js";
import * as get_thread_colors_1 from "./queries/get-thread-colors.js";
import thread from "./thread.types.js";

const module = { exports: {} };
const exports = module.exports;

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createThreadsDomain = createThreadsDomain;
function compactNamespace(namespace) {
    return Object.fromEntries(Object.entries(namespace).filter(([, value]) => value !== undefined));
}
function createThreadsDomain(deps) {
    return compactNamespace({
        getInfo: (0, get_thread_info_1.createGetThreadInfoQuery)(deps.info),
        getList: (0, get_thread_list_1.createGetThreadListQuery)(deps.list),
        getHistory: (0, get_thread_history_1.createGetThreadHistoryQuery)(deps.history),
        getPictures: (0, get_thread_pictures_1.createGetThreadPicturesQuery)(deps.pictures),
        getColors: (0, get_thread_colors_1.createGetThreadColorsQuery)(),
        setColor: deps.color ? (0, change_thread_color_1.createChangeThreadColorCommand)(deps.color) : undefined,
        setEmoji: deps.emoji ? (0, change_thread_emoji_1.createChangeThreadEmojiCommand)(deps.emoji) : undefined,
        mute: deps.mute ? (0, mute_thread_1.createMuteThreadCommand)(deps.mute) : undefined,
        archive: deps.archive ? (0, change_archived_status_1.createChangeArchivedStatusCommand)(deps.archive) : undefined,
        addUsers: deps.addUsers ? (0, add_users_to_group_1.createAddUsersToGroupCommand)(deps.addUsers) : undefined,
        removeUser: deps.removeUser ? (0, remove_user_from_group_1.createRemoveUserFromGroupCommand)(deps.removeUser) : undefined,
        setAdmin: deps.adminStatus ? (0, change_admin_status_1.createChangeAdminStatusCommand)(deps.adminStatus) : undefined,
        setImage: deps.groupImage ? (0, change_group_image_1.createChangeGroupImageCommand)(deps.groupImage) : undefined,
        setNickname: deps.nickname ? (0, change_nickname_1.createChangeNicknameCommand)(deps.nickname) : undefined,
        createGroup: deps.createGroup ? (0, create_new_group_1.createCreateNewGroupCommand)(deps.createGroup) : undefined,
        createPoll: deps.createPoll ? (0, create_poll_1.createCreatePollCommand)(deps.createPoll) : undefined,
        createThemeAI: deps.createThemeAI ? (0, create_theme_ai_1.createCreateThemeAICommand)(deps.createThemeAI) : undefined,
        handleMessageRequest: deps.messageRequest
            ? (0, handle_message_request_1.createHandleMessageRequestCommand)(deps.messageRequest)
            : undefined,
        delete: deps.deleteThread ? (0, delete_thread_1.createDeleteThreadCommand)(deps.deleteThread) : undefined,
        setTitle: deps.title ? (0, set_title_1.createSetTitleCommand)(deps.title) : undefined,
        search: deps.search ? (0, search_for_thread_1.createSearchForThreadQuery)(deps.search) : undefined,
        getThemePictures: deps.themePictures ? (0, get_theme_pictures_1.createGetThemePicturesQuery)(deps.themePictures) : undefined
    });
}
__exportStar(thread, exports);
__exportStar(add_users_to_group_1, exports);
__exportStar(change_archived_status_1, exports);
__exportStar(change_admin_status_1, exports);
__exportStar(change_group_image_1, exports);
__exportStar(change_thread_color_1, exports);
__exportStar(change_thread_emoji_1, exports);
__exportStar(change_nickname_1, exports);
__exportStar(create_new_group_1, exports);
__exportStar(create_poll_1, exports);
__exportStar(create_theme_ai_1, exports);
__exportStar(delete_thread_1, exports);
__exportStar(handle_message_request_1, exports);
__exportStar(mute_thread_1, exports);
__exportStar(remove_user_from_group_1, exports);
__exportStar(set_title_1, exports);
__exportStar(get_thread_info_1, exports);
__exportStar(get_thread_list_1, exports);
__exportStar(get_thread_history_1, exports);
__exportStar(get_thread_pictures_1, exports);
__exportStar(get_theme_pictures_1, exports);
__exportStar(search_for_thread_1, exports);
__exportStar(get_thread_colors_1, exports);

export default module.exports;
const __export_createThreadsDomain = module.exports.createThreadsDomain;
export { __export_createThreadsDomain as createThreadsDomain };
