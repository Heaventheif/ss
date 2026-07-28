
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.MessengerContext = void 0;
class MessengerContext {
    constructor(bot, event) {
        this.bot = bot;
        this.event = event;
    }
    get threadID() {
        return this.event.threadID;
    }
    get senderID() {
        return this.event.senderID;
    }
    get messageID() {
        return this.event.messageID;
    }
    /** Nội dung text đã trim (Messenger thường dùng `body`). */
    get text() {
        return (this.event.body ?? "").trim();
    }
    get body() {
        return this.event.body;
    }
    get message() {
        return this.event;
    }
    /**
     * Gửi tin vào đúng thread của sự kiện (callback-style như API legacy).
     */
    reply(payload, callback) {
        const tid = this.event.threadID;
        if (tid == null) {
            throw new Error("MessengerContext.reply: threadID is missing");
        }
        const send = this.bot.api.sendMessage;
        return send.call(this.bot.api, payload, tid, callback);
    }
    /** `reply` nhưng luôn trả về Promise khi `sendMessage` hỗ trợ promise. */
    async replyAsync(payload) {
        const r = this.reply(payload);
        if (r && typeof r.then === "function") {
            return r;
        }
        return Promise.resolve(r);
    }
}
exports.MessengerContext = MessengerContext;

export default module.exports;
const __export_MessengerContext = module.exports.MessengerContext;
export { __export_MessengerContext as MessengerContext };
