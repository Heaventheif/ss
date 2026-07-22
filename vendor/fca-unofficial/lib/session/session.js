
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.getPageID = getPageID;
exports.getMqttClient = getMqttClient;
exports.hasMqttClient = hasMqttClient;
exports.createSessionView = createSessionView;
function getPageID(ctx) {
    const raw = ctx.globalOptions?.pageID ?? ctx.options?.pageID;
    if (raw === undefined || raw === null || raw === "") {
        return undefined;
    }
    return String(raw);
}
function getMqttClient(ctx) {
    const client = ctx.mqttClient;
    if (!client || typeof client.publish !== "function") {
        return null;
    }
    return client;
}
function hasMqttClient(ctx) {
    return Boolean(getMqttClient(ctx));
}
function createSessionView(ctx) {
    return {
        ctx,
        options: ctx.globalOptions || ctx.options,
        jar: ctx.jar,
        userID: ctx.userID || ctx.fbid,
        pageID: getPageID(ctx),
        mqttClient: getMqttClient(ctx)
    };
}

export default module.exports;
const __export_getPageID = module.exports.getPageID;
const __export_getMqttClient = module.exports.getMqttClient;
const __export_hasMqttClient = module.exports.hasMqttClient;
const __export_createSessionView = module.exports.createSessionView;
export { __export_getPageID as getPageID };
export { __export_getMqttClient as getMqttClient };
export { __export_hasMqttClient as hasMqttClient };
export { __export_createSessionView as createSessionView };
