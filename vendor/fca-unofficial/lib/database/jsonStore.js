import nodefs from "node:fs";
import nodepath from "node:path";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonCollection = void 0;
const node_fs_1 = __importDefault(nodefs);
const node_path_1 = __importDefault(nodepath);
function matches(row, where) {
    if (!where)
        return true;
    return Object.entries(where).every(([key, value]) => row[key] === value);
}
function applyOrder(rows, opts) {
    const order = opts?.order;
    if (!order || !order.length)
        return rows;
    const [field, direction] = order[0];
    const sorted = [...rows].sort((a, b) => {
        const av = a[field];
        const bv = b[field];
        if (av === bv)
            return 0;
        return av > bv ? 1 : -1;
    });
    return direction === "DESC" ? sorted.reverse() : sorted;
}
class JsonCollection {
    constructor(filePath, saveDelayMs = 150) {
        this.rows = [];
        this.nextId = 1;
        this.saveTimer = null;
        this.filePath = filePath;
        this.saveDelayMs = saveDelayMs;
        this.load();
    }
    load() {
        try {
            if (!node_fs_1.default.existsSync(this.filePath))
                return;
            const raw = node_fs_1.default.readFileSync(this.filePath, "utf8");
            if (!raw.trim())
                return;
            const parsed = JSON.parse(raw);
            this.rows = Array.isArray(parsed.rows) ? parsed.rows : [];
            this.nextId =
                typeof parsed.nextId === "number" && Number.isFinite(parsed.nextId)
                    ? parsed.nextId
                    : this.rows.length + 1;
        }
        catch {
            // Corrupt or unreadable file: start clean rather than crashing the bot.
            this.rows = [];
            this.nextId = 1;
        }
    }
    saveSync() {
        try {
            const dir = node_path_1.default.dirname(this.filePath);
            if (!node_fs_1.default.existsSync(dir))
                node_fs_1.default.mkdirSync(dir, { recursive: true });
            const tmpPath = `${this.filePath}.tmp`;
            const payload = JSON.stringify({ nextId: this.nextId, rows: this.rows });
            node_fs_1.default.writeFileSync(tmpPath, payload, "utf8");
            node_fs_1.default.renameSync(tmpPath, this.filePath);
        }
        catch {
            // Best-effort persistence: an I/O failure here should not crash the bot.
        }
    }
    scheduleSave() {
        if (this.saveTimer)
            return;
        this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            this.saveSync();
        }, this.saveDelayMs);
        if (typeof this.saveTimer.unref === "function")
            this.saveTimer.unref();
    }
    /** Force any pending write to disk immediately (e.g. before process exit). */
    flush() {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        this.saveSync();
    }
    wrap(row) {
        return {
            get: () => ({ ...row }),
            update: async (fields) => {
                Object.assign(row, fields, { updatedAt: new Date().toISOString() });
                this.scheduleSave();
                return this.wrap(row);
            },
            destroy: async () => {
                this.rows = this.rows.filter((r) => r !== row);
                this.scheduleSave();
            }
        };
    }
    async findOne(opts = {}) {
        const candidates = applyOrder(this.rows.filter((r) => matches(r, opts.where)), opts);
        const row = candidates[0];
        return row ? this.wrap(row) : null;
    }
    async findAll(opts = {}) {
        const matched = applyOrder(this.rows.filter((r) => matches(r, opts.where)), opts);
        return matched.map((r) => {
            if (opts.attributes && opts.attributes.length) {
                const picked = {};
                for (const key of opts.attributes)
                    picked[key] = r[key];
                return this.wrap(picked);
            }
            return this.wrap(r);
        });
    }
    async create(fields) {
        const now = new Date().toISOString();
        const row = { num: this.nextId++, ...fields, createdAt: now, updatedAt: now };
        this.rows.push(row);
        this.scheduleSave();
        return this.wrap(row);
    }
    async destroy(opts = {}) {
        if (!opts.where || Object.keys(opts.where).length === 0) {
            const count = this.rows.length;
            if (count) {
                this.rows = [];
                this.scheduleSave();
            }
            return count;
        }
        const before = this.rows.length;
        this.rows = this.rows.filter((r) => !matches(r, opts.where));
        const removed = before - this.rows.length;
        if (removed)
            this.scheduleSave();
        return removed;
    }
    /** Kept for API compatibility with the old Sequelize-based call sites; no-op. */
    async sync() {
        return this;
    }
    /**
     * Sequelize-style Model.increment(field, { by, where }).
     * Without this, core/state.js's attachThreadUpdater silently fails on
     * every single incoming message (caught and swallowed) and falls back to
     * Thread.create(), inserting a brand-new row per message forever instead
     * of bumping messageCount on the existing thread row.
     */
    async increment(field, opts = {}) {
        const { by = 1, where } = opts;
        const rows = this.rows.filter((r) => matches(r, where));
        const now = new Date().toISOString();
        for (const row of rows) {
            row[field] = (typeof row[field] === "number" ? row[field] : 0) + by;
            row.updatedAt = now;
        }
        if (rows.length) this.scheduleSave();
        return [rows.length];
    }
}
exports.JsonCollection = JsonCollection;

export default module.exports;
const __export_JsonCollection = module.exports.JsonCollection;
export { __export_JsonCollection as JsonCollection };
