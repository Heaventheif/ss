import { createRequire } from "node:module";
import nodefs from "node:fs";
import nodepath from "node:path";
import nodestream from "node:stream";
import node_stream_consumers_1 from "node:stream/consumers";
import node_url_1 from "node:url";
import * as client_1 from "../../utils/request/client.js";

const require = createRequire(import.meta.url);
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createAttachmentUploadTransport = createAttachmentUploadTransport;
const node_fs_1 = { default: nodefs };
const node_path_1 = { default: nodepath };
const node_stream_1 = { default: nodestream };
const tough_cookie_1 = require("tough-cookie");
const TOKEN_CACHE_TTL = 5 * 60 * 1000;
const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function cleanJsonResponse(value) {
    if (typeof value !== "string") {
        return value;
    }
    const normalized = value.replace(/^for\s*\(;;\);\s*/i, "");
    try {
        return JSON.parse(normalized);
    }
    catch {
        return normalized;
    }
}
function pick(re, html, index = 1) {
    const match = html.match(re);
    return match ? match[index] || "" : "";
}
function getFrom(html, startToken, endToken) {
    const startIndex = html.indexOf(startToken);
    if (startIndex < 0) {
        return undefined;
    }
    const start = startIndex + startToken.length;
    const end = html.indexOf(endToken, start);
    if (end < 0) {
        return undefined;
    }
    return html.slice(start, end);
}
function getResponseFinalUrl(response) {
    return (response &&
        (response.url ||
            response.requestUrl ||
            response.request?.res?.responseUrl ||
            response.request?.responseURL)) || "";
}
function detectCheckpoint(response) {
    const url = String(getResponseFinalUrl(response) || "");
    const body = typeof response?.body === "string"
        ? response.body
        : typeof response?.data === "string"
            ? response.data
            : "";
    const hit = /\/checkpoint\//i.test(url) ||
        /(?:href|action)\s*=\s*["']https?:\/\/[^"']*\/checkpoint\//i.test(body) ||
        /"checkpoint"|checkpoint_title|checkpointMain|id="checkpoint"/i.test(body) ||
        (/login\.php/i.test(url) && /checkpoint/i.test(body));
    return {
        hit,
        url: url || (body.match(/https?:\/\/[^"']*\/checkpoint\/[^"'<>]*/i)?.[0] || "")
    };
}
function createCheckpointError(response) {
    const detected = detectCheckpoint(response);
    if (!detected.hit) {
        return null;
    }
    const error = new Error("Checkpoint required");
    error.code = "CHECKPOINT";
    error.checkpoint = true;
    error.url = detected.url || "https://www.facebook.com/checkpoint/";
    error.status = response?.statusCode || response?.status;
    return error;
}
function getType(value) {
    return Object.prototype.toString.call(value).slice(8, -1);
}
const EXT_MIME_MAP = {
    ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".ogg": "audio/ogg",
    ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".mkv": "video/x-matroska",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp",
    ".pdf": "application/pdf", ".zip": "application/zip",
};
function mimeFromExt(ext) {
    return EXT_MIME_MAP[ext.toLowerCase()] || undefined;
}
function isReadableStream(value) {
    return (value instanceof node_stream_1.default.Readable &&
        (getType(value._read) === "Function" ||
            getType(value._read) === "AsyncFunction") &&
        getType(value._readableState) === "Object");
}
function parseDataUrl(value) {
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(value);
    if (!match) {
        return null;
    }
    const mime = match[1] || "application/octet-stream";
    const isBase64 = Boolean(match[2]);
    const data = isBase64
        ? Buffer.from(match[3], "base64")
        : Buffer.from(decodeURIComponent(match[3]), "utf8");
    return { mime, data };
}
function filenameFromUrl(value, headers = {}) {
    try {
        const url = new node_url_1.URL(value);
        let filename = node_path_1.default.basename(url.pathname) || `file-${Date.now()}`;
        const contentDisposition = headers["content-disposition"] || headers["Content-Disposition"] || "";
        if (contentDisposition) {
            const match = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(contentDisposition);
            if (match) {
                filename = decodeURIComponent(match[1].replace(/"/g, ""));
            }
        }
        return filename;
    }
    catch {
        return `file-${Date.now()}`;
    }
}
function mapAttachmentDetails(data) {
    const result = [];
    if (!data || typeof data !== "object") {
        return result;
    }
    const stack = [data];
    while (stack.length) {
        const current = stack.pop();
        if (!current || typeof current !== "object") {
            continue;
        }
        const id = current.video_id ||
            current.image_id ||
            current.audio_id ||
            current.file_id ||
            current.fbid ||
            current.id ||
            current.upload_id ||
            current.gif_id;
        const idKey = current.video_id
            ? "video_id"
            : current.image_id
                ? "image_id"
                : current.audio_id
                    ? "audio_id"
                    : current.file_id
                        ? "file_id"
                        : current.gif_id
                            ? "gif_id"
                            : current.fbid
                                ? "fbid"
                                : id
                                    ? "id"
                                    : null;
        const filename = current.filename || current.file_name || current.name || current.original_filename;
        const filetype = current.filetype || current.mime_type || current.type || current.content_type;
        let thumbnail = current.thumbnail_src ||
            current.thumbnail_url ||
            current.preview_url ||
            current.thumbSrc ||
            current.thumb_url ||
            current.image_preview_url ||
            current.large_preview_url;
        if (!thumbnail) {
            const media = current.media || current.thumbnail || current.thumb || current.image_data || current.video_data || current.preview;
            thumbnail =
                media?.thumbnail_src || media?.thumbnail_url || media?.src || media?.uri || media?.url;
        }
        if (idKey) {
            const entry = {
                [idKey]: typeof id === "number" ? id : String(id)
            };
            if (filename) {
                entry.filename = String(filename);
            }
            if (filetype) {
                entry.filetype = String(filetype);
            }
            if (thumbnail) {
                entry.thumbnail_src = String(thumbnail);
            }
            result.push(entry);
        }
        if (Array.isArray(current)) {
            for (const value of current) {
                stack.push(value);
            }
            continue;
        }
        for (const key of Object.keys(current)) {
            stack.push(current[key]);
        }
    }
    if (!result.length && Array.isArray(data.payload?.metadata)) {
        return data.payload.metadata;
    }
    return result;
}
function createConcurrencyLimit(maxConcurrent) {
    let active = 0;
    const queue = [];
    const next = () => {
        active--;
        const item = queue.shift();
        if (item) {
            item();
        }
    };
    return function limit(task) {
        return new Promise((resolve, reject) => {
            const run = () => {
                active++;
                task()
                    .then((value) => {
                    resolve(value);
                    next();
                })
                    .catch((error) => {
                    reject(error);
                    next();
                });
            };
            if (active < maxConcurrent) {
                run();
            }
            else {
                queue.push(run);
            }
        });
    };
}
async function normalizeUploadInput(input, jar, ua) {
    if (!input) {
        throw new Error("Invalid input");
    }
    if (Buffer.isBuffer(input)) {
        return {
            buffer: input,
            filename: `file-${Date.now()}.bin`,
            contentType: "application/octet-stream"
        };
    }
    if (typeof input === "string") {
        if (/^https?:\/\//i.test(input)) {
            const response = await client_1.client.get(input, {
                headers: {
                    "User-Agent": ua,
                    Accept: "*/*",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Cache-Control": "no-cache"
                },
                timeout: 30000,
                responseType: "arraybuffer",
                jar
            });
            return {
                buffer: response.data,
                filename: filenameFromUrl(input, response.headers)
            };
        }
        if (input.startsWith("data:")) {
            const parsed = parseDataUrl(input);
            if (!parsed) {
                throw new Error("Bad data URL");
            }
            return {
                buffer: parsed.data,
                filename: `file-${Date.now()}`,
                contentType: parsed.mime
            };
        }
        if (node_fs_1.default.existsSync(input) && node_fs_1.default.statSync(input).isFile()) {
            return {
                buffer: node_fs_1.default.readFileSync(input),
                filename: node_path_1.default.basename(input)
            };
        }
        throw new Error(`Unsupported string input: ${input}`);
    }
    if (isReadableStream(input)) {
        // ← إصلاح: fs.createReadStream(path) يضبط خاصية .path على الـ stream
        // نفسه بمسار الملف الأصلي. الكود القديم كان يتجاهلها كلياً ويولّد
        // اسماً عاماً بلا امتداد (file-172839...)، فكانت فيسبوك تعرض أي
        // ملف صوت/فيديو مُرسل كـ stream خام كملف عام غير قابل للتشغيل
        // بدل مشغّل صوتي/مرئي مضمّن. الآن نحافظ على الاسم والامتداد
        // الحقيقيين متى ما كانا متوفّرين، ونستنتج نوع المحتوى من الامتداد.
        const streamPath = typeof input.path === "string" || Buffer.isBuffer(input.path) ? String(input.path) : null;
        const ext = streamPath ? node_path_1.default.extname(streamPath) : "";
        return {
            buffer: await (0, node_stream_consumers_1.buffer)(input),
            filename: streamPath ? node_path_1.default.basename(streamPath) : `file-${Date.now()}`,
            contentType: ext ? mimeFromExt(ext) : undefined
        };
    }
    if (typeof input === "object") {
        const descriptor = input;
        if (descriptor.buffer && Buffer.isBuffer(descriptor.buffer)) {
            return {
                buffer: descriptor.buffer,
                filename: descriptor.filename || `file-${Date.now()}.bin`,
                contentType: descriptor.contentType || "application/octet-stream"
            };
        }
        if (descriptor.data && Buffer.isBuffer(descriptor.data)) {
            return {
                buffer: descriptor.data,
                filename: descriptor.filename || `file-${Date.now()}.bin`,
                contentType: descriptor.contentType || "application/octet-stream"
            };
        }
        if (descriptor.stream && isReadableStream(descriptor.stream)) {
            return {
                buffer: await (0, node_stream_consumers_1.buffer)(descriptor.stream),
                filename: descriptor.filename || `file-${Date.now()}`,
                contentType: descriptor.contentType
            };
        }
        if (descriptor.url) {
            return normalizeUploadInput(String(descriptor.url), jar, ua);
        }
        if (descriptor.path &&
            node_fs_1.default.existsSync(descriptor.path) &&
            node_fs_1.default.statSync(descriptor.path).isFile()) {
            return {
                buffer: node_fs_1.default.readFileSync(descriptor.path),
                filename: descriptor.filename || node_path_1.default.basename(descriptor.path),
                contentType: descriptor.contentType
            };
        }
    }
    throw new Error("Unrecognized input");
}
async function singleUpload(params) {
    const { jar, urlBase, file, ua, tokens, retries = 2 } = params;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const form = new FormData();
        const blob = new Blob([file.buffer], {
            type: file.contentType || "application/octet-stream"
        });
        form.append("farr", blob, file.filename);
        const headers = {
            Accept: "*/*",
            "Accept-Language": "vi,en-US;q=0.9,en;q=0.8,fr-FR;q=0.7,fr;q=0.6",
            "Accept-Encoding": "gzip, deflate, br",
            "User-Agent": ua,
            "x-asbd-id": "359341",
            "x-fb-lsd": tokens.lsd || "",
            "x-fb-friendly-name": "MercuryUpload",
            "x-fb-request-analytics-tags": JSON.stringify({
                network_tags: {
                    product: "256002347743983",
                    purpose: "none",
                    request_category: "graphql",
                    retry_attempt: "0"
                },
                application_tags: "graphservice"
            }),
            "sec-ch-prefers-color-scheme": "dark",
            "sec-ch-ua": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            Origin: "https://www.facebook.com",
            Referer: "https://www.facebook.com/",
            "x-fb-rlafr": "0",
            Connection: "keep-alive"
        };
        const finalUrl = new node_url_1.URL(urlBase);
        finalUrl.searchParams.set("fb_dtsg", tokens.fb_dtsg);
        finalUrl.searchParams.set("jazoest", tokens.jazoest);
        finalUrl.searchParams.set("lsd", tokens.lsd);
        finalUrl.searchParams.set("__aaid", "0");
        finalUrl.searchParams.set("__ccg", "EXCELLENT");
        try {
            // ملاحظة: ما نحط هيدر Content-Type يدوي — fetch يضبطه تلقائيًا
            // (multipart/form-data; boundary=...) لما الـ body يكون FormData
            // أصلي، تمامًا متل ما كانت form.getHeaders() تسويها يدوي قبل.
            const response = await client_1.client.post(finalUrl.toString(), form, {
                headers,
                timeout: 120000,
                jar
            });
            if (response?.status >= 500) {
                const error = new Error(`Upload failed with status ${response.status}`);
                error.response = response;
                error.status = response.status;
                if (attempt === retries) {
                    throw error;
                }
                await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
                continue;
            }
            return response;
        }
        catch (error) {
            const code = error?.code;
            const status = error?.response?.status;
            const retryable = code === "ETIMEDOUT" || code === "ECONNRESET" || status >= 500;
            if (attempt === retries || !retryable) {
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
        }
    }
    throw new Error("Attachment upload failed");
}
function createAttachmentUploadTransport(deps) {
    const { ctx, logger } = deps;
    const ua = ctx.options?.userAgent || DEFAULT_UA;
    const jar = ctx.jar instanceof tough_cookie_1.CookieJar || typeof ctx.jar?.setCookie === "function"
        ? ctx.jar
        : new tough_cookie_1.CookieJar();
    const tokenState = {
        value: null,
        timestamp: 0
    };
    async function fetchHtml(pageUrl, headers = {}) {
        const host = new node_url_1.URL(pageUrl).hostname;
        const referer = `https://${host}/`;
        const response = await client_1.client.get(pageUrl, {
            headers: {
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                "Accept-Encoding": "gzip, deflate, br",
                "Cache-Control": "max-age=0",
                Connection: "keep-alive",
                Host: host,
                Origin: `https://${host}`,
                Referer: referer,
                "Sec-Ch-Prefers-Color-Scheme": "dark",
                "Sec-Ch-Ua": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
                "Sec-Ch-Ua-Full-Version-List": '"Google Chrome";v="143.0.7499.182", "Chromium";v="143.0.7499.182", "Not A(Brand";v="24.0.0.0"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Model": "\"\"",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Ch-Ua-Platform-Version": '"19.0.0"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
                "User-Agent": ua,
                "x-fb-rlafr": "0",
                ...headers
            },
            timeout: 30000,
            jar
        });
        const checkpointError = createCheckpointError(response);
        if (checkpointError) {
            throw checkpointError;
        }
        return typeof response.data === "string" ? response.data : String(response.data || "");
    }
    async function getTokens(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && tokenState.value && now - tokenState.timestamp < TOKEN_CACHE_TTL) {
            return tokenState.value;
        }
        try {
            const html = await fetchHtml("https://www.facebook.com/", {
                Referer: "https://www.facebook.com/"
            });
            const tokens = {
                fb_dtsg: getFrom(html, "\"DTSGInitData\",[],{\"token\":\"", "\",") ||
                    html.match(/name="fb_dtsg"\s+value="([^"]+)"/)?.[1] ||
                    "",
                jazoest: getFrom(html, "name=\"jazoest\" value=\"", "\"") ||
                    getFrom(html, "jazoest=", "\",") ||
                    html.match(/name="jazoest"\s+value="([^"]+)"/)?.[1] ||
                    "",
                lsd: getFrom(html, "[\"LSD\",[],{\"token\":\"", "\"}") ||
                    html.match(/name="lsd"\s+value="([^"]+)"/)?.[1] ||
                    "",
                spin_r: pick(/"__spin_r":(\d+)/, html),
                spin_t: pick(/"__spin_t":(\d+)/, html),
                rev: pick(/"__rev":(\d+)/, html)
            };
            if ((!tokens.fb_dtsg || !tokens.lsd) && !tokenState.value) {
                throw new Error("Failed to fetch fb_dtsg or LSD from Facebook");
            }
            tokenState.value = tokens;
            tokenState.timestamp = now;
            return tokens;
        }
        catch (error) {
            if (tokenState.value) {
                logger?.warn?.(`[uploadAttachment] Token fetch failed, using cached tokens: ${String(error?.message || error)}`);
                return tokenState.value;
            }
            throw error;
        }
    }
    return async function uploadAttachmentsViaMercury(inputs, options = {}) {
        if (!Array.isArray(inputs) || inputs.length === 0) {
            throw new Error("No files to upload");
        }
        try {
            let tokens = await getTokens();
            const normalizedInputs = await Promise.all(inputs.map((input) => normalizeUploadInput(input, jar, ua)));
            const concurrency = Math.max(1, Math.min(5, Number(options.concurrency || 3)));
            const mode = options.mode === "single" ? "single" : "parallel";
            const query = [];
            const userId = ctx.userID || ctx.userId ? String(ctx.userID || ctx.userId) : "";
            if (userId) {
                query.push(`__user=${encodeURIComponent(userId)}`);
            }
            query.push("__a=1");
            query.push("dpr=1");
            query.push(`__req=${encodeURIComponent(Math.floor(Math.random() * 36 ** 2).toString(36))}`);
            if (tokens.spin_r) {
                query.push(`__spin_r=${encodeURIComponent(tokens.spin_r)}`);
            }
            if (tokens.spin_t) {
                query.push(`__spin_t=${encodeURIComponent(tokens.spin_t)}`);
            }
            if (tokens.rev) {
                query.push(`__rev=${encodeURIComponent(tokens.rev)}`);
            }
            query.push("__spin_b=trunk");
            query.push("__comet_req=15");
            const baseUrl = `https://www.facebook.com/ajax/mercury/upload.php?${query.join("&")}`;
            if (mode === "single") {
                const response = await singleUpload({
                    jar,
                    urlBase: baseUrl,
                    file: normalizedInputs[0],
                    ua,
                    tokens
                });
                const checkpointError = createCheckpointError(response);
                if (checkpointError) {
                    tokenState.value = null;
                    throw checkpointError;
                }
                const data = cleanJsonResponse(response.data);
                const ids = mapAttachmentDetails(data);
                if (!ids.length) {
                    const error = new Error("UploadFb returned no metadata/ids");
                    error.code = "NO_METADATA";
                    error.status = response.status;
                    error.body = typeof data === "string" ? data.slice(0, 500) : data;
                    throw error;
                }
                logger?.info?.(`[uploadAttachment] success ${ids.length} item(s) status ${response.status}`);
                return {
                    status: response.status,
                    ids,
                    raw: data
                };
            }
            const limit = createConcurrencyLimit(concurrency);
            const tasks = normalizedInputs.map((file) => limit(() => singleUpload({
                jar,
                urlBase: baseUrl,
                file,
                ua,
                tokens
            })));
            const responses = await Promise.all(tasks);
            const ids = [];
            const errors = [];
            for (let index = 0; index < responses.length; index++) {
                const response = responses[index];
                try {
                    const checkpointError = createCheckpointError(response);
                    if (checkpointError) {
                        tokenState.value = null;
                        throw checkpointError;
                    }
                    const data = cleanJsonResponse(response.data);
                    const fileIds = mapAttachmentDetails(data);
                    if (!fileIds.length) {
                        logger?.warn?.(`[uploadAttachment] File ${index + 1} returned no metadata/ids`);
                        continue;
                    }
                    ids.push(...fileIds);
                }
                catch (error) {
                    errors.push({ index, error });
                    logger?.error?.(`[uploadAttachment] Upload ${index + 1} failed: ${String(error?.message || error)}`);
                }
            }
            if (ids.length === 0 && errors.length > 0) {
                throw errors[0].error;
            }
            logger?.info?.(`[uploadAttachment] success ${ids.length}/${normalizedInputs.length} item(s)`);
            return {
                status: 200,
                ids,
                raw: null,
                errors: errors.length > 0 ? errors : undefined
            };
        }
        catch (error) {
            const status = error?.response?.status;
            if (error?.code === "CHECKPOINT" || status === 401 || status === 403) {
                tokenState.value = null;
                try {
                    const refreshedTokens = await getTokens(true);
                    if (refreshedTokens) {
                        logger?.info?.("[uploadAttachment] Tokens refreshed after error");
                    }
                }
                catch (refreshError) {
                    logger?.error?.(`[uploadAttachment] Token refresh failed: ${String(refreshError?.message || refreshError)}`);
                }
            }
            logger?.error?.(`[uploadAttachment] error ${error?.code || error?.status || ""} ${String(error?.message || error)}`);
            throw error;
        }
    };
}

export default module.exports;
const __export_createAttachmentUploadTransport = module.exports.createAttachmentUploadTransport;
export { __export_createAttachmentUploadTransport as createAttachmentUploadTransport };
