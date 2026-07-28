
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.getHeaders = getHeaders;
function sanitizeHeaderValue(value) {
    if (value === null || value === undefined) return "";
    let str = String(value);
    if (str.trim().startsWith("[") && str.trim().endsWith("]")) {
        try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed)) {
                return "";
            }
        } catch { /* keep fallthrough */ }
    }
    str = str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F\r\n\[\]]/g, "").trim();
    return str;
}
function sanitizeHeaderName(name) {
    if (!name || typeof name !== "string") return "";
    return name.replace(/[^\x21-\x7E]/g, "").trim();
}
function getHeaders(url, options, ctx, customHeader) {
    const u = new URL(url);
    // ========== تدوير User-Agent تلقائياً ==========
    let ua = options?.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
    if (ctx?.antiDetection?.enabled && Array.isArray(ctx.antiDetection.userAgentPool) && ctx.antiDetection.userAgentPool.length > 0) {
        const pool = ctx.antiDetection.userAgentPool;
        ua = pool[Math.floor(Math.random() * pool.length)];
    }
    // ==============================================
    const referer = options?.referer || "https://www.facebook.com/";
    const origin = referer.replace(/\/+$/, "");
    const contentType = options?.contentType || "application/x-www-form-urlencoded";
    const acceptLang = options?.acceptLanguage || "ar-SA,ar;q=0.9,de-DE;q=0.8,de;q=0.7,en-US;q=0.6,en;q=0.5";
    const headers = {
        Host: sanitizeHeaderValue(u.host),
        Origin: sanitizeHeaderValue(origin),
        Referer: sanitizeHeaderValue(referer),
        "User-Agent": sanitizeHeaderValue(ua),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
        "Accept-Language": sanitizeHeaderValue(acceptLang),
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": sanitizeHeaderValue(contentType),
        Connection: "keep-alive",
        DNT: "1",
        "Upgrade-Insecure-Requests": "1",
        "sec-ch-ua": "\"Chromium\";v=\"139\", \"Not;A=Brand\";v=\"24\", \"Google Chrome\";v=\"139\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-ch-ua-arch": "\"x86\"",
        "sec-ch-ua-bitness": "\"64\"",
        "sec-ch-ua-full-version-list": "\"Chromium\";v=\"139.0.0.0\", \"Not;A=Brand\";v=\"24.0.0.0\", \"Google Chrome\";v=\"139.0.0.0\"",
        "sec-ch-ua-platform-version": "\"15.0.0\"",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
        "X-Requested-With": "XMLHttpRequest",
        Pragma: "no-cache",
        "Cache-Control": "no-cache"
    };
    if (ctx?.region) {
        const regionValue = sanitizeHeaderValue(ctx.region);
        if (regionValue) headers["X-MSGR-Region"] = regionValue;
    }
    if (customHeader && typeof customHeader === "object") {
        for (const [key, value] of Object.entries(customHeader)) {
            if (value === null || value === undefined || typeof value === "function") continue;
            if (typeof value === "object" && !Array.isArray(value)) continue;
            if (Array.isArray(value)) continue;
            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                const sanitizedKey = sanitizeHeaderName(key);
                const sanitizedValue = sanitizeHeaderValue(value);
                if (sanitizedKey && sanitizedValue !== "") {
                    headers[sanitizedKey] = sanitizedValue;
                }
            }
        }
    }
    const sanitizedHeaders = {};
    for (const [key, value] of Object.entries(headers)) {
        const sanitizedKey = sanitizeHeaderName(key);
        const sanitizedValue = sanitizeHeaderValue(value);
        if (sanitizedKey && sanitizedValue !== "") {
            sanitizedHeaders[sanitizedKey] = sanitizedValue;
        }
    }
    return sanitizedHeaders;
}

export default module.exports;
const __export_getHeaders = module.exports.getHeaders;
export { __export_getHeaders as getHeaders };
