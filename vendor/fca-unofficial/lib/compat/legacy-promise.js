import * as callbackify_1 from "./callbackify.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createLegacyPromise = createLegacyPromise;
function createLegacyPromise(callback, fallbackValue) {
    let resolvePromise = () => { };
    let rejectPromise = () => { };
    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });
    const legacyCallback = (0, callbackify_1.ensureNodeCallback)((error, data) => {
        if (error) {
            rejectPromise(error);
        }
        else {
            resolvePromise((data ?? fallbackValue));
        }
        if (typeof callback === "function") {
            callback(error, data);
        }
    });
    return {
        callback: legacyCallback,
        promise
    };
}

export default module.exports;
const __export_createLegacyPromise = module.exports.createLegacyPromise;
export { __export_createLegacyPromise as createLegacyPromise };
