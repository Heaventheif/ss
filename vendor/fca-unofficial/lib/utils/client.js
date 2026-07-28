import * as cookies_1 from "./cookies.js";
import * as loginParser$0 from "./loginParser/index.js";

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
exports.parseAndCheckLogin = exports.saveCookies = exports.getAppState = void 0;
Object.defineProperty(exports, "getAppState", { enumerable: true, get: function () { return cookies_1.getAppState; } });
Object.defineProperty(exports, "saveCookies", { enumerable: true, get: function () { return cookies_1.saveCookies; } });
const loginParser = __importStar(loginParser$0);
exports.parseAndCheckLogin = loginParser.parseAndCheckLogin;

export default module.exports;
const __export_parseAndCheckLogin = module.exports.parseAndCheckLogin;
const __export_saveCookies = module.exports.saveCookies;
const __export_getAppState = module.exports.getAppState;
export { __export_parseAndCheckLogin as parseAndCheckLogin };
export { __export_saveCookies as saveCookies };
export { __export_getAppState as getAppState };
