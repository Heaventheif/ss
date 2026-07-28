import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
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
exports.createHttpPostCommand = createHttpPostCommand;
const format_1 = __importDefault(format);
const requestUtils = __importStar(request);
const { getType } = format_1.default;
function createHttpPostCommand(deps) {
    const { defaultFuncs, ctx } = deps;
    return function httpPost(url, form, callback, notAPI) {
        let payload = form;
        let cb = callback;
        if (!cb && (getType(form) === "Function" || getType(form) === "AsyncFunction")) {
            cb = form;
            payload = {};
        }
        const { callback: legacyCallback, promise } = (0, legacy_promise_1.createLegacyPromise)(cb);
        const executor = notAPI ? requestUtils.post : defaultFuncs.post;
        executor(url, ctx.jar, payload || {}, ctx.globalOptions)
            .then((resData) => {
            let data = resData.data;
            if (typeof data === "object") {
                data = JSON.stringify(data, null, 2);
            }
            legacyCallback(null, data);
        })
            .catch((error) => {
            legacyCallback(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createHttpPostCommand = module.exports.createHttpPostCommand;
export { __export_createHttpPostCommand as createHttpPostCommand };
