import logger from "../func/logger.js";
import format from "../utils/format/index.js";
import * as state_1 from "./state.js";
import * as request_1 from "./request.js";
import * as options_1 from "./options.js";
import * as config_1 from "./config.js";
import * as update_check_1 from "./update-check.js";
import loginHelper from "./login-helper.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setJarFromPairs = exports.normalizeCookieHeaderString = exports.loginViaAPI = exports.tokensViaAPI = void 0;
exports.loginAsync = loginAsync;
exports.login = login;
exports.loginLegacy = loginLegacy;
const logger_1 = __importDefault(logger);
const format_1 = __importDefault(format);
const login_helper_1 = __importDefault(loginHelper);
const { getType } = format_1.default;
const g = global;
const initialConfig = (0, config_1.loadConfig)().config;
g.fca = g.fca || {};
g.fca.config = initialConfig;
if (!g.fca._errorHandlersInstalled) {
    g.fca._errorHandlersInstalled = true;
    process.on("unhandledRejection", (reason) => {
        try {
            if (reason && typeof reason === "object") {
                const errorCode = reason.code || reason.cause?.code;
                const errorMessage = reason.message || String(reason);
                if (errorMessage.includes("No Sequelize instance passed")) {
                    return;
                }
                if (errorCode === "UND_ERR_CONNECT_TIMEOUT" ||
                    errorCode === "ETIMEDOUT" ||
                    errorMessage.includes("Connect Timeout") ||
                    errorMessage.includes("fetch failed")) {
                    (0, logger_1.default)(`Network timeout error caught (non-fatal): ${errorMessage}`, "warn");
                    return;
                }
                if (errorCode === "ECONNREFUSED" ||
                    errorCode === "ENOTFOUND" ||
                    errorCode === "ECONNRESET" ||
                    errorMessage.includes("ECONNREFUSED") ||
                    errorMessage.includes("ENOTFOUND")) {
                    (0, logger_1.default)(`Network connection error caught (non-fatal): ${errorMessage}`, "warn");
                    return;
                }
            }
            (0, logger_1.default)(`Unhandled promise rejection (non-fatal): ${reason && reason.message ? reason.message : String(reason)}`, "error");
        }
        catch { }
    });
    process.on("uncaughtException", (error) => {
        try {
            const errorMessage = error.message || String(error);
            const errorCode = error.code;
            if (errorMessage.includes("No Sequelize instance passed")) {
                return;
            }
            if (errorCode === "UND_ERR_CONNECT_TIMEOUT" ||
                errorCode === "ETIMEDOUT" ||
                errorMessage.includes("Connect Timeout") ||
                errorMessage.includes("fetch failed")) {
                (0, logger_1.default)(`Uncaught network timeout error (non-fatal): ${errorMessage}`, "warn");
                return;
            }
            (0, logger_1.default)(`Uncaught exception (attempting to continue): ${errorMessage}`, "error");
        }
        catch { }
    });
}
function appStateToCookieString(appState) {
    if (!Array.isArray(appState))
        return "";
    return appState
        .map((c) => {
        const key = c?.key || c?.name;
        const value = c?.value;
        if (!key || value === undefined || value === null)
            return null;
        return `${key}=${value}`;
    })
        .filter(Boolean)
        .join("; ");
}
function appStateToFbid(appState) {
    if (!Array.isArray(appState))
        return "";
    const cUser = appState.find((c) => c?.key === "c_user" || c?.name === "c_user");
    const iUser = appState.find((c) => c?.key === "i_user" || c?.name === "i_user");
    return String((cUser && cUser.value) || (iUser && iUser.value) || "");
}
const DEFAULT_LOGIN_OPTIONS = {
    selfListen: false,
    selfListenEvent: false,
    listenEvents: false,
    listenTyping: false,
    updatePresence: false,
    forceLogin: false,
    autoMarkRead: false,
    autoReconnect: true,
    online: true,
    emitReady: false,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
};
async function loginAsync(credentials, customOptions = {}) {
    const { config } = (0, config_1.loadConfig)();
    g.fca = g.fca || {};
    g.fca.config = config;
    const ctx = (0, state_1.createDefaultContext)();
    const globalOptions = { ...DEFAULT_LOGIN_OPTIONS };
    (0, options_1.setOptions)(globalOptions, customOptions || {});
    ctx.options = { ...ctx.options, ...globalOptions };
    ctx.globalOptions = globalOptions;
    ctx.cookieString = appStateToCookieString(credentials.appState);
    ctx.fbid = appStateToFbid(credentials.appState);
    ctx._request = (0, request_1.createRequestHelper)(ctx);
    const runLogin = () => new Promise((resolve, reject) => {
        (0, login_helper_1.default)(credentials.appState, credentials.Cookie, credentials.email, credentials.password, globalOptions, (error, api) => {
            if (error)
                return reject(error);
            return resolve(api);
        });
    });
    let api;
    if (config.checkUpdate.enabled) {
        await (0, update_check_1.runConfiguredUpdateCheck)(config, logger_1.default);
    }
    api = await runLogin();
    ctx.api = api;
    try {
        if (typeof api.getCurrentUserID === "function") {
            ctx.fbid = String(api.getCurrentUserID() || ctx.fbid || "");
            ctx.userID = ctx.fbid;
        }
        if (typeof api.getCookies === "function") {
            ctx.cookieString = String(api.getCookies() || ctx.cookieString || "");
        }
    }
    catch { }
    return ctx;
}
function login(credentials, optionsOrCallback, callback) {
    if (typeof optionsOrCallback === "function") {
        const cb = optionsOrCallback;
        void loginAsync(credentials, {})
            .then((ctx) => {
            cb(null, ctx.api);
        })
            .catch((err) => {
            cb(err instanceof Error ? err : new Error(String(err?.message ?? err)));
        });
        return;
    }
    if (typeof callback === "function") {
        const opts = (optionsOrCallback || {});
        void loginAsync(credentials, opts)
            .then((ctx) => {
            callback(null, ctx.api);
        })
            .catch((err) => {
            callback(err instanceof Error ? err : new Error(String(err?.message ?? err)));
        });
        return;
    }
    return loginAsync(credentials, (optionsOrCallback || {}));
}
function loginLegacy(credentials, options, callback) {
    if (getType(options) === "Function" || getType(options) === "AsyncFunction") {
        callback = options;
        options = {};
    }
    const p = loginAsync(credentials, (options || {}));
    if (typeof callback === "function") {
        p.then((res) => callback?.(null, res)).catch((err) => callback?.(err));
        return;
    }
    return p;
}
const tokensViaAPI = (email, password, twoFactor, apiBaseUrl) => login_helper_1.default.tokensViaAPI(email, password, twoFactor, apiBaseUrl);
exports.tokensViaAPI = tokensViaAPI;
const loginViaAPI = (email, password, twoFactor, apiBaseUrl, apiKey) => login_helper_1.default.loginViaAPI(email, password, twoFactor, apiBaseUrl, apiKey);
exports.loginViaAPI = loginViaAPI;
const normalizeCookieHeaderString = (cookieHeader) => login_helper_1.default.normalizeCookieHeaderString(cookieHeader);
exports.normalizeCookieHeaderString = normalizeCookieHeaderString;
const setJarFromPairs = (jar, pairs, domain) => login_helper_1.default.setJarFromPairs(jar, pairs, domain);
exports.setJarFromPairs = setJarFromPairs;
exports.default = login;

export default module.exports;
const __export_setJarFromPairs = module.exports.setJarFromPairs;
const __export_normalizeCookieHeaderString = module.exports.normalizeCookieHeaderString;
const __export_loginViaAPI = module.exports.loginViaAPI;
const __export_tokensViaAPI = module.exports.tokensViaAPI;
const __export_loginAsync = module.exports.loginAsync;
const __export_login = module.exports.login;
const __export_loginLegacy = module.exports.loginLegacy;
export { __export_setJarFromPairs as setJarFromPairs };
export { __export_normalizeCookieHeaderString as normalizeCookieHeaderString };
export { __export_loginViaAPI as loginViaAPI };
export { __export_tokensViaAPI as tokensViaAPI };
export { __export_loginAsync as loginAsync };
export { __export_login as login };
export { __export_loginLegacy as loginLegacy };
