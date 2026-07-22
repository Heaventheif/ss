import * as client_1 from "./client.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.requestWithRetry = requestWithRetry;
async function requestWithRetry(fn, retries = 3, baseDelay = 1000, ctx) {
    let lastError;
    const emit = (event, payload) => {
        try {
            if (ctx && ctx._emitter && typeof ctx._emitter.emit === "function") {
                ctx._emitter.emit(event, payload);
            }
        } catch { /* ignore */ }
    };
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (rawError) {
            const e = rawError;
            lastError = e;
            if (e?.code === "ERR_INVALID_CHAR" || (e?.message && e.message.includes("Invalid character in header"))) {
                const err = new Error("Invalid header content detected. Request aborted to prevent crash.");
                err.error = "Invalid header content";
                err.originalError = e;
                err.code = "ERR_INVALID_CHAR";
                return Promise.reject(err);
            }
            const status = e?.response?.status || e?.statusCode || 0;
            const url = e?.config?.url || "";
            const method = String(e?.config?.method || "").toUpperCase();
            if (status === 429) {
                emit("rateLimit", { status, url, method });
            }
            if (status >= 400 && status < 500 && status !== 429) {
                return e.response || Promise.reject(e);
            }
            if (i === retries - 1) {
                return e.response || Promise.reject(e);
            }
            const netCode = e?.code || "";
            const msg = e && e.message ? e.message : String(e || "");
            if (!status && (netCode === "UND_ERR_CONNECT_TIMEOUT" ||
                netCode === "ETIMEDOUT" || netCode === "ECONNRESET" ||
                netCode === "ECONNREFUSED" || netCode === "ENOTFOUND" ||
                /timeout|connect timeout|network error|fetch failed/i.test(msg))) {
                emit("networkError", { code: netCode, message: msg, url, method });
            }
            // ========== إضافة جيتر عشوائي أكبر ==========
            const jitter = Math.floor(Math.random() * 500);
            const backoffDelay = Math.min(baseDelay * Math.pow(2, i) + jitter, 30000);
            // ==========================================
            await (0, client_1.delay)(backoffDelay);
        }
    }
    const finalError = lastError || new Error("Request failed after retries");
    return Promise.reject(finalError);
}

export default module.exports;
const __export_requestWithRetry = module.exports.requestWithRetry;
export { __export_requestWithRetry as requestWithRetry };
