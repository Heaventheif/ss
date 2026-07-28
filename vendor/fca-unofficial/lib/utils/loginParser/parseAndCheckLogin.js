import logger from "../../func/logger.js";
import * as autoLogin_1 from "./autoLogin.js";
import * as helpers_1 from "./helpers.js";
import * as textUtils_1 from "./textUtils.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAndCheckLogin = parseAndCheckLogin;
const logger_1 = __importDefault(logger);
function parseAndCheckLogin(ctx, http, retryCount = 0) {
    const emit = (0, helpers_1.createEmit)(ctx);
    const helpers = { buildUrl: helpers_1.buildUrl, headerOf: helpers_1.headerOf, formatCookie: helpers_1.formatCookie };
    const maybeAutoLogin = (0, autoLogin_1.createMaybeAutoLogin)(ctx, http, helpers, emit, parseAndCheckLogin);
    return async function handleResponse(res) {
        const typedRes = (res || {});
        const status = typedRes?.status ?? 0;
        if (status >= 500 && status < 600) {
            if (retryCount >= 5) {
                const err = new Error("Request retry failed. Check the `res` and `statusCode` property on this error.");
                err.statusCode = status;
                err.res = typedRes?.data;
                err.error = "Request retry failed. Check the `res` and `statusCode` property on this error.";
                (0, logger_1.default)(`parseAndCheckLogin: Max retries (5) reached for status ${status}`, "error");
                throw err;
            }
            const baseDelay = retryCount === 0 ? 1500 : 1000 * Math.pow(2, retryCount);
            const jitter = Math.floor(Math.random() * 200);
            const retryTime = Math.min(baseDelay + jitter, 10000);
            const method = String(typedRes?.config?.method || "GET").toUpperCase();
            const url = (0, helpers_1.buildUrl)(typedRes?.config);
            (0, logger_1.default)(`parseAndCheckLogin: [${method}] ${url || "(no url)"} -> Retrying request (attempt ${retryCount + 1}/5) after ${retryTime}ms for status ${status}`, "warn");
            await (0, helpers_1.delay)(retryTime);
            const ctype = String((0, helpers_1.headerOf)(typedRes?.config?.headers, "content-type") || "").toLowerCase();
            const isMultipart = ctype.includes("multipart/form-data");
            const payload = typedRes?.config?.data;
            const params = typedRes?.config?.params;
            const nextRetry = retryCount + 1;
            try {
                if (method === "GET") {
                    const newData = await http.get(url, ctx.jar, params || null, ctx.globalOptions, ctx);
                    return await parseAndCheckLogin(ctx, http, nextRetry)(newData);
                }
                if (isMultipart) {
                    const newData = await http.postFormData(url, ctx.jar, payload, params, ctx.globalOptions, ctx);
                    return await parseAndCheckLogin(ctx, http, nextRetry)(newData);
                }
                const newData = await http.post(url, ctx.jar, payload, ctx.globalOptions, ctx);
                return await parseAndCheckLogin(ctx, http, nextRetry)(newData);
            }
            catch (retryErr) {
                if (retryErr?.code === "ERR_INVALID_CHAR" || (retryErr?.message && retryErr.message.includes("Invalid character in header"))) {
                    (0, logger_1.default)(`parseAndCheckLogin: Invalid header detected, aborting retry. Error: ${retryErr.message}`, "error");
                    const err = new Error("Invalid header content detected. Request aborted to prevent crash.");
                    err.error = "Invalid header content";
                    err.statusCode = status;
                    err.res = typedRes?.data;
                    err.originalError = retryErr;
                    throw err;
                }
                if (nextRetry >= 5) {
                    (0, logger_1.default)("parseAndCheckLogin: Max retries reached, returning error instead of crashing", "error");
                    const err = new Error("Request retry failed after 5 attempts. Check the `res` and `statusCode` property on this error.");
                    err.statusCode = status;
                    err.res = typedRes?.data;
                    err.error = "Request retry failed after 5 attempts";
                    err.originalError = retryErr;
                    throw err;
                }
                return await parseAndCheckLogin(ctx, http, nextRetry)(typedRes);
            }
        }
        if (status === 404)
            return undefined;
        if (status !== 200) {
            const err = new Error(`parseAndCheckLogin got status code: ${status}. Bailing out of trying to parse response.`);
            err.statusCode = status;
            err.res = typedRes?.data;
            throw err;
        }
        const resBodyRaw = typedRes?.data;
        const body = typeof resBodyRaw === "string" ? (0, textUtils_1.makeParsable)(resBodyRaw) : resBodyRaw;
        let parsed;
        try {
            parsed = typeof body === "object" && body !== null ? body : JSON.parse(String(body));
        }
        catch (e) {
            const err = new Error("JSON.parse error. Check the `detail` property on this error.");
            err.error = "JSON.parse error. Check the `detail` property on this error.";
            err.detail = e;
            err.res = resBodyRaw;
            throw err;
        }
        const method = String(typedRes?.config?.method || "GET").toUpperCase();
        if (parsed?.redirect && method === "GET") {
            const redirectRes = await http.get(parsed.redirect, ctx.jar, null, ctx.globalOptions, ctx);
            return await parseAndCheckLogin(ctx, http)(redirectRes);
        }
        if (parsed?.jsmods &&
            parsed.jsmods.require &&
            Array.isArray(parsed.jsmods.require[0]) &&
            parsed.jsmods.require[0][0] === "Cookie") {
            parsed.jsmods.require[0][3][0] = String(parsed.jsmods.require[0][3][0] || "").replace("_js_", "");
            const requireCookie = parsed.jsmods.require[0][3];
            await ctx.jar.setCookie((0, helpers_1.formatCookie)(requireCookie, "facebook"), "https://www.facebook.com");
            await ctx.jar.setCookie((0, helpers_1.formatCookie)(requireCookie, "messenger"), "https://www.messenger.com");
        }
        if (parsed?.jsmods && Array.isArray(parsed.jsmods.require)) {
            for (const item of parsed.jsmods.require) {
                if (item[0] === "DTSG" && item[1] === "setToken") {
                    const token = String(item?.[3]?.[0] || "");
                    ctx.fb_dtsg = token;
                    ctx.ttstamp = "2";
                    for (let j = 0; j < token.length; j++) {
                        ctx.ttstamp += token.charCodeAt(j);
                    }
                    break;
                }
            }
        }
        if (parsed?.error === 1357001) {
            const err = new Error("Facebook blocked the login");
            err.error = "login_blocked";
            err.res = parsed;
            emit("loginBlocked", { res: parsed });
            throw err;
        }
        const resData = parsed;
        const resStr = JSON.stringify(resData);
        if (resStr.includes("XCheckpointFBScrapingWarningController") || resStr.includes("601051028565049")) {
            emit("checkpoint", { type: "scraping_warning", res: resData });
            return await maybeAutoLogin(resData, typedRes?.config);
        }
        if (resStr.includes("https://www.facebook.com/login.php?") || String(parsed?.redirect || "").includes("login.php?")) {
            return await maybeAutoLogin(resData, typedRes?.config);
        }
        if (resStr.includes("1501092823525282")) {
            (0, logger_1.default)("Bot checkpoint 282 detected, please check the account!", "error");
            const err = new Error("Checkpoint 282 detected");
            err.error = "checkpoint_282";
            err.res = resData;
            emit("checkpoint", { type: "282", res: resData });
            emit("checkpoint_282", { res: resData });
            throw err;
        }
        if (resStr.includes("828281030927956")) {
            (0, logger_1.default)("Bot checkpoint 956 detected, please check the account!", "error");
            const err = new Error("Checkpoint 956 detected");
            err.error = "checkpoint_956";
            err.res = resData;
            emit("checkpoint", { type: "956", res: resData });
            emit("checkpoint_956", { res: resData });
            throw err;
        }
        return parsed;
    };
}

export default module.exports;
const __export_parseAndCheckLogin = module.exports.parseAndCheckLogin;
export { __export_parseAndCheckLogin as parseAndCheckLogin };
