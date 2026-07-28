import format from "../format/index.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getType = void 0;
exports.toStringVal = toStringVal;
exports.isStream = isStream;
exports.isBlobLike = isBlobLike;
exports.isPairArrayList = isPairArrayList;
const format_1 = __importDefault(format);
const formatNs = format_1.default;
const getType = typeof formatNs === "function"
    ? formatNs
    : formatNs.getType || ((value) => Object.prototype.toString.call(value).slice(8, -1));
exports.getType = getType;
function toStringVal(v) {
    if (v === undefined || v === null)
        return "";
    if (typeof v === "bigint")
        return v.toString();
    if (typeof v === "boolean")
        return v ? "true" : "false";
    return String(v);
}
function isStream(v) {
    return Boolean(v &&
        typeof v === "object" &&
        typeof v.pipe === "function" &&
        typeof v.on === "function");
}
function isBlobLike(v) {
    return Boolean(v &&
        typeof v === "object" &&
        typeof v.arrayBuffer === "function" &&
        (typeof v.type === "string" || typeof v.name === "string"));
}
function isPairArrayList(arr) {
    return (Array.isArray(arr) &&
        arr.length > 0 &&
        arr.every((x) => Array.isArray(x) && x.length === 2 && typeof x[0] === "string"));
}

export default module.exports;
const __export_getType = module.exports.getType;
const __export_toStringVal = module.exports.toStringVal;
const __export_isStream = module.exports.isStream;
const __export_isBlobLike = module.exports.isBlobLike;
const __export_isPairArrayList = module.exports.isPairArrayList;
export { __export_getType as getType };
export { __export_toStringVal as toStringVal };
export { __export_isStream as isStream };
export { __export_isBlobLike as isBlobLike };
export { __export_isPairArrayList as isPairArrayList };
