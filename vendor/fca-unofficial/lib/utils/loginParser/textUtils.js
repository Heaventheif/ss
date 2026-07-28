
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanXssi = cleanXssi;
exports.makeParsable = makeParsable;
function cleanXssi(t) {
    if (t == null)
        return "";
    let s = String(t);
    s = s.replace(/^[\uFEFF\xEF\xBB\xBF]+/, "");
    s = s.replace(/^\)\]\}',?\s*/, "");
    s = s.replace(/^\s*for\s*\(;;\);\s*/i, "");
    return s;
}
function makeParsable(html) {
    const raw = cleanXssi(String(html || ""));
    const split = raw.split(/\}\r?\n\s*\{/);
    if (split.length === 1)
        return raw;
    return `[${split.join("},{")}]`;
}

export default module.exports;
const __export_cleanXssi = module.exports.cleanXssi;
const __export_makeParsable = module.exports.makeParsable;
export { __export_cleanXssi as cleanXssi };
export { __export_makeParsable as makeParsable };
