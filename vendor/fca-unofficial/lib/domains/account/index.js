import * as get_current_user_id_1 from "./commands/get-current-user-id.js";
import * as logout_1 from "./commands/logout.js";
import * as refresh_fb_dtsg_1 from "./commands/refresh-fb-dtsg.js";
import * as add_external_module_1 from "./commands/add-external-module.js";
import * as enable_auto_save_app_state_1 from "./commands/enable-auto-save-app-state.js";
import * as change_bio_1 from "./commands/change-bio.js";
import * as change_avatar_1 from "./commands/change-avatar.js";
import * as handle_friend_request_1 from "./commands/handle-friend-request.js";
import * as unfriend_1 from "./commands/unfriend.js";
import * as set_post_reaction_1 from "./commands/set-post-reaction.js";
import * as change_blocked_status_1 from "./commands/change-blocked-status.js";
import account from "./account.types.js";

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
exports.createAccountDomain = createAccountDomain;
function compactNamespace(namespace) {
    return Object.fromEntries(Object.entries(namespace).filter(([, value]) => value !== undefined));
}
function createAccountDomain(deps) {
    return compactNamespace({
        addExternalModule: (0, add_external_module_1.createAddExternalModuleCommand)(deps.addExternalModule),
        getCurrentUserID: (0, get_current_user_id_1.createGetCurrentUserIdCommand)(deps.currentUserId),
        enableAutoSaveAppState: (0, enable_auto_save_app_state_1.createEnableAutoSaveAppStateCommand)(deps.enableAutoSaveAppState),
        logout: (0, logout_1.createLogoutCommand)(deps.logout),
        refreshFb_dtsg: (0, refresh_fb_dtsg_1.createRefreshFbDtsgCommand)(deps.refreshFbDtsg),
        changeAvatar: (0, change_avatar_1.createChangeAvatarCommand)(deps.changeAvatar),
        changeBio: (0, change_bio_1.createChangeBioCommand)(deps.changeBio),
        handleFriendRequest: (0, handle_friend_request_1.createHandleFriendRequestCommand)(deps.handleFriendRequest),
        unfriend: (0, unfriend_1.createUnfriendCommand)(deps.unfriend),
        setPostReaction: (0, set_post_reaction_1.createSetPostReactionCommand)(deps.setPostReaction),
        changeBlockedStatus: deps.changeBlockedStatus
            ? (0, change_blocked_status_1.createChangeBlockedStatusCommand)(deps.changeBlockedStatus)
            : undefined
    });
}
__exportStar(account, exports);
__exportStar(add_external_module_1, exports);
__exportStar(enable_auto_save_app_state_1, exports);
__exportStar(get_current_user_id_1, exports);
__exportStar(logout_1, exports);
__exportStar(refresh_fb_dtsg_1, exports);
__exportStar(change_avatar_1, exports);
__exportStar(change_bio_1, exports);
__exportStar(change_blocked_status_1, exports);
__exportStar(handle_friend_request_1, exports);
__exportStar(unfriend_1, exports);
__exportStar(set_post_reaction_1, exports);

export default module.exports;
const __export_createAccountDomain = module.exports.createAccountDomain;
export { __export_createAccountDomain as createAccountDomain };
