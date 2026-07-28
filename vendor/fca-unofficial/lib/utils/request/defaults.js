import * as constants_1 from "../constants.js";
import * as methods_1 from "./methods.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.makeDefaults = makeDefaults;
function makeDefaults(html, userID, ctx) {
    let reqCounter = 1;
    const revision = (0, constants_1.getFrom)(html || "", 'revision":', ",") || (0, constants_1.getFrom)(html || "", '"client_revision":', ",") || "";
    function mergeWithDefaults(obj) {
        const base = {
            av: userID,
            __user: userID,
            __req: (reqCounter++).toString(36),
            __rev: revision,
            __a: 1
        };
        if (ctx?.fb_dtsg)
            base.fb_dtsg = ctx.fb_dtsg;
        if (ctx?.jazoest)
            base.jazoest = ctx.jazoest;
        if (!obj)
            return base;
        for (const k of Object.keys(obj)) {
            if (!(k in base))
                base[k] = obj[k];
        }
        return base;
    }
    return {
        get: (url, reqJar, qs, ctxx, customHeader = {}) => (0, methods_1.get)(url, reqJar, mergeWithDefaults(qs), ctx?.globalOptions, ctxx || ctx, customHeader),
        post: (url, reqJar, form, ctxx, customHeader = {}) => (0, methods_1.post)(url, reqJar, mergeWithDefaults(form), ctx?.globalOptions, ctxx || ctx, customHeader),
        postFormData: (url, reqJar, form, qs, ctxx) => (0, methods_1.postFormData)(url, reqJar, mergeWithDefaults(form), mergeWithDefaults(qs), ctx?.globalOptions, ctxx || ctx)
    };
}

export default module.exports;
const __export_makeDefaults = module.exports.makeDefaults;
export { __export_makeDefaults as makeDefaults };
