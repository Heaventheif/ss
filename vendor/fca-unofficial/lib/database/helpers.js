
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_NOT_INIT = void 0;
exports.validateId = validateId;
exports.validateData = validateData;
exports.normalizeAttributes = normalizeAttributes;
exports.normalizePayload = normalizePayload;
exports.wrapError = wrapError;
exports.DB_NOT_INIT = "Database not initialized";
function validateId(value, fieldName = "id") {
    if (value == null) {
        throw new Error(`${fieldName} is required and cannot be undefined`);
    }
    if (typeof value !== "string" && typeof value !== "number") {
        throw new Error(`Invalid ${fieldName}: must be a string or number`);
    }
    return String(value);
}
function validateData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Invalid data: must be a non-empty object");
    }
}
function normalizeAttributes(keys) {
    if (keys == null)
        return undefined;
    return typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : undefined;
}
function normalizePayload(data, key = "data") {
    return Object.prototype.hasOwnProperty.call(data, key)
        ? data
        : { [key]: data };
}
function wrapError(message, cause) {
    const c = cause;
    return new Error(`${message}: ${c && c.message ? c.message : cause}`);
}

export default module.exports;
const __export_DB_NOT_INIT = module.exports.DB_NOT_INIT;
const __export_validateId = module.exports.validateId;
const __export_validateData = module.exports.validateData;
const __export_normalizeAttributes = module.exports.normalizeAttributes;
const __export_normalizePayload = module.exports.normalizePayload;
const __export_wrapError = module.exports.wrapError;
export { __export_DB_NOT_INIT as DB_NOT_INIT };
export { __export_validateId as validateId };
export { __export_validateData as validateData };
export { __export_normalizeAttributes as normalizeAttributes };
export { __export_normalizePayload as normalizePayload };
export { __export_wrapError as wrapError };
