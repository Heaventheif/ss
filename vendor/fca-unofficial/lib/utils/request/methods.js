import * as headers_1 from "../headers.js";
import * as config_1 from "./config.js";
import * as client_1 from "./client.js";
import * as retry_1 from "./retry.js";
import * as helpers_1 from "./helpers.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanGet = cleanGet;
exports.get = get;
exports.post = post;
exports.postFormData = postFormData;
function isFormDataEntryObject(value) {
    return Boolean(value &&
        typeof value === "object" &&
        "value" in value &&
        "options" in value);
}
function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
}
async function toWebBlob(value, opts) {
    const contentType = opts && opts.contentType;
    if (typeof Blob !== "undefined" && value instanceof Blob) {
        if (contentType && value.type !== contentType) {
            return new Blob([await value.arrayBuffer()], { type: contentType });
        }
        return value;
    }
    if (Buffer.isBuffer(value)) {
        return contentType ? new Blob([value], { type: contentType }) : new Blob([value]);
    }
    if ((0, helpers_1.isStream)(value)) {
        const buf = await streamToBuffer(value);
        return contentType ? new Blob([buf], { type: contentType }) : new Blob([buf]);
    }
    if ((0, helpers_1.isBlobLike)(value)) {
        const buf = Buffer.from(await value.arrayBuffer());
        return new Blob([buf], { type: contentType || value.type || undefined });
    }
    return new Blob([String(value)], contentType ? { type: contentType } : undefined);
}
async function appendFileField(fd, key, value, opts) {
    const blob = await toWebBlob(value, opts);
    const filename = (opts && opts.filename) || value?.name || key;
    fd.append(key, blob, filename);
}
function cleanGet(url, ctx) {
    return (0, retry_1.requestWithRetry)(() => client_1.client.get(url, (0, config_1.cfg)()), 3, 1000, ctx);
}
function get(url, reqJar, qs, options, ctx, customHeader) {
    const headers = (0, headers_1.getHeaders)(url, options, ctx, customHeader);
    return (0, retry_1.requestWithRetry)(() => client_1.client.get(url, (0, config_1.cfg)({ reqJar, headers, params: qs })), 3, 1000, ctx);
}
function post(url, reqJar, form, options, ctx, customHeader) {
    const headers = (0, headers_1.getHeaders)(url, options, ctx, customHeader);
    const ct = String(headers["Content-Type"] || headers["content-type"] || "application/x-www-form-urlencoded").toLowerCase();
    let data;
    if (ct.includes("json")) {
        data = JSON.stringify(form || {});
        headers["Content-Type"] = "application/json";
    }
    else {
        const params = new URLSearchParams();
        if (form && typeof form === "object") {
            for (const k of Object.keys(form)) {
                let v = form[k];
                if ((0, helpers_1.isPairArrayList)(v)) {
                    for (const [kk, vv] of v) {
                        params.append(`${k}[${kk}]`, (0, helpers_1.toStringVal)(vv));
                    }
                    continue;
                }
                if (Array.isArray(v)) {
                    for (const x of v) {
                        if (Array.isArray(x) && x.length === 2 && typeof x[1] !== "object") {
                            params.append(k, (0, helpers_1.toStringVal)(x[1]));
                        }
                        else {
                            params.append(k, (0, helpers_1.toStringVal)(x));
                        }
                    }
                    continue;
                }
                if ((0, helpers_1.getType)(v) === "Object")
                    v = JSON.stringify(v);
                params.append(k, (0, helpers_1.toStringVal)(v));
            }
        }
        data = params.toString();
        headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
    return (0, retry_1.requestWithRetry)(() => client_1.client.post(url, data, (0, config_1.cfg)({ reqJar, headers })), 3, 1000, ctx);
}
async function postFormData(url, reqJar, form, qs, options, ctx) {
    const fd = new FormData();
    if (form && typeof form === "object") {
        for (const k of Object.keys(form)) {
            const v = form[k];
            if (v === undefined || v === null)
                continue;
            if ((0, helpers_1.isPairArrayList)(v)) {
                for (const [kk, vv] of v) {
                    fd.append(`${k}[${kk}]`, typeof vv === "object" && !Buffer.isBuffer(vv) && !(0, helpers_1.isStream)(vv) ? JSON.stringify(vv) : (0, helpers_1.toStringVal)(vv));
                }
                continue;
            }
            if (Array.isArray(v)) {
                for (const x of v) {
                    if (Array.isArray(x) &&
                        x.length === 2 &&
                        x[1] &&
                        typeof x[1] === "object" &&
                        !Buffer.isBuffer(x[1]) &&
                        !(0, helpers_1.isStream)(x[1])) {
                        await appendFileField(fd, k, x[0], x[1]);
                    }
                    else if (Array.isArray(x) && x.length === 2 && typeof x[1] !== "object") {
                        fd.append(k, (0, helpers_1.toStringVal)(x[1]));
                    }
                    else if (isFormDataEntryObject(x)) {
                        await appendFileField(fd, k, x.value, x.options || {});
                    }
                    else if ((0, helpers_1.isStream)(x) || Buffer.isBuffer(x)) {
                        await appendFileField(fd, k, x, {});
                    }
                    else if (typeof x === "string") {
                        fd.append(k, x);
                    }
                    else if ((0, helpers_1.isBlobLike)(x)) {
                        await appendFileField(fd, k, x, { filename: x.name, contentType: x.type });
                    }
                    else {
                        fd.append(k, JSON.stringify(x));
                    }
                }
                continue;
            }
            if (isFormDataEntryObject(v)) {
                await appendFileField(fd, k, v.value, v.options || {});
                continue;
            }
            if ((0, helpers_1.isStream)(v) || Buffer.isBuffer(v)) {
                await appendFileField(fd, k, v, {});
                continue;
            }
            if (typeof v === "string") {
                fd.append(k, v);
                continue;
            }
            if ((0, helpers_1.isBlobLike)(v)) {
                await appendFileField(fd, k, v, { filename: v.name, contentType: v.type });
                continue;
            }
            if (typeof v === "number" || typeof v === "boolean") {
                fd.append(k, (0, helpers_1.toStringVal)(v));
                continue;
            }
            fd.append(k, JSON.stringify(v));
        }
    }
    // FormData الأصلية تضبط هيدر Content-Type (متضمّن الـ boundary) تلقائيًا
    // بمجرد ما نمررها كـ body لـ fetch — عكس form-data القديمة اللي كانت
    // تحتاج fd.getHeaders() يدويًا.
    const headers = (0, headers_1.getHeaders)(url, options, ctx);
    delete headers["Content-Type"];
    delete headers["content-type"];
    return (0, retry_1.requestWithRetry)(() => client_1.client.post(url, fd, (0, config_1.cfg)({ reqJar, headers, params: qs })), 3, 1000, ctx);
}

export default module.exports;
const __export_cleanGet = module.exports.cleanGet;
const __export_get = module.exports.get;
const __export_post = module.exports.post;
const __export_postFormData = module.exports.postFormData;
export { __export_cleanGet as cleanGet };
export { __export_get as get };
export { __export_post as post };
export { __export_postFormData as postFormData };
