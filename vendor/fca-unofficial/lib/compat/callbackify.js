
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureNodeCallback = ensureNodeCallback;
function ensureNodeCallback(callback) {
    return typeof callback === "function" ? callback : () => { };
}

export default module.exports;
const __export_ensureNodeCallback = module.exports.ensureNodeCallback;
export { __export_ensureNodeCallback as ensureNodeCallback };
