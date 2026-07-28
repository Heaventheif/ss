import node_events_1 from "node:events";
import auth_1 from "../core/auth.js";
import * as create_client_1 from "./create-client.js";
import * as messenger_context_1 from "./messenger-context.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.MessengerBot = void 0;
exports.createMessengerBot = createMessengerBot;
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function emitIf(bot, channel, payload) {
    if (bot.listenerCount(channel) > 0) {
        bot.emit(channel, payload);
    }
}
function emitGatewayEvents(bot, event) {
    emitIf(bot, "update", event);
    emitIf(bot, "raw", event);
    const t = event.type;
    if (!t) {
        return;
    }
    if (t === "message" || t === "message_reply") {
        emitIf(bot, "message", event);
        emitIf(bot, "messageCreate", event);
    }
    if (t === "message_reply") {
        emitIf(bot, "message_reply", event);
    }
    else if (t !== "message") {
        emitIf(bot, t, event);
    }
    switch (t) {
        case "message_reaction":
            emitIf(bot, "messageReactionAdd", event);
            break;
        case "message_unsend":
            emitIf(bot, "messageDelete", event);
            break;
        case "typ": {
            const te = event;
            emitIf(bot, te.isTyping ? "typingStart" : "typingStop", event);
            break;
        }
        case "event":
            emitIf(bot, "threadUpdate", event);
            break;
        case "ready":
            emitIf(bot, "ready", event);
            emitIf(bot, "shardReady", event);
            break;
        default:
            break;
    }
}
class MessengerBot extends node_events_1.EventEmitter {
    constructor(ctx, runtime) {
        super();
        this._facade = null;
        this._mqtt = null;
        this._listening = false;
        this._middlewares = [];
        this._signalsBound = false;
        const cap = runtime.maxEventListeners;
        this.setMaxListeners(cap === 0 ? 0 : cap);
        this.ctx = ctx;
        this.api = ctx.api;
        this._enableComposer = runtime.enableComposer;
        this._commandPrefix = runtime.commandPrefix;
        this._stopOnSignals = runtime.stopOnSignals;
    }
    get commandPrefix() {
        return this._commandPrefix;
    }
    set commandPrefix(value) {
        this._commandPrefix = value || "/";
    }
    get client() {
        if (!this._facade) {
            this._facade = (0, create_client_1.createFcaClient)(this.api);
        }
        return this._facade;
    }
    /**
     * Middleware toàn cục (Telegraf-style). Gọi `next()` để chuyển sang lớp sau.
     */
    use(middleware) {
        this._middlewares.push(middleware);
        return this;
    }
    /**
     * Khớp `/{name}` hoặc `{prefix}{name}` ở đầu nội dung (không phân biệt hoa thường tên lệnh).
     */
    command(name, handler) {
        const n = name.toLowerCase();
        this.use(async (ctx, next) => {
            const text = ctx.text;
            if (!text) {
                await next();
                return;
            }
            const prefix = escapeRegex(this._commandPrefix);
            const re = new RegExp(`^${prefix}${escapeRegex(n)}(?:\\s|$)`, "i");
            if (re.test(text)) {
                await handler(ctx);
                return;
            }
            await next();
        });
        return this;
    }
    /**
     * Chuỗi khớp toàn bộ text (RegExp) hoặc chứa substring (string).
     */
    hears(trigger, handler) {
        const match = typeof trigger === "string"
            ? (text) => text.toLowerCase().includes(trigger.toLowerCase())
            : (text) => trigger.test(text);
        this.use(async (ctx, next) => {
            const text = ctx.text;
            if (!text) {
                await next();
                return;
            }
            if (match(text)) {
                await handler(ctx);
                return;
            }
            await next();
        });
        return this;
    }
    /**
     * Bắt lỗi ném ra trong composer (middleware / command / hears).
     */
    catch(handler) {
        this._catchHandler = handler;
        return this;
    }
    /** Bắt đầu MQTT (idempotent). */
    startListening() {
        if (this._listening) {
            return this;
        }
        const listen = this.api.listenMqtt;
        if (typeof listen !== "function") {
            throw new Error("listenMqtt is not available on API");
        }
        const mqtt = listen.call(this.api);
        this._mqtt = mqtt;
        this._listening = true;
        mqtt.on("message", (event) => {
            emitGatewayEvents(this, event);
            this.enqueueComposerIfNeeded(event);
        });
        mqtt.on("error", (err) => {
            this.emit("error", err);
        });
        return this;
    }
    /**
     * `startListening` + tùy chọn gắn SIGINT/SIGTERM (Telegraf `launch` gần tương đương).
     */
    async launch(opts) {
        this.startListening();
        const bind = opts?.stopOnSignals ?? this._stopOnSignals;
        if (bind) {
            this.attachStopSignals();
        }
        return this;
    }
    attachStopSignals() {
        if (this._signalsBound) {
            return;
        }
        this._signalsBound = true;
        this._onStopSignal = () => {
            void this.stop()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
        };
        process.once("SIGINT", this._onStopSignal);
        process.once("SIGTERM", this._onStopSignal);
    }
    /** Gỡ handler SIGINT/SIGTERM để process không giữ reference bot (tối ưu RAM khi stop sớm). */
    detachStopSignals() {
        if (!this._signalsBound || !this._onStopSignal) {
            return;
        }
        process.off("SIGINT", this._onStopSignal);
        process.off("SIGTERM", this._onStopSignal);
        this._signalsBound = false;
        this._onStopSignal = undefined;
    }
    async stop() {
        this.detachStopSignals();
        if (!this._mqtt) {
            return;
        }
        const mqtt = this._mqtt;
        const asyncStop = mqtt.stopListeningAsync;
        if (typeof asyncStop === "function") {
            await asyncStop();
        }
        else {
            mqtt.stopListening?.();
        }
        mqtt.removeAllListeners?.();
        this._mqtt = null;
        this._listening = false;
    }
    enqueueComposerIfNeeded(event) {
        if (!this._enableComposer || this._middlewares.length === 0) {
            return;
        }
        if (event.type !== "message" && event.type !== "message_reply") {
            return;
        }
        const ctx = new messenger_context_1.MessengerContext(this, event);
        queueMicrotask(() => {
            void this.runComposer(ctx);
        });
    }
    async runComposer(ctx) {
        const dispatch = async (index) => {
            if (index >= this._middlewares.length) {
                return;
            }
            const mw = this._middlewares[index];
            await mw(ctx, () => dispatch(index + 1));
        };
        try {
            await dispatch(0);
        }
        catch (err) {
            if (this._catchHandler) {
                this._catchHandler(err, ctx);
            }
            else {
                this.emit("error", err);
            }
        }
    }
    static async connect(credentials, options) {
        const { autoListen = true, enableComposer = true, commandPrefix = "/", stopOnSignals = false, maxEventListeners = 64, ...fcaOptions } = options ?? {};
        const ctx = await (0, auth_1.login)(credentials, fcaOptions);
        const bot = new MessengerBot(ctx, {
            enableComposer,
            commandPrefix,
            stopOnSignals,
            maxEventListeners
        });
        if (autoListen) {
            await bot.launch({ stopOnSignals });
        }
        else if (stopOnSignals) {
            bot.attachStopSignals();
        }
        return bot;
    }
}
exports.MessengerBot = MessengerBot;
function createMessengerBot(credentials, options) {
    return MessengerBot.connect(credentials, options);
}

export default module.exports;
const __export_MessengerBot = module.exports.MessengerBot;
const __export_createMessengerBot = module.exports.createMessengerBot;
export { __export_MessengerBot as MessengerBot };
export { __export_createMessengerBot as createMessengerBot };
