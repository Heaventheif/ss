import * as get_user_info_1 from "./queries/get-user-info.js";
import * as get_user_info_v2_1 from "./queries/get-user-info-v2.js";
import * as get_user_id_1 from "./queries/get-user-id.js";
import * as get_friends_list_1 from "./queries/get-friends-list.js";
import user from "./user.types.js";

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
exports.createUsersDomain = createUsersDomain;
function compactNamespace(namespace) {
    return Object.fromEntries(Object.entries(namespace).filter(([, value]) => value !== undefined));
}
function createUsersDomain(deps) {
    return compactNamespace({
        getInfo: (0, get_user_info_1.createGetUserInfoQuery)(deps.info),
        getInfoV2: (0, get_user_info_v2_1.createGetUserInfoV2Query)(deps.infoV2),
        getID: (0, get_user_id_1.createGetUserIdQuery)(deps.idLookup),
        getFriends: deps.friendsList ? (0, get_friends_list_1.createGetFriendsListQuery)(deps.friendsList) : undefined
    });
}
__exportStar(user, exports);
__exportStar(get_friends_list_1, exports);
__exportStar(get_user_info_1, exports);
__exportStar(get_user_info_v2_1, exports);
__exportStar(get_user_id_1, exports);

export default module.exports;
const __export_createUsersDomain = module.exports.createUsersDomain;
export { __export_createUsersDomain as createUsersDomain };
