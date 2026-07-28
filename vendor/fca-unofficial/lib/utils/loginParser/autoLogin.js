import logger from "../../func/logger.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMaybeAutoLogin = createMaybeAutoLogin;
const logger_1 = __importDefault(logger);
function createMaybeAutoLogin(ctx, http, helpers, emit, parseAndCheckLogin) {
    const { buildUrl, headerOf } = helpers;
    return async function maybeAutoLogin(resData, resConfig) {
        if (ctx.auto_login) {
            const e = new Error("Not logged in. Auto login already in progress.");
            e.error = "Not logged in.";
            e.res = resData;
            throw e;
        }
        if (typeof ctx.performAutoLogin !== "function") {
            const e = new Error("Not logged in. Auto login function not available.");
            e.error = "Not logged in.";
            e.res = resData;
            throw e;
        }
        ctx.auto_login = true;
        (0, logger_1.default)("Login session expired, attempting auto login...", "warn");
        emit("sessionExpired", { res: resData });
        try {
            const ok = await ctx.performAutoLogin();
            if (ok) {
                (0, logger_1.default)("Auto login successful! Retrying request...", "info");
                emit("autoLoginSuccess", { res: resData });
                ctx.auto_login = false;
                if (!resConfig) {
                    const e = new Error("Not logged in. Auto login successful but cannot retry request.");
                    e.error = "Not logged in.";
                    e.res = resData;
                    throw e;
                }
                const url = buildUrl(resConfig);
                const method = String(resConfig?.method || "GET").toUpperCase();
                const ctype = String(headerOf(resConfig?.headers, "content-type") || "").toLowerCase();
                const isMultipart = ctype.includes("multipart/form-data");
                const payload = resConfig?.data;
                const params = resConfig?.params;
                try {
                    let newData;
                    if (method === "GET") {
                        newData = await http.get(url, ctx.jar, params || null, ctx.globalOptions, ctx);
                    }
                    else if (isMultipart) {
                        newData = await http.postFormData(url, ctx.jar, payload, params, ctx.globalOptions, ctx);
                    }
                    else {
                        newData = await http.post(url, ctx.jar, payload, ctx.globalOptions, ctx);
                    }
                    return await parseAndCheckLogin(ctx, http)(newData);
                }
                catch (retryErr) {
                    if (retryErr?.code === "ERR_INVALID_CHAR" || (retryErr?.message && retryErr.message.includes("Invalid character in header"))) {
                        (0, logger_1.default)(`Auto login retry failed: Invalid header detected. Error: ${retryErr.message}`, "error");
                        const e = new Error("Not logged in. Auto login retry failed due to invalid header.");
                        e.error = "Not logged in.";
                        e.res = resData;
                        e.originalError = retryErr;
                        throw e;
                    }
                    (0, logger_1.default)(`Auto login retry failed: ${retryErr && retryErr.message ? retryErr.message : String(retryErr)}`, "error");
                    const e = new Error("Not logged in. Auto login retry failed.");
                    e.error = "Not logged in.";
                    e.res = resData;
                    e.originalError = retryErr;
                    throw e;
                }
            }
            ctx.auto_login = false;
            const e = new Error("Not logged in. Auto login failed.");
            e.error = "Not logged in.";
            e.res = resData;
            emit("autoLoginFailed", { error: e, res: resData });
            throw e;
        }
        catch (autoLoginErr) {
            ctx.auto_login = false;
            if (autoLoginErr.error === "Not logged in.") {
                throw autoLoginErr;
            }
            (0, logger_1.default)(`Auto login error: ${autoLoginErr && autoLoginErr.message ? autoLoginErr.message : String(autoLoginErr)}`, "error");
            const e = new Error("Not logged in. Auto login error.");
            e.error = "Not logged in.";
            e.res = resData;
            e.originalError = autoLoginErr;
            emit("autoLoginFailed", { error: e, res: resData });
            throw e;
        }
    };
}

export default module.exports;
const __export_createMaybeAutoLogin = module.exports.createMaybeAutoLogin;
export { __export_createMaybeAutoLogin as createMaybeAutoLogin };
