import * as send_message_1 from "./commands/send-message.js";
import * as mark_read_1 from "./commands/mark-read.js";
import * as send_typing_indicator_1 from "./commands/send-typing-indicator.js";
import * as mark_seen_1 from "./commands/mark-seen.js";
import * as mark_delivered_1 from "./commands/mark-delivered.js";
import * as mark_read_all_1 from "./commands/mark-read-all.js";
import * as set_message_reaction_1 from "./commands/set-message-reaction.js";
import * as share_contact_1 from "./commands/share-contact.js";
import * as edit_message_1 from "./commands/edit-message.js";
import * as delete_message_1 from "./commands/delete-message.js";
import * as unsend_message_1 from "./commands/unsend-message.js";
import * as forward_attachment_1 from "./commands/forward-attachment.js";
import * as upload_attachment_1 from "./commands/upload-attachment.js";
import * as change_thread_color_1 from "./commands/change-thread-color.js";
import * as change_thread_emoji_1 from "./commands/change-thread-emoji.js";
import * as get_emoji_url_1 from "./queries/get-emoji-url.js";
import * as get_thread_colors_1 from "./queries/get-thread-colors.js";
import * as resolve_photo_url_1 from "./queries/resolve-photo-url.js";
import * as get_message_1 from "./queries/get-message.js";
import message from "./message.types.js";

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
exports.createMessagesDomain = createMessagesDomain;
function compactNamespace(namespace) {
    return Object.fromEntries(Object.entries(namespace).filter(([, value]) => value !== undefined));
}
function createMessagesDomain(deps) {
    return compactNamespace({
        send: (0, send_message_1.createSendMessageCommand)(deps.send),
        markRead: (0, mark_read_1.createMarkReadCommand)(deps.markRead),
        typing: (0, send_typing_indicator_1.createSendTypingIndicatorCommand)(deps.typing),
        markSeen: deps.markSeen ? (0, mark_seen_1.createMarkSeenCommand)(deps.markSeen) : undefined,
        markDelivered: deps.markDelivered ? (0, mark_delivered_1.createMarkDeliveredCommand)(deps.markDelivered) : undefined,
        markReadAll: deps.markReadAll ? (0, mark_read_all_1.createMarkReadAllCommand)(deps.markReadAll) : undefined,
        react: (0, set_message_reaction_1.createSetMessageReactionCommand)(deps.reaction),
        uploadAttachment: deps.uploadAttachment
            ? (0, upload_attachment_1.createUploadAttachmentCommand)(deps.uploadAttachment)
            : undefined,
        edit: deps.edit ? (0, edit_message_1.createEditMessageCommand)(deps.edit) : undefined,
        delete: deps.delete ? (0, delete_message_1.createDeleteMessageCommand)(deps.delete) : undefined,
        unsend: deps.unsend ? (0, unsend_message_1.createUnsendMessageCommand)(deps.unsend) : undefined,
        forwardAttachment: deps.forwardAttachment
            ? (0, forward_attachment_1.createForwardAttachmentCommand)(deps.forwardAttachment)
            : undefined,
        shareContact: deps.shareContact ? (0, share_contact_1.createShareContactCommand)(deps.shareContact) : undefined,
        setThreadColor: (0, change_thread_color_1.createChangeThreadColorCommand)(deps.threadColor),
        setThreadEmoji: (0, change_thread_emoji_1.createChangeThreadEmojiCommand)(deps.threadEmoji),
        get: deps.get ? (0, get_message_1.createGetMessageQuery)(deps.get) : undefined,
        getEmojiUrl: (0, get_emoji_url_1.createGetEmojiUrlQuery)(),
        getThreadColors: (0, get_thread_colors_1.createGetThreadColorsQuery)(),
        resolvePhotoUrl: deps.photoUrl ? (0, resolve_photo_url_1.createResolvePhotoUrlQuery)(deps.photoUrl) : undefined
    });
}
__exportStar(message, exports);
__exportStar(send_message_1, exports);
__exportStar(mark_read_1, exports);
__exportStar(send_typing_indicator_1, exports);
__exportStar(mark_seen_1, exports);
__exportStar(mark_delivered_1, exports);
__exportStar(mark_read_all_1, exports);
__exportStar(set_message_reaction_1, exports);
__exportStar(upload_attachment_1, exports);
__exportStar(edit_message_1, exports);
__exportStar(delete_message_1, exports);
__exportStar(unsend_message_1, exports);
__exportStar(forward_attachment_1, exports);
__exportStar(share_contact_1, exports);
__exportStar(change_thread_color_1, exports);
__exportStar(change_thread_emoji_1, exports);
__exportStar(get_message_1, exports);
__exportStar(get_emoji_url_1, exports);
__exportStar(get_thread_colors_1, exports);
__exportStar(resolve_photo_url_1, exports);

export default module.exports;
const __export_createMessagesDomain = module.exports.createMessagesDomain;
export { __export_createMessagesDomain as createMessagesDomain };
