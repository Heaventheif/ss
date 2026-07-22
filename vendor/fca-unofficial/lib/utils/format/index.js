import attachment from "./attachment.js";
import cookie from "./cookie.js";
import date from "./date.js";
import decode from "./decode.js";
import delta from "./delta.js";
import ids from "./ids.js";
import message from "./message.js";
import presence from "./presence.js";
import readTyp from "./readTyp.js";
import thread from "./thread.js";
import * as utils$0 from "./utils.js";

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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const attachment_1 = __importDefault(attachment);
const cookie_1 = __importDefault(cookie);
const date_1 = __importDefault(date);
const decode_1 = __importDefault(decode);
const delta_1 = __importDefault(delta);
const ids_1 = __importDefault(ids);
const message_1 = __importDefault(message);
const presence_1 = __importDefault(presence);
const readTyp_1 = __importDefault(readTyp);
const thread_1 = __importDefault(thread);
const utils = __importStar(utils$0);
module.exports = {
    getType: utils.getType,
    formatID: utils.formatID,
    padZeros: utils.padZeros,
    arrayToObject: utils.arrayToObject,
    arrToForm: utils.arrToForm,
    getData_Path: utils.getData_Path,
    setData_Path: utils.setData_Path,
    getPaths: utils.getPaths,
    cleanHTML: utils.cleanHTML,
    getCurrentTimestamp: utils.getCurrentTimestamp,
    getSignatureID: utils.getSignatureID,
    generateOfflineThreadingID: ids_1.default.generateOfflineThreadingID,
    generateThreadingID: ids_1.default.generateThreadingID,
    getGUID: ids_1.default.getGUID,
    generateTimestampRelative: ids_1.default.generateTimestampRelative,
    formatDate: date_1.default.formatDate,
    presenceEncode: presence_1.default.presenceEncode,
    presenceDecode: presence_1.default.presenceDecode,
    generatePresence: presence_1.default.generatePresence,
    generateAccessiblityCookie: presence_1.default.generateAccessiblityCookie,
    formatProxyPresence: presence_1.default.formatProxyPresence,
    formatPresence: presence_1.default.formatPresence,
    _formatAttachment: attachment_1.default._formatAttachment,
    formatAttachment: attachment_1.default.formatAttachment,
    getAdminTextMessageType: delta_1.default.getAdminTextMessageType,
    formatDeltaEvent: delta_1.default.formatDeltaEvent,
    formatDeltaMessage: delta_1.default.formatDeltaMessage,
    getMentionsFromDeltaMessage: delta_1.default.getMentionsFromDeltaMessage,
    formatDeltaReadReceipt: delta_1.default.formatDeltaReadReceipt,
    formatMessage: message_1.default.formatMessage,
    formatEvent: message_1.default.formatEvent,
    formatHistoryMessage: message_1.default.formatHistoryMessage,
    formatReadReceipt: readTyp_1.default.formatReadReceipt,
    formatRead: readTyp_1.default.formatRead,
    formatTyp: readTyp_1.default.formatTyp,
    formatThread: thread_1.default.formatThread,
    decodeClientPayload: decode_1.default.decodeClientPayload,
    formatCookie: cookie_1.default.formatCookie
};

export default module.exports;
const __export_getType = module.exports.getType;
const __export_formatID = module.exports.formatID;
const __export_padZeros = module.exports.padZeros;
const __export_arrayToObject = module.exports.arrayToObject;
const __export_arrToForm = module.exports.arrToForm;
const __export_getData_Path = module.exports.getData_Path;
const __export_setData_Path = module.exports.setData_Path;
const __export_getPaths = module.exports.getPaths;
const __export_cleanHTML = module.exports.cleanHTML;
const __export_getCurrentTimestamp = module.exports.getCurrentTimestamp;
const __export_getSignatureID = module.exports.getSignatureID;
const __export_generateOfflineThreadingID = module.exports.generateOfflineThreadingID;
const __export_generateThreadingID = module.exports.generateThreadingID;
const __export_getGUID = module.exports.getGUID;
const __export_generateTimestampRelative = module.exports.generateTimestampRelative;
const __export_formatDate = module.exports.formatDate;
const __export_presenceEncode = module.exports.presenceEncode;
const __export_presenceDecode = module.exports.presenceDecode;
const __export_generatePresence = module.exports.generatePresence;
const __export_generateAccessiblityCookie = module.exports.generateAccessiblityCookie;
const __export_formatProxyPresence = module.exports.formatProxyPresence;
const __export_formatPresence = module.exports.formatPresence;
const __export__formatAttachment = module.exports._formatAttachment;
const __export_formatAttachment = module.exports.formatAttachment;
const __export_getAdminTextMessageType = module.exports.getAdminTextMessageType;
const __export_formatDeltaEvent = module.exports.formatDeltaEvent;
const __export_formatDeltaMessage = module.exports.formatDeltaMessage;
const __export_getMentionsFromDeltaMessage = module.exports.getMentionsFromDeltaMessage;
const __export_formatDeltaReadReceipt = module.exports.formatDeltaReadReceipt;
const __export_formatMessage = module.exports.formatMessage;
const __export_formatEvent = module.exports.formatEvent;
const __export_formatHistoryMessage = module.exports.formatHistoryMessage;
const __export_formatReadReceipt = module.exports.formatReadReceipt;
const __export_formatRead = module.exports.formatRead;
const __export_formatTyp = module.exports.formatTyp;
const __export_formatThread = module.exports.formatThread;
const __export_decodeClientPayload = module.exports.decodeClientPayload;
const __export_formatCookie = module.exports.formatCookie;
export { __export_getType as getType };
export { __export_formatID as formatID };
export { __export_padZeros as padZeros };
export { __export_arrayToObject as arrayToObject };
export { __export_arrToForm as arrToForm };
export { __export_getData_Path as getData_Path };
export { __export_setData_Path as setData_Path };
export { __export_getPaths as getPaths };
export { __export_cleanHTML as cleanHTML };
export { __export_getCurrentTimestamp as getCurrentTimestamp };
export { __export_getSignatureID as getSignatureID };
export { __export_generateOfflineThreadingID as generateOfflineThreadingID };
export { __export_generateThreadingID as generateThreadingID };
export { __export_getGUID as getGUID };
export { __export_generateTimestampRelative as generateTimestampRelative };
export { __export_formatDate as formatDate };
export { __export_presenceEncode as presenceEncode };
export { __export_presenceDecode as presenceDecode };
export { __export_generatePresence as generatePresence };
export { __export_generateAccessiblityCookie as generateAccessiblityCookie };
export { __export_formatProxyPresence as formatProxyPresence };
export { __export_formatPresence as formatPresence };
export { __export__formatAttachment as _formatAttachment };
export { __export_formatAttachment as formatAttachment };
export { __export_getAdminTextMessageType as getAdminTextMessageType };
export { __export_formatDeltaEvent as formatDeltaEvent };
export { __export_formatDeltaMessage as formatDeltaMessage };
export { __export_getMentionsFromDeltaMessage as getMentionsFromDeltaMessage };
export { __export_formatDeltaReadReceipt as formatDeltaReadReceipt };
export { __export_formatMessage as formatMessage };
export { __export_formatEvent as formatEvent };
export { __export_formatHistoryMessage as formatHistoryMessage };
export { __export_formatReadReceipt as formatReadReceipt };
export { __export_formatRead as formatRead };
export { __export_formatTyp as formatTyp };
export { __export_formatThread as formatThread };
export { __export_decodeClientPayload as decodeClientPayload };
export { __export_formatCookie as formatCookie };
