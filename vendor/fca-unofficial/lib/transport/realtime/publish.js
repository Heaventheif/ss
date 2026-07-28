
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.publishRealtimeMessage = publishRealtimeMessage;
async function publishRealtimeMessage(params) {
    const { client, topic, payload, qos = 1, retain = false } = params;
    if (!client || typeof client.publish !== "function") {
        throw new Error("MQTT client is not initialized");
    }
    await new Promise((resolve, reject) => {
        const body = typeof payload === "string" ? payload : JSON.stringify(payload);
        client.publish(topic, body, { qos, retain }, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

export default module.exports;
const __export_publishRealtimeMessage = module.exports.publishRealtimeMessage;
export { __export_publishRealtimeMessage as publishRealtimeMessage };
