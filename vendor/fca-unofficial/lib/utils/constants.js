import stream from "stream";
import format from "./format/index.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFrom = getFrom;
exports.isReadableStream = isReadableStream;
const stream_1 = __importDefault(stream);
const format_1 = __importDefault(format);
const formatMod = format_1.default;
const getType = typeof formatMod === "function"
    ? formatMod
    : formatMod.getType || ((value) => Object.prototype.toString.call(value).slice(8, -1));
function getFrom(html, startToken, endToken) {
    const i = html.indexOf(startToken);
    if (i < 0)
        return undefined;
    const start = i + startToken.length;
    const j = html.indexOf(endToken, start);
    return j < 0 ? undefined : html.slice(start, j);
}
function isReadableStream(obj) {
    const maybe = obj;
    return Boolean(obj instanceof stream_1.default.Stream &&
        (getType(maybe._read) === "Function" || getType(maybe._read) === "AsyncFunction") &&
        getType(maybe._readableState) === "Object");
}

export default module.exports;
const __export_getFrom = module.exports.getFrom;
const __export_isReadableStream = module.exports.isReadableStream;
export { __export_getFrom as getFrom };
export { __export_isReadableStream as isReadableStream };
