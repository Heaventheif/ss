import * as client_1 from "../../utils/client.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.postSharedPhotosRequest = postSharedPhotosRequest;
const SHARED_PHOTOS_URL = "https://www.facebook.com/ajax/messaging/attachments/sharedphotos.php";
async function postSharedPhotosRequest(params) {
    const { defaultFuncs, ctx, form } = params;
    return defaultFuncs
        .post(SHARED_PHOTOS_URL, ctx.jar, form)
        .then((0, client_1.parseAndCheckLogin)(ctx, defaultFuncs));
}

export default module.exports;
const __export_postSharedPhotosRequest = module.exports.postSharedPhotosRequest;
export { __export_postSharedPhotosRequest as postSharedPhotosRequest };
