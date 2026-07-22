
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.publishLsRequestWithAck = publishLsRequestWithAck;
async function publishLsRequestWithAck(params) {
    const { client, content, requestId, topic = "/ls_req", responseTopic = "/ls_resp", timeoutMs = 15000, extract } = params;
    if (!client ||
        typeof client.on !== "function" ||
        typeof client.publish !== "function" ||
        typeof client.removeListener !== "function") {
        throw new Error("MQTT client is not initialized");
    }
    if (typeof client.setMaxListeners === "function") {
        client.setMaxListeners(0);
    }
    return new Promise((resolve, reject) => {
        let settled = false;
        let timer;
        const cleanup = () => {
            if (timer) {
                clearTimeout(timer);
            }
            client.removeListener("message", onMessage);
        };
        const settle = (handler) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            handler();
        };
        const onMessage = (incomingTopic, rawMessage) => {
            if (incomingTopic !== responseTopic) {
                return;
            }
            let parsed;
            try {
                parsed = JSON.parse(rawMessage.toString());
                if (typeof parsed.payload === "string") {
                    parsed.payload = JSON.parse(parsed.payload);
                }
            }
            catch {
                return;
            }
            if (parsed.request_id !== requestId) {
                return;
            }
            settle(() => {
                try {
                    resolve(extract(parsed));
                }
                catch (error) {
                    reject(error);
                }
            });
        };
        client.on("message", onMessage);
        client.publish(topic, JSON.stringify(content), { qos: 1, retain: false }, (err) => {
            if (err) {
                settle(() => reject(err));
            }
        });
        timer = setTimeout(() => {
            settle(() => reject({ error: "Timeout waiting for ACK" }));
        }, timeoutMs);
    });
}

export default module.exports;
const __export_publishLsRequestWithAck = module.exports.publishLsRequestWithAck;
export { __export_publishLsRequestWithAck as publishLsRequestWithAck };
