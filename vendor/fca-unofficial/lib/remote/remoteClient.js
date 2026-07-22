import { createRequire } from "node:module";
import package$0 from "../../package.json" with { type: "json" };
import logger from "../func/logger.js";

const require = createRequire(import.meta.url);
const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRemoteClient = createRemoteClient;
const ws_1 = __importDefault(require("ws"));
const package_json_1 = __importDefault(package$0);
const logger_1 = __importDefault(logger);
function createRemoteClient(api, ctx, cfg) {
    if (!cfg || !cfg.enabled || !cfg.url)
        return null;
    const url = String(cfg.url);
    const token = cfg.token ? String(cfg.token) : null;
    const autoReconnect = cfg.autoReconnect !== false;
    const emitter = ctx && ctx._emitter;
    let ws = null;
    let closed = false;
    let reconnectTimer = null;
    function log(message, level = "info") {
        (0, logger_1.default)(`[remote] ${message}`, level);
    }
    function scheduleReconnect() {
        if (!autoReconnect || closed)
            return;
        if (reconnectTimer)
            return;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (!closed)
                connect();
        }, 5000);
    }
    function safeEmit(event, payload) {
        try {
            if (emitter && typeof emitter.emit === "function") {
                emitter.emit(event, payload);
            }
        }
        catch { }
    }
    function connect() {
        try {
            ws = new ws_1.default(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            log(`connect error: ${msg}`, "warn");
            scheduleReconnect();
            return;
        }
        const socket = ws;
        socket.on("open", () => {
            log("connected", "info");
            const payload = {
                type: "hello",
                userID: ctx && ctx.userID,
                region: ctx && ctx.region,
                version: package_json_1.default.version
            };
            try {
                socket.send(JSON.stringify(payload));
            }
            catch { }
            safeEmit("remoteConnected", payload);
        });
        socket.on("message", (data) => {
            let msg;
            try {
                msg = JSON.parse(data.toString());
            }
            catch {
                return;
            }
            if (!msg || typeof msg !== "object")
                return;
            switch (msg.type) {
                case "ping":
                    try {
                        socket.send(JSON.stringify({ type: "pong" }));
                    }
                    catch { }
                    break;
                case "stop":
                    safeEmit("remoteStop", msg);
                    break;
                case "broadcast":
                    safeEmit("remoteBroadcast", msg.payload || {});
                    break;
                default:
                    safeEmit("remoteMessage", msg);
                    break;
            }
        });
        socket.on("close", () => {
            log("disconnected", "warn");
            safeEmit("remoteDisconnected", undefined);
            if (!closed)
                scheduleReconnect();
        });
        socket.on("error", (err) => {
            log(`error: ${err && err.message ? err.message : String(err)}`, "warn");
        });
    }
    connect();
    return {
        close() {
            closed = true;
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            try {
                if (ws && ws.readyState === ws_1.default.OPEN) {
                    ws.close();
                }
            }
            catch { }
        }
    };
}

export default module.exports;
const __export_createRemoteClient = module.exports.createRemoteClient;
export { __export_createRemoteClient as createRemoteClient };
