import models from "./models/index.js";
import * as helpers_1 from "./helpers.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createThreadData;
const models_1 = __importDefault(models);
const Thread = models_1.default.Thread;
const ID_FIELD = "threadID";
function createThreadData(_bot) {
    return {
        async create(threadID, data) {
            if (!Thread) {
                return { thread: { threadID: (0, helpers_1.validateId)(threadID, ID_FIELD), ...(data || {}) }, created: true };
            }
            try {
                const tid = (0, helpers_1.validateId)(threadID, ID_FIELD);
                let thread = await Thread.findOne({ where: { threadID: tid } });
                if (thread)
                    return { thread: thread.get(), created: false };
                thread = await Thread.create({ threadID: tid, ...(data || {}) });
                return { thread: thread.get(), created: true };
            }
            catch (err) {
                throw (0, helpers_1.wrapError)("Failed to create thread", err);
            }
        },
        async get(threadID) {
            if (!Thread)
                return null;
            try {
                const tid = (0, helpers_1.validateId)(threadID, ID_FIELD);
                const thread = await Thread.findOne({ where: { threadID: tid } });
                return thread ? thread.get() : null;
            }
            catch (err) {
                throw (0, helpers_1.wrapError)("Failed to get thread", err);
            }
        },
        async update(threadID, data) {
            if (!Thread) {
                return { thread: { threadID: (0, helpers_1.validateId)(threadID, ID_FIELD), ...(data || {}) }, created: false };
            }
            try {
                const tid = (0, helpers_1.validateId)(threadID, ID_FIELD);
                (0, helpers_1.validateData)(data);
                const thread = await Thread.findOne({ where: { threadID: tid } });
                if (thread) {
                    await thread.update(data);
                    return { thread: thread.get(), created: false };
                }
                const newThread = await Thread.create({ ...data, threadID: tid });
                return { thread: newThread.get(), created: true };
            }
            catch (err) {
                throw (0, helpers_1.wrapError)("Failed to update thread", err);
            }
        },
        async del(threadID) {
            if (!Thread)
                throw new Error(helpers_1.DB_NOT_INIT);
            try {
                const tid = (0, helpers_1.validateId)(threadID, ID_FIELD);
                const result = await Thread.destroy({ where: { threadID: tid } });
                if (result === 0)
                    throw new Error("No thread found with the specified threadID");
                return result;
            }
            catch (err) {
                throw (0, helpers_1.wrapError)("Failed to delete thread", err);
            }
        },
        async delAll() {
            if (!Thread)
                return 0;
            try {
                return await Thread.destroy({ where: {} });
            }
            catch (err) {
                throw (0, helpers_1.wrapError)("Failed to delete all threads", err);
            }
        },
        async getAll(keys = null) {
            if (!Thread)
                return [];
            try {
                const attributes = (0, helpers_1.normalizeAttributes)(keys);
                const rows = await Thread.findAll({ attributes });
                return rows.map((t) => t.get());
            }
            catch (err) {
                throw (0, helpers_1.wrapError)("Failed to get all threads", err);
            }
        }
    };
}

export default module.exports;
