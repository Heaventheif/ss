
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.listenMqtt = void 0;
exports.attachMqttCompatibility = attachMqttCompatibility;
const listenMqtt = (ctx, callback) => {
    const api = ctx.api;
    if (!api || typeof api.listenMqtt !== "function") {
        throw new Error("listenMqtt is not available on current context");
    }
    const listener = api.listenMqtt((err, event) => {
        if (err) {
            callback?.({ type: "error", error: err });
            return;
        }
        callback?.(event);
    });
    ctx.mqttClient = ctx.mqttClient || ctx.mqttClient;
    return listener;
};
exports.listenMqtt = listenMqtt;
function attachMqttCompatibility(api, options = {}) {
    const logger = options.logger;
    const refreshIntervalMs = options.refreshIntervalMs || 86400000;
    const log = (message, type = "info") => {
        try {
            if (typeof logger === "function") {
                logger(message, type);
            }
        }
        catch { }
    };
    if (api.listenMqtt && !api.listen) {
        api.listen = api.listenMqtt;
    }
    if (typeof api.refreshFb_dtsg !== "function") {
        return null;
    }
    return setInterval(function () {
        api.refreshFb_dtsg()
            .then(function () {
            log("Successfully refreshed fb_dtsg");
        })
            .catch(function () {
            log("An error occurred while refreshing fb_dtsg", "error");
        });
    }, refreshIntervalMs);
}

export default module.exports;
const __export_listenMqtt = module.exports.listenMqtt;
const __export_attachMqttCompatibility = module.exports.attachMqttCompatibility;
export { __export_listenMqtt as listenMqtt };
export { __export_attachMqttCompatibility as attachMqttCompatibility };
