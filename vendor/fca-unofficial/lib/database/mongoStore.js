
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoCollection = void 0;
function waitForHostConnection(timeoutMs = 20000, intervalMs = 100) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        (function poll() {
            if (global.db && global.db.connection && global.db.connection.readyState === 1) {
                resolve(global.db.connection.db); // native Db instance behind mongoose
                return;
            }
            if (Date.now() - start > timeoutMs) {
                reject(new Error("[FCA DB] Timed out waiting for the host bot's MongoDB connection " +
                    "(global.db, set by connectDB() in db/index.js). Make sure MONGO_URI is set " +
                    "and connectDB() is awaited before the bot logs in."));
                return;
            }
            setTimeout(poll, intervalMs);
        })();
    });
}
class MongoCollection {
    constructor(collectionName) {
        this.collectionName = collectionName;
        this.collection = null;
        this._initPromise = null;
    }

    async _col() {
        if (this.collection) return this.collection;
        // Cache the in-flight init so concurrent callers (e.g. several messages
        // arriving before the host connection is ready) share one wait/createIndex
        // instead of each starting their own poll loop.
        if (!this._initPromise) {
            this._initPromise = (async () => {
                const db = await waitForHostConnection();
                const col = db.collection(this.collectionName);
                try {
                    if (this.collectionName === "fca_users") {
                        await col.createIndex({ userID: 1 }, { unique: true, sparse: true });
                    }
                    else if (this.collectionName === "fca_threads") {
                        await col.createIndex({ threadID: 1 }, { unique: true, sparse: true });
                    }
                    else {
                        await col.createIndex({ userID: 1, type: 1 }, { sparse: true });
                    }
                }
                catch {
                    // Non-fatal: missing index just means slower queries, not broken ones.
                }
                this.collection = col;
                return col;
            })();
        }
        return this._initPromise;
    }

    wrap(doc) {
        return {
            get: () => ({ ...doc }),
            update: async (fields) => {
                const col = await this._col();
                const updatedAt = new Date().toISOString();
                await col.updateOne({ _id: doc._id }, { $set: { ...fields, updatedAt } });
                Object.assign(doc, fields, { updatedAt });
                return this.wrap(doc);
            },
            destroy: async () => {
                const col = await this._col();
                await col.deleteOne({ _id: doc._id });
            },
        };
    }

    async findOne(opts = {}) {
        const col = await this._col();
        let cursor = col.find(opts.where || {});
        if (opts.order && opts.order.length) {
            const [field, direction] = opts.order[0];
            cursor = cursor.sort({ [field]: direction === "DESC" ? -1 : 1 });
        }
        const doc = await cursor.limit(1).next();
        return doc ? this.wrap(doc) : null;
    }

    async findAll(opts = {}) {
        const col = await this._col();
        let cursor = col.find(opts.where || {});
        if (opts.order && opts.order.length) {
            const [field, direction] = opts.order[0];
            cursor = cursor.sort({ [field]: direction === "DESC" ? -1 : 1 });
        }
        if (opts.attributes && opts.attributes.length) {
            const projection = {};
            for (const key of opts.attributes) projection[key] = 1;
            cursor = cursor.project(projection);
        }
        const docs = await cursor.toArray();
        return docs.map((d) => this.wrap(d));
    }

    async create(fields) {
        const col = await this._col();
        const now = new Date().toISOString();
        const doc = { ...fields, createdAt: now, updatedAt: now };
        const result = await col.insertOne(doc);
        doc._id = result.insertedId;
        return this.wrap(doc);
    }

    async destroy(opts = {}) {
        const col = await this._col();
        const where = opts.where || {};
        const result = await col.deleteMany(where);
        return result.deletedCount || 0;
    }

    /**
     * Sequelize-style Model.increment(field, { by, where }), atomic via $inc.
     * Required by core/state.js's attachThreadUpdater (bumps messageCount on
     * every incoming message) — without it that call silently fails and
     * falls back to inserting a brand-new thread row per message.
     */
    async increment(field, opts = {}) {
        const { by = 1, where } = opts;
        const col = await this._col();
        const updatedAt = new Date().toISOString();
        const result = await col.updateMany(where || {}, { $inc: { [field]: by }, $set: { updatedAt } });
        return [result.modifiedCount || 0];
    }

    /** Kept for API compatibility with JsonCollection: writes go straight to the
     *  shared connection, and the host bot (db/index.js) owns closing it. */
    flush() {}
}
exports.MongoCollection = MongoCollection;

export default module.exports;
const __export_MongoCollection = module.exports.MongoCollection;
export { __export_MongoCollection as MongoCollection };
