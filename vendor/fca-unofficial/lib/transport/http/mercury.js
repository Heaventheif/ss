import * as session_1 from "../../session/session.js";
import * as facebook_1 from "./facebook.js";
import * as client_1 from "../../utils/client.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.changeReadStatusViaMercury = changeReadStatusViaMercury;
exports.markSeenViaMercury = markSeenViaMercury;
exports.markDeliveredViaMercury = markDeliveredViaMercury;
exports.markFolderAsReadViaMercury = markFolderAsReadViaMercury;
async function changeReadStatusViaMercury(params) {
    const { defaultFuncs, ctx, threadID, read } = params;
    const pageID = (0, session_1.getPageID)(ctx);
    if (!pageID) {
        throw new Error("pageID is required for Mercury read status updates");
    }
    const form = {
        source: "PagesManagerMessagesInterface",
        request_user_id: pageID,
        [`ids[${threadID}]`]: read,
        watermarkTimestamp: Date.now(),
        shouldSendReadReceipt: true,
        commerce_last_message_type: ""
    };
    return defaultFuncs
        .post("https://www.facebook.com/ajax/mercury/change_read_status.php", ctx.jar, form)
        .then((0, client_1.saveCookies)(ctx.jar))
        .then((0, client_1.parseAndCheckLogin)(ctx, defaultFuncs));
}
async function markSeenViaMercury(params) {
    const { defaultFuncs, ctx, seenTimestamp } = params;
    return (0, facebook_1.postWithSavedCookiesAndLoginCheck)({
        defaultFuncs,
        ctx,
        url: "https://www.facebook.com/ajax/mercury/mark_seen.php",
        form: {
            seen_timestamp: seenTimestamp
        }
    });
}
async function markDeliveredViaMercury(params) {
    const { defaultFuncs, ctx, threadID, messageID } = params;
    return (0, facebook_1.postWithSavedCookiesAndLoginCheck)({
        defaultFuncs,
        ctx,
        url: "https://www.facebook.com/ajax/mercury/delivery_receipts.php",
        form: {
            "message_ids[0]": messageID,
            [`thread_ids[${threadID}][0]`]: messageID
        }
    });
}
async function markFolderAsReadViaMercury(params) {
    const { defaultFuncs, ctx, folder = "inbox" } = params;
    return (0, facebook_1.postWithSavedCookiesAndLoginCheck)({
        defaultFuncs,
        ctx,
        url: "https://www.facebook.com/ajax/mercury/mark_folder_as_read.php",
        form: {
            folder
        }
    });
}

export default module.exports;
const __export_changeReadStatusViaMercury = module.exports.changeReadStatusViaMercury;
const __export_markSeenViaMercury = module.exports.markSeenViaMercury;
const __export_markDeliveredViaMercury = module.exports.markDeliveredViaMercury;
const __export_markFolderAsReadViaMercury = module.exports.markFolderAsReadViaMercury;
export { __export_changeReadStatusViaMercury as changeReadStatusViaMercury };
export { __export_markSeenViaMercury as markSeenViaMercury };
export { __export_markDeliveredViaMercury as markDeliveredViaMercury };
export { __export_markFolderAsReadViaMercury as markFolderAsReadViaMercury };
