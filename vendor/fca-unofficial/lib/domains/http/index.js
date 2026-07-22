import * as http_get_1 from "./queries/http-get.js";
import * as http_post_1 from "./commands/http-post.js";
import * as post_form_data_1 from "./commands/post-form-data.js";

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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpDomain = createHttpDomain;
function createHttpDomain(deps) {
    return {
        get: (0, http_get_1.createHttpGetQuery)(deps.get),
        post: (0, http_post_1.createHttpPostCommand)(deps.post),
        postFormData: (0, post_form_data_1.createPostFormDataCommand)(deps.postFormData)
    };
}
__exportStar(http_get_1, exports);
__exportStar(http_post_1, exports);
__exportStar(post_form_data_1, exports);

export default module.exports;
const __export_createHttpDomain = module.exports.createHttpDomain;
export { __export_createHttpDomain as createHttpDomain };
