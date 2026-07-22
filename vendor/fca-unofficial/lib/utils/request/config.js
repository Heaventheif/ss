import * as client_1 from "./client.js";
import * as sanitize_1 from "./sanitize.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.cfg = cfg;
function cfg(base = {}) {
    const { reqJar, headers, params, timeout, responseType, proxy } = base;
    return {
        headers: (0, sanitize_1.sanitizeHeaders)(headers),
        params: params ?? undefined,
        jar: reqJar || client_1.jar,
        timeout: timeout || 60000,
        responseType: responseType || undefined,
        // proxy: false يعطّل البروكسي المضبوط globally لهالطلب بعينه (نفس سلوك axios القديم)
        proxy: proxy === false ? false : undefined
    };
}

export default module.exports;
const __export_cfg = module.exports.cfg;
export { __export_cfg as cfg };
