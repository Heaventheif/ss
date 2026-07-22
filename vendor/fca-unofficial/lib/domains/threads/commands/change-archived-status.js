import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as threads_1 from "../../../transport/http/threads.js";
import format from "../../../utils/format/index.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChangeArchivedStatusCommand = createChangeArchivedStatusCommand;
const format_1 = __importDefault(format);
const { formatID } = format_1.default;
function createChangeArchivedStatusCommand(deps) {
    const { defaultFuncs, ctx, logError } = deps;
    return function changeArchivedStatus(threadOrThreads, archive, callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        const threadIDs = Array.isArray(threadOrThreads) ? threadOrThreads : [threadOrThreads];
        const form = {};
        threadIDs.forEach((threadID) => {
            form[`ids[${formatID(String(threadID))}]`] = archive;
        });
        (0, threads_1.changeArchivedStatusViaMercury)({
            defaultFuncs,
            ctx,
            form
        })
            .then((response) => {
            if (response?.error) {
                throw response;
            }
            cb();
        })
            .catch((error) => {
            logError?.("changeArchivedStatus", error);
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createChangeArchivedStatusCommand = module.exports.createChangeArchivedStatusCommand;
export { __export_createChangeArchivedStatusCommand as createChangeArchivedStatusCommand };
