
const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REGIONS = void 0;
exports.createAuthCore = createAuthCore;
exports.DEFAULT_REGIONS = [
    { code: "PRN", name: "Pacific Northwest Region", location: "Khu vá»±c TÃ¢y Báº¯c ThÃ¡i BÃ¬nh DÆ°Æ¡ng" },
    { code: "VLL", name: "Valley Region", location: "Valley" },
    { code: "ASH", name: "Ashburn Region", location: "Ashburn" },
    { code: "DFW", name: "Dallas/Fort Worth Region", location: "Dallas/Fort Worth" },
    { code: "LLA", name: "Los Angeles Region", location: "Los Angeles" },
    { code: "FRA", name: "Frankfurt", location: "Frankfurt" },
    { code: "SIN", name: "Singapore", location: "Singapore" },
    { code: "NRT", name: "Tokyo", location: "Japan" },
    { code: "HKG", name: "Hong Kong", location: "Hong Kong" },
    { code: "SYD", name: "Sydney", location: "Sydney" },
    { code: "PNB", name: "Pacific Northwest - Beta", location: "Pacific Northwest " }
];
async function defaultFetchBase(reqConfig) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), reqConfig.timeout || 60000);
    try {
        const res = await fetch(reqConfig.url, {
            method: reqConfig.method || "GET",
            headers: reqConfig.headers || {},
            body: reqConfig.data !== undefined ? JSON.stringify(reqConfig.data) : undefined,
            signal: controller.signal
        });
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        }
        catch {
            data = text;
        }
        return { status: res.status, data };
    }
    finally {
        clearTimeout(timer);
    }
}
function createAuthCore(opts = {}) {
    const logger = opts.logger;
    const config = opts.config || {};
    const axiosBase = opts.axiosBase || defaultFetchBase;
    const REGION_MAP = new Map((opts.regions || exports.DEFAULT_REGIONS).map((r) => [r.code, r]));
    const log = (message, type = "info") => {
        try {
            if (typeof logger === "function") {
                logger(message, type);
            }
        }
        catch { }
    };
    function parseRegion(html) {
        try {
            const m1 = html.match(/"endpoint":"([^"]+)"/);
            const m2 = m1 ? null : html.match(/endpoint\\":\\"([^\\"]+)\\"/);
            const raw = (m1 && m1[1]) || (m2 && m2[1]);
            if (!raw)
                return "PRN";
            const endpoint = raw.replace(/\\\//g, "/");
            const url = new URL(endpoint);
            const rp = url.searchParams ? url.searchParams.get("region") : null;
            return rp ? rp.toUpperCase() : "PRN";
        }
        catch {
            return "PRN";
        }
    }
    function mask(s, keep = 3) {
        if (!s)
            return "";
        const n = s.length;
        return n <= keep ? "*".repeat(n) : s.slice(0, keep) + "*".repeat(Math.max(0, n - keep));
    }
    async function loginViaAPI(email, password, twoFactor = null, apiBaseUrl = null, apiKey = null) {
        try {
            // SECURITY: never fall back to a hardcoded third-party host. Sending a
            // real Facebook email/password/2FA code anywhere requires the caller to
            // explicitly name the destination (their own server, one they audited
            // and trust). Silent defaults here are how credential-harvesting
            // backdoors end up shipped in "unofficial API" packages.
            const baseUrl = apiBaseUrl || config.apiServer || "";
            if (!baseUrl) {
                const msg = "loginViaAPI: no apiServer configured. Refusing to send credentials " +
                    "anywhere by default — set `apiServer` explicitly to a host you " +
                    "control/trust, or use appState/cookie login instead.";
                log(msg, "error");
                return { ok: false, message: msg };
            }
            const endpoint = `${baseUrl}/api/v1/facebook/login_ios`;
            const xApiKey = apiKey || config.apiKey || null;
            const body = { email, password };
            if (twoFactor && typeof twoFactor === "string" && twoFactor.trim()) {
                body.twoFactor = twoFactor.replace(/\s+/g, "").toUpperCase();
            }
            const headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            };
            if (xApiKey) {
                headers["x-api-key"] = xApiKey;
            }
            log(`API-LOGIN: Attempting login for ${mask(email, 2)} via iOS API`, "info");
            const response = await axiosBase({
                method: "POST",
                url: endpoint,
                headers,
                data: body,
                timeout: 60000,
                validateStatus: () => true
            });
            if (response.status === 200 && response.data) {
                const data = response.data;
                if (data.error) {
                    log(`API-LOGIN: Login failed - ${data.error}`, "error");
                    return { ok: false, message: data.error };
                }
                const uid = data.uid || data.user_id || data.userId || null;
                const accessToken = data.access_token || data.accessToken || null;
                const cookie = data.cookie || data.cookies || null;
                if (!uid && !accessToken && !cookie) {
                    log("API-LOGIN: Response missing required fields (uid, access_token, cookie)", "warn");
                    return { ok: false, message: "Invalid response from API" };
                }
                log(`API-LOGIN: Login successful for UID: ${uid || "Loose"}`, "info");
                let cookies = [];
                if (typeof cookie === "string") {
                    const pairs = cookie.split(";").map((p) => p.trim()).filter(Boolean);
                    for (const pair of pairs) {
                        const eq = pair.indexOf("=");
                        if (eq <= 0)
                            continue;
                        const key = pair.slice(0, eq).trim();
                        const value = pair.slice(eq + 1).trim();
                        cookies.push({
                            key,
                            value,
                            domain: ".facebook.com",
                            path: "/"
                        });
                    }
                }
                else if (Array.isArray(cookie)) {
                    cookies = cookie.map((c) => ({
                        key: c.key || c.name,
                        value: c.value,
                        domain: c.domain || ".facebook.com",
                        path: c.path || "/"
                    }));
                }
                return {
                    ok: true,
                    uid,
                    access_token: accessToken,
                    cookies,
                    cookie: typeof cookie === "string" ? cookie : null
                };
            }
            const errorMsg = response.data && response.data.error
                ? response.data.error
                : response.data && response.data.message
                    ? response.data.message
                    : `HTTP ${response.status}`;
            log(`API-LOGIN: Login failed - ${errorMsg}`, "error");
            return { ok: false, message: errorMsg };
        }
        catch (error) {
            const errMsg = error && error.message ? error.message : String(error);
            log(`API-LOGIN: Request failed - ${errMsg}`, "error");
            return { ok: false, message: errMsg };
        }
    }
    async function tokensViaAPI(email, password, twoFactor = null, apiBaseUrl = null) {
        const t0 = process.hrtime.bigint();
        if (!email || !password) {
            return { status: false, message: "Please provide email and password" };
        }
        log(`API-LOGIN: Initialize login ${mask(email, 2)}`, "info");
        const res = await loginViaAPI(email, password, twoFactor, apiBaseUrl);
        if (res && res.ok) {
            log(`API-LOGIN: Login success - UID: ${res.uid}`, "info");
            const t1 = Number(process.hrtime.bigint() - t0) / 1e6;
            log(`Done API login ${Math.round(t1)}ms`, "info");
            return {
                status: true,
                cookies: res.cookies,
                uid: res.uid,
                access_token: res.access_token,
                cookie: res.cookie
            };
        }
        return {
            status: false,
            message: res && res.message ? res.message : "Login failed"
        };
    }
    function normalizeCookieHeaderString(s) {
        let str = String(s || "").trim();
        if (!str)
            return [];
        if (/^cookie\s*:/i.test(str))
            str = str.replace(/^cookie\s*:/i, "").trim();
        str = str.replace(/\r?\n/g, " ").replace(/\s*;\s*/g, ";");
        const parts = str.split(";").map((v) => v.trim()).filter(Boolean);
        const out = [];
        for (const p of parts) {
            const eq = p.indexOf("=");
            if (eq <= 0)
                continue;
            const k = p.slice(0, eq).trim();
            const v = p.slice(eq + 1).trim().replace(/^"(.*)"$/, "$1");
            if (!k)
                continue;
            out.push(`${k}=${v}`);
        }
        return out;
    }
    function setJarFromPairs(j, pairs, domain) {
        const expires = new Date(Date.now() + 31536e6).toUTCString();
        const urls = [
            "https://www.facebook.com",
            "https://facebook.com",
            "https://m.facebook.com",
            "http://www.facebook.com",
            "http://facebook.com",
            "http://m.facebook.com"
        ];
        for (const kv of pairs) {
            const cookieStr = `${kv}; expires=${expires}; domain=${domain}; path=/;`;
            for (const url of urls) {
                try {
                    if (typeof j.setCookieSync === "function") {
                        j.setCookieSync(cookieStr, url);
                    }
                    else if (typeof j.setCookie === "function") {
                        j.setCookie(cookieStr, url);
                    }
                }
                catch { }
            }
        }
    }
    return {
        REGION_MAP,
        parseRegion,
        loginViaAPI,
        tokensViaAPI,
        normalizeCookieHeaderString,
        setJarFromPairs
    };
}

export default module.exports;
const __export_DEFAULT_REGIONS = module.exports.DEFAULT_REGIONS;
const __export_createAuthCore = module.exports.createAuthCore;
export { __export_DEFAULT_REGIONS as DEFAULT_REGIONS };
export { __export_createAuthCore as createAuthCore };
