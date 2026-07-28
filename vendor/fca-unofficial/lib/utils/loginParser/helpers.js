
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = void 0;
exports.createEmit = createEmit;
exports.headerOf = headerOf;
exports.buildUrl = buildUrl;
exports.formatCookie = formatCookie;
const delay = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
exports.delay = delay;
function createEmit(ctx) {
    return (event, payload) => {
        try {
            if (ctx && ctx._emitter && typeof ctx._emitter.emit === "function") {
                ctx._emitter.emit(event, payload);
            }
        }
        catch {
            // ignore emitter errors
        }
    };
}
function headerOf(headers, name) {
    if (!headers)
        return undefined;
    const k = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
    return k ? headers[k] : undefined;
}
function buildUrl(cfg) {
    try {
        return cfg?.baseURL ? new URL(cfg.url || "/", cfg.baseURL).toString() : cfg?.url || "";
    }
    catch {
        return cfg?.url || "";
    }
}
function formatCookie(arr, service) {
    const n = String(arr?.[0] || "");
    const v = String(arr?.[1] || "");
    return `${n}=${v}; Domain=.${service}.com; Path=/; Secure`;
}

export default module.exports;
const __export_delay = module.exports.delay;
const __export_createEmit = module.exports.createEmit;
const __export_headerOf = module.exports.headerOf;
const __export_buildUrl = module.exports.buildUrl;
const __export_formatCookie = module.exports.formatCookie;
export { __export_delay as delay };
export { __export_createEmit as createEmit };
export { __export_headerOf as headerOf };
export { __export_buildUrl as buildUrl };
export { __export_formatCookie as formatCookie };
