import * as client_1 from "../../utils/client.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.getWithLoginCheck = getWithLoginCheck;
exports.postWithLoginCheck = postWithLoginCheck;
exports.postAndSaveCookies = postAndSaveCookies;
exports.postWithSavedCookiesAndLoginCheck = postWithSavedCookiesAndLoginCheck;
exports.getAndSaveCookies = getAndSaveCookies;
async function getWithLoginCheck(params) {
    const { defaultFuncs, ctx, url, form = null } = params;
    return defaultFuncs
        .get(url, ctx.jar, form || undefined)
        .then((0, client_1.parseAndCheckLogin)(ctx, defaultFuncs));
}
async function postWithLoginCheck(params) {
    const { defaultFuncs, ctx, url, form = {} } = params;
    return defaultFuncs
        .post(url, ctx.jar, form)
        .then((0, client_1.parseAndCheckLogin)(ctx, defaultFuncs));
}
async function postAndSaveCookies(params) {
    const { defaultFuncs, ctx, url, form = {} } = params;
    return defaultFuncs
        .post(url, ctx.jar, form)
        .then((0, client_1.saveCookies)(ctx.jar));
}
async function postWithSavedCookiesAndLoginCheck(params) {
    const { defaultFuncs, ctx, url, form = {} } = params;
    return defaultFuncs
        .post(url, ctx.jar, form)
        .then((0, client_1.saveCookies)(ctx.jar))
        .then((0, client_1.parseAndCheckLogin)(ctx, defaultFuncs));
}
async function getAndSaveCookies(params) {
    const { defaultFuncs, ctx, url, form = {} } = params;
    return defaultFuncs
        .get(url, ctx.jar, form)
        .then((0, client_1.saveCookies)(ctx.jar));
}

export default module.exports;
const __export_getWithLoginCheck = module.exports.getWithLoginCheck;
const __export_postWithLoginCheck = module.exports.postWithLoginCheck;
const __export_postAndSaveCookies = module.exports.postAndSaveCookies;
const __export_postWithSavedCookiesAndLoginCheck = module.exports.postWithSavedCookiesAndLoginCheck;
const __export_getAndSaveCookies = module.exports.getAndSaveCookies;
export { __export_getWithLoginCheck as getWithLoginCheck };
export { __export_postWithLoginCheck as postWithLoginCheck };
export { __export_postAndSaveCookies as postAndSaveCookies };
export { __export_postWithSavedCookiesAndLoginCheck as postWithSavedCookiesAndLoginCheck };
export { __export_getAndSaveCookies as getAndSaveCookies };
