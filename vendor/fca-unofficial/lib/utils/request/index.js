import * as client_1 from "./client.js";
import * as defaults_1 from "./defaults.js";
import * as methods_1 from "./methods.js";
import * as proxy_1 from "./proxy.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.client = exports.makeDefaults = exports.setProxy = exports.jar = exports.postFormData = exports.post = exports.get = exports.cleanGet = void 0;
Object.defineProperty(exports, "jar", { enumerable: true, get: function () { return client_1.jar; } });
Object.defineProperty(exports, "client", { enumerable: true, get: function () { return client_1.client; } });
Object.defineProperty(exports, "makeDefaults", { enumerable: true, get: function () { return defaults_1.makeDefaults; } });
Object.defineProperty(exports, "cleanGet", { enumerable: true, get: function () { return methods_1.cleanGet; } });
Object.defineProperty(exports, "get", { enumerable: true, get: function () { return methods_1.get; } });
Object.defineProperty(exports, "post", { enumerable: true, get: function () { return methods_1.post; } });
Object.defineProperty(exports, "postFormData", { enumerable: true, get: function () { return methods_1.postFormData; } });
Object.defineProperty(exports, "setProxy", { enumerable: true, get: function () { return proxy_1.setProxy; } });

export default module.exports;
const __export_client = module.exports.client;
const __export_makeDefaults = module.exports.makeDefaults;
const __export_setProxy = module.exports.setProxy;
const __export_jar = module.exports.jar;
const __export_postFormData = module.exports.postFormData;
const __export_post = module.exports.post;
const __export_get = module.exports.get;
const __export_cleanGet = module.exports.cleanGet;
export { __export_client as client };
export { __export_makeDefaults as makeDefaults };
export { __export_setProxy as setProxy };
export { __export_jar as jar };
export { __export_postFormData as postFormData };
export { __export_post as post };
export { __export_get as get };
export { __export_cleanGet as cleanGet };
