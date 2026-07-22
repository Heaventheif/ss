import * as client_1 from "../../utils/client.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.postFormDataWithLoginCheck = postFormDataWithLoginCheck;
async function postFormDataWithLoginCheck(params) {
    const { defaultFuncs, ctx, url, form, query = {} } = params;
    return defaultFuncs
        .postFormData(url, ctx.jar, form, query)
        .then((0, client_1.parseAndCheckLogin)(ctx, defaultFuncs));
}

export default module.exports;
const __export_postFormDataWithLoginCheck = module.exports.postFormDataWithLoginCheck;
export { __export_postFormDataWithLoginCheck as postFormDataWithLoginCheck };
