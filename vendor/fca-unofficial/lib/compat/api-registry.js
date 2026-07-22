import * as create_client_1 from "../app/create-client.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.attachClientFacade = attachClientFacade;
function attachNamespace(api, key, value) {
    if (typeof value === "undefined") {
        return;
    }
    if (typeof api[key] === "undefined") {
        api[key] = value;
    }
}
function attachClientFacade(api, namespaces) {
    const client = namespaces
        ? (0, create_client_1.createFcaClientFromNamespaces)(api, namespaces)
        : (0, create_client_1.createFcaClient)(api);
    api.client = client;
    attachNamespace(api, "messages", client.messages);
    attachNamespace(api, "threads", client.threads);
    attachNamespace(api, "users", client.users);
    attachNamespace(api, "account", client.account);
    attachNamespace(api, "realtime", client.realtime);
    attachNamespace(api, "http", client.http);
    attachNamespace(api, "scheduler", client.scheduler);
    return client;
}
exports.default = attachClientFacade;

export default module.exports;
const __export_attachClientFacade = module.exports.attachClientFacade;
export { __export_attachClientFacade as attachClientFacade };
