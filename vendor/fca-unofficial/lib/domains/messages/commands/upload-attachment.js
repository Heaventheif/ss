import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as upload_attachment_1 from "../../../transport/http/upload-attachment.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createUploadAttachmentCommand = createUploadAttachmentCommand;
function createUploadAttachmentCommand(deps) {
    const { ctx, logger, logError } = deps;
    const uploadAttachments = (0, upload_attachment_1.createAttachmentUploadTransport)({
        ctx,
        logger
    });
    return function uploadAttachment(attachments, callback) {
        const { callback: legacyCallback, promise } = (0, legacy_promise_1.createLegacyPromise)(callback, []);
        const inputs = Array.isArray(attachments) ? attachments : [attachments];
        if (!inputs.length) {
            const error = { error: "Please pass an attachment or an array of attachments." };
            legacyCallback(error);
            return promise;
        }
        uploadAttachments(inputs, { mode: "parallel" })
            .then((result) => legacyCallback(null, result.ids))
            .catch((error) => {
            logError?.("uploadAttachment", error);
            legacyCallback(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createUploadAttachmentCommand = module.exports.createUploadAttachmentCommand;
export { __export_createUploadAttachmentCommand as createUploadAttachmentCommand };
