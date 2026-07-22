import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = exports.client = exports.jar = void 0;
exports.setClientProxy = setClientProxy;
const tough_cookie_1 = require("tough-cookie");
const jar = new tough_cookie_1.CookieJar();
exports.jar = jar;
let currentProxyUrl = null;
function setClientProxy(proxyUrl) {
    currentProxyUrl = proxyUrl || null;
}
function getSetCookieHeaders(fetchResponse) {
    // fetch الحديث (Bun/Node 18+) يوفر headers.getSetCookie() لإرجاع كل
    // هيدرات Set-Cookie منفصلة (بخلاف headers.get اللي يدمجها بفاصلة وممكن
    // يكسر تحليلها).
    if (typeof fetchResponse.headers.getSetCookie === "function") {
        return fetchResponse.headers.getSetCookie();
    }
    const single = fetchResponse.headers.get("set-cookie");
    return single ? [single] : [];
}
async function applyCookiesFromResponse(fetchResponse, url, reqJar) {
    const cookies = getSetCookieHeaders(fetchResponse);
    for (const cookieStr of cookies) {
        try {
            await reqJar.setCookie(cookieStr, url);
        }
        catch {
            // نتجاهل كوكيز مرفوضة/مشوّهة بدل ما نكسر الطلب كامل
        }
    }
}
function headersToObject(fetchHeaders) {
    const out = {};
    fetchHeaders.forEach((value, key) => {
        out[key] = value;
    });
    return out;
}
async function parseResponseBody(fetchResponse, config) {
    const responseType = config && config.responseType;
    if (responseType === "arraybuffer") {
        return Buffer.from(await fetchResponse.arrayBuffer());
    }
    if (responseType === "stream") {
        // ReadableStream نمط الويب (متوفر بـ Bun/Node الحديث)
        return fetchResponse.body;
    }
    const text = await fetchResponse.text();
    const contentType = fetchResponse.headers.get("content-type") || "";
    if (contentType.includes("application/json") || responseType === "json") {
        try {
            return JSON.parse(text);
        }
        catch {
            return text;
        }
    }
    return text;
}
function buildUrlWithParams(url, params) {
    if (!params || typeof params !== "object")
        return url;
    const usp = new URLSearchParams();
    for (const key of Object.keys(params)) {
        const v = params[key];
        if (v === undefined || v === null)
            continue;
        usp.append(key, typeof v === "object" ? JSON.stringify(v) : String(v));
    }
    const qs = usp.toString();
    if (!qs)
        return url;
    return url + (url.includes("?") ? "&" : "?") + qs;
}
function normalizeNetworkError(err, config, targetUrl) {
    const e = new Error((err && err.message) || "Network Error");
    // نحاول نحافظ على شكل الكود قريب من أكواد axios/node لأجل retry.js
    if (err && err.name === "AbortError") {
        e.code = "ETIMEDOUT";
    }
    else if (err && err.code) {
        e.code = err.code;
    }
    else {
        e.code = "ERR_NETWORK";
    }
    e.config = { ...config, url: targetUrl };
    e.originalError = err;
    return e;
}
async function doRequest(method, url, dataOrConfig, maybeConfig) {
    const isBodyMethod = method === "post" || method === "put" || method === "patch";
    const data = isBodyMethod ? dataOrConfig : undefined;
    const config = (isBodyMethod ? maybeConfig : dataOrConfig) || {};
    const reqJar = config.jar || jar;
    const targetUrl = buildUrlWithParams(url, config.params);
    const headers = { ...(config.headers || {}) };
    try {
        const cookieString = await reqJar.getCookieString(targetUrl);
        if (cookieString) {
            headers["Cookie"] = cookieString;
        }
    }
    catch {
        // تجاهل فشل قراءة الكوكيز، الطلب يكمل بدونها
    }
    const fetchInit = {
        method: method.toUpperCase(),
        headers,
        redirect: "follow"
    };
    if (data !== undefined && data !== null) {
        fetchInit.body = data;
    }
    const proxyUrl = config.proxy === false ? undefined : (config.proxyUrl || currentProxyUrl || undefined);
    if (proxyUrl) {
        // خيار خاص بـ Bun's fetch؛ يُتجاهل بهدوء تحت أي runtime آخر ما يدعمه
        fetchInit.proxy = proxyUrl;
    }
    let controller;
    let timer;
    const timeout = config.timeout || 60000;
    if (timeout) {
        controller = new AbortController();
        fetchInit.signal = controller.signal;
        timer = setTimeout(() => controller.abort(), timeout);
    }
    let fetchResponse;
    try {
        fetchResponse = await fetch(targetUrl, fetchInit);
    }
    catch (err) {
        throw normalizeNetworkError(err, config, targetUrl);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
    await applyCookiesFromResponse(fetchResponse, targetUrl, reqJar);
    const body = await parseResponseBody(fetchResponse, config);
    return {
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        headers: headersToObject(fetchResponse.headers),
        data: body,
        config: { ...config, url: targetUrl, method },
        request: { res: { responseUrl: fetchResponse.url } },
        url: fetchResponse.url
    };
}
const client = {
    get: (url, config) => doRequest("get", url, config),
    post: (url, data, config) => doRequest("post", url, data, config),
    put: (url, data, config) => doRequest("put", url, data, config),
    patch: (url, data, config) => doRequest("patch", url, data, config),
    defaults: {
        httpAgent: undefined,
        httpsAgent: undefined,
        proxy: false
    }
};
exports.client = client;
const delay = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
exports.delay = delay;

export default module.exports;
const __export_delay = module.exports.delay;
const __export_client = module.exports.client;
const __export_jar = module.exports.jar;
const __export_setClientProxy = module.exports.setClientProxy;
export { __export_delay as delay };
export { __export_client as client };
export { __export_jar as jar };
export { __export_setClientProxy as setClientProxy };
