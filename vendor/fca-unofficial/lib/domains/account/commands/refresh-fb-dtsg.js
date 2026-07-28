import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as constants_1 from "../../../utils/constants.js";
import format from "../../../utils/format/index.js";
import * as request from "../../../utils/request/index.js";

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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRefreshFbDtsgCommand = createRefreshFbDtsgCommand;
const format_1 = __importDefault(format);
const requestUtils = __importStar(request);
const { getType } = format_1.default;
function createRefreshFbDtsgCommand(deps) {
    const { ctx } = deps;
    return function refreshFb_dtsg(obj, callback) {
        let payload = obj;
        let cb = callback;
        if (typeof obj === "function") {
            cb = obj;
            payload = {};
        }
        if (!payload) {
            payload = {};
        }
        if (getType(payload) !== "Object") {
            throw new Error("The first parameter must be an object or a callback function");
        }
        const { callback: legacyCallback, promise } = (0, legacy_promise_1.createLegacyPromise)(cb);
        if (Object.keys(payload).length === 0) {
            requestUtils
                .get("https://www.facebook.com/", ctx.jar, null, ctx.globalOptions, { noRef: true })
                .then(({ data }) => {
                const fb_dtsg = (0, constants_1.getFrom)(data, '["DTSGInitData",[],{"token":"', '","');
                const jazoest = (0, constants_1.getFrom)(data, "jazoest=", '",');
                if (!fb_dtsg) {
                    throw new Error("Could not find fb_dtsg in HTML after requesting Facebook.");
                }
                Object.assign(ctx, { fb_dtsg, jazoest });
                legacyCallback(null, {
                    data: { fb_dtsg, jazoest },
                    message: "Refreshed fb_dtsg and jazoest"
                });
            })
                .catch((error) => {
                legacyCallback(error);
            });
        }
        else {
            Object.assign(ctx, payload);
            legacyCallback(null, {
                data: payload,
                message: `Refreshed ${Object.keys(payload).join(", ")}`
            });
        }
        return promise;
    };
}

export default module.exports;
const __export_createRefreshFbDtsgCommand = module.exports.createRefreshFbDtsgCommand;
export { __export_createRefreshFbDtsgCommand as createRefreshFbDtsgCommand };
