import * as headers_1 from "../utils/headers.js";
import * as request from "../utils/request/index.js";

const module = { exports: {} };
const exports = module.exports;

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestHelper = void 0;
exports.createRequestCore = createRequestCore;
const requestUtils = __importStar(request);
function contextToHeaders(ctx, url, config) {
    const base = (0, headers_1.getHeaders)(url, ctx.options, ctx, (config && config.headers) || {});
    if (ctx.cookieString && !base.Cookie && !base.cookie) {
        base.Cookie = ctx.cookieString;
    }
    if (ctx.options && ctx.options.userAgent && !base["User-Agent"]) {
        base["User-Agent"] = ctx.options.userAgent;
    }
    return base;
}
const createRequestHelper = (ctx) => {
    const reqJar = ctx.jar || requestUtils.jar;
    return {
        get: async (url, config) => {
            const headers = contextToHeaders(ctx, url, config);
            return requestUtils.get(url, reqJar, (config && config.params) || null, ctx.options, ctx, headers);
        },
        post: async (url, data, config) => {
            const headers = contextToHeaders(ctx, url, config);
            return requestUtils.post(url, reqJar, data || {}, ctx.options, ctx, headers);
        },
        postFormData: async (url, formData, config) => {
            const headers = contextToHeaders(ctx, url, config);
            return requestUtils.postFormData(url, reqJar, formData || {}, (config && config.params) || null, { ...(ctx.options || {}), headers }, ctx);
        }
    };
};
exports.createRequestHelper = createRequestHelper;
function createRequestCore(overrides = {}) {
    return {
        get: overrides.get || requestUtils.get,
        post: overrides.post || requestUtils.post,
        postFormData: overrides.postFormData || requestUtils.postFormData,
        jar: overrides.jar || requestUtils.jar,
        makeDefaults: overrides.makeDefaults || requestUtils.makeDefaults,
        client: overrides.client || requestUtils.client,
        setProxy: overrides.setProxy || requestUtils.setProxy
    };
}

export default module.exports;
const __export_createRequestHelper = module.exports.createRequestHelper;
const __export_createRequestCore = module.exports.createRequestCore;
export { __export_createRequestHelper as createRequestHelper };
export { __export_createRequestCore as createRequestCore };
