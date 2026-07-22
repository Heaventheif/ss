import logger from "../func/logger.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const logger_1 = __importDefault(logger);
function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
async function broadcast(api, threadIDs, message, options) {
    const opts = options || {};
    const delayMs = typeof opts.delayMs === "number" ? opts.delayMs : 1000;
    const skipBlocked = opts.skipBlocked !== false;
    const onResult = typeof opts.onResult === "function" ? opts.onResult : null;
    if (!api || typeof api.sendMessage !== "function") {
        throw new Error("broadcast: api.sendMessage is required.");
    }
    const ids = Array.isArray(threadIDs) ? threadIDs : [threadIDs];
    const results = [];
    for (const id of ids) {
        try {
            const res = await api.sendMessage(message, id);
            const item = { threadID: id, ok: true, res };
            results.push(item);
            if (onResult)
                onResult(null, item);
        }
        catch (e) {
            const msg = e && e.error ? e.error : e && e.message ? e.message : String(e);
            (0, logger_1.default)(`broadcast: failed for ${id}: ${msg}`, "warn");
            const item = { threadID: id, ok: false, error: e };
            results.push(item);
            if (onResult)
                onResult(e, item);
            if (skipBlocked && /permission|blocked|not allowed|cannot send message|not authorized/i.test(msg)) {
                // Skip only this target, continue with others
            }
        }
        if (delayMs > 0) {
            await delay(delayMs);
        }
    }
    return results;
}
module.exports = broadcast;

export default module.exports;
