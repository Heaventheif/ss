import * as capability_resolver_1 from "../../../session/capability-resolver.js";
import * as publish_1 from "../../../transport/realtime/publish.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createChangeAdminStatusCommand = createChangeAdminStatusCommand;
function createChangeAdminStatusCommand(deps) {
    const { ctx, generateOfflineThreadingID, logError } = deps;
    return function changeAdminStatus(threadID, adminID, adminStatus) {
        if (typeof threadID !== "string") {
            throw { error: "changeAdminStatus: threadID must be a string" };
        }
        if (typeof adminID !== "string" && !Array.isArray(adminID)) {
            throw { error: "changeAdminStatus: adminID must be a string or an array" };
        }
        if (typeof adminStatus !== "boolean") {
            throw { error: "changeAdminStatus: adminStatus must be true or false" };
        }
        try {
            (0, capability_resolver_1.assertMqttCapability)(ctx);
        }
        catch (error) {
            logError?.("changeAdminStatus", error);
            return Promise.reject(error);
        }
        if (typeof ctx.wsReqNumber !== "number") {
            ctx.wsReqNumber = 0;
        }
        const adminIDs = Array.isArray(adminID) ? adminID : [adminID];
        const tasks = adminIDs.map((id, index) => ({
            failure_count: null,
            label: "25",
            payload: JSON.stringify({
                thread_key: threadID,
                contact_id: id,
                is_admin: adminStatus ? 1 : 0
            }),
            queue_name: "admin_status",
            task_id: index + 1
        }));
        return (0, publish_1.publishRealtimeMessage)({
            client: ctx.mqttClient,
            topic: "/ls_req",
            payload: {
                app_id: "2220391788200892",
                payload: JSON.stringify({
                    epoch_id: generateOfflineThreadingID(),
                    tasks,
                    version_id: "8798795233522156"
                }),
                request_id: ++ctx.wsReqNumber,
                type: 3
            }
        }).catch((error) => {
            logError?.("changeAdminStatus", error);
            throw error;
        });
    };
}

export default module.exports;
const __export_createChangeAdminStatusCommand = module.exports.createChangeAdminStatusCommand;
export { __export_createChangeAdminStatusCommand as createChangeAdminStatusCommand };
