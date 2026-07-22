import * as utils_1 from "./utils.js";

const module = { exports: {} };
const exports = module.exports;

function formatReadReceipt(event) {
    return {
        reader: event.reader.toString(),
        time: event.time,
        threadID: (0, utils_1.formatID)((event.thread_fbid || event.reader).toString()),
        type: "read_receipt"
    };
}
function formatRead(event) {
    return {
        threadID: (0, utils_1.formatID)(((event.chat_ids && event.chat_ids[0]) || (event.thread_fbids && event.thread_fbids[0])).toString()),
        time: event.timestamp,
        type: "read"
    };
}
function formatTyp(event) {
    return {
        isTyping: Boolean(event.st),
        from: event.from.toString(),
        threadID: (0, utils_1.formatID)((event.to || event.thread_fbid || event.from).toString()),
        fromMobile: Object.prototype.hasOwnProperty.call(event, "from_mobile") ? event.from_mobile : true,
        userID: (event.realtime_viewer_fbid || event.from).toString(),
        type: "typ"
    };
}
module.exports = {
    formatReadReceipt,
    formatRead,
    formatTyp
};

export default module.exports;
const __export_formatReadReceipt = module.exports.formatReadReceipt;
const __export_formatRead = module.exports.formatRead;
const __export_formatTyp = module.exports.formatTyp;
export { __export_formatReadReceipt as formatReadReceipt };
export { __export_formatRead as formatRead };
export { __export_formatTyp as formatTyp };
