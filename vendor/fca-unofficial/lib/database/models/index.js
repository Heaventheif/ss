import nodefs from "node:fs";
import nodepath from "node:path";
import * as jsonStore_1 from "../jsonStore.js";
import * as mongoStore_1 from "../mongoStore.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(nodefs);
const node_path_1 = __importDefault(nodepath);
function ensureDatabaseDirectory() {
    const databasePath = node_path_1.default.join(process.cwd(), "Fca_Database");
    if (!node_fs_1.default.existsSync(databasePath)) {
        node_fs_1.default.mkdirSync(databasePath, { recursive: true });
    }
    return databasePath;
}
const USE_MONGO = Boolean(process.env.MONGO_URI);
const models = {};
try {
    let User;
    let Thread;
    let AppStateBackup;
    if (USE_MONGO) {
        User = new mongoStore_1.MongoCollection("fca_users");
        Thread = new mongoStore_1.MongoCollection("fca_threads");
        AppStateBackup = new mongoStore_1.MongoCollection("fca_appstate_backups");
        console.log("[FCA DB] Using MongoDB backend (shared connection from db/index.js)");
    }
    else {
        const databasePath = ensureDatabaseDirectory();
        User = new jsonStore_1.JsonCollection(node_path_1.default.join(databasePath, "users.json"));
        Thread = new jsonStore_1.JsonCollection(node_path_1.default.join(databasePath, "threads.json"));
        AppStateBackup = new jsonStore_1.JsonCollection(node_path_1.default.join(databasePath, "appstate-backups.json"));
        console.log("[FCA DB] MONGO_URI not set — falling back to local JSON store");
    }
    models.User = User;
    models.Thread = Thread;
    models.AppStateBackup = AppStateBackup;
    models.isReady = true;
    models.syncAll = async () => { };
    models.flushAll = () => {
        User.flush();
        Thread.flush();
        AppStateBackup.flush();
    };
    // Safety net: flush any debounced write before the process actually exits
    // (e.g. bot restarts, Ctrl+C) so a pending save is never silently lost.
    const flushOnExit = () => {
        try {
            models.flushAll && models.flushAll();
        }
        catch { }
    };
    process.once("exit", flushOnExit);
    process.once("SIGINT", () => { flushOnExit(); process.exit(0); });
    process.once("SIGTERM", () => { flushOnExit(); process.exit(0); });
}
catch (initError) {
    const msg = initError instanceof Error ? initError.message : String(initError);
    console.error("Database initialization error:", msg);
    models.isReady = false;
    models.syncAll = async () => {
        throw new Error("Database not initialized");
    };
    models.flushAll = () => { };
}
exports.default = models;

export default module.exports;
