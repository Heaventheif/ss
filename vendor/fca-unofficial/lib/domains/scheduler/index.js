
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createSchedulerDomain = createSchedulerDomain;
function toTimestamp(when) {
    if (when instanceof Date) {
        return when.getTime();
    }
    if (typeof when === "number") {
        return when;
    }
    if (typeof when === "string") {
        return new Date(when).getTime();
    }
    return Number.NaN;
}
function createSchedulerDomain(deps) {
    const { sendMessage, logger = () => { }, now = () => Date.now(), setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout, setIntervalFn = setInterval, clearIntervalFn = clearInterval } = deps;
    const scheduledMessages = new Map();
    let nextId = 1;
    function scheduleMessage(message, threadID, when, options = {}) {
        const timestamp = toTimestamp(when);
        if (Number.isNaN(timestamp)) {
            throw new Error("Invalid 'when' parameter. Must be Date, number (timestamp), or ISO string");
        }
        const currentTime = now();
        if (timestamp <= currentTime) {
            throw new Error("Scheduled time must be in the future");
        }
        const id = `scheduled_${nextId++}_${currentTime}`;
        const delay = timestamp - currentTime;
        const scheduled = {
            id,
            message,
            threadID,
            timestamp,
            createdAt: currentTime,
            options: {
                replyMessageID: options.replyMessageID,
                isGroup: options.isGroup,
                callback: options.callback
            },
            cancelled: false,
            timeout: undefined
        };
        scheduled.timeout = setTimeoutFn(() => {
            if (scheduled.cancelled) {
                return;
            }
            logger(`Sending scheduled message ${id}`, "info");
            Promise.resolve(sendMessage(message, threadID, scheduled.options.callback || (() => { }), scheduled.options.replyMessageID, scheduled.options.isGroup))
                .then(() => {
                logger(`Scheduled message ${id} sent successfully`, "info");
                scheduledMessages.delete(id);
            })
                .catch((error) => {
                logger(`Error sending scheduled message ${id}: ${error?.message || String(error)}`, "error");
                scheduledMessages.delete(id);
            });
        }, delay);
        scheduledMessages.set(id, scheduled);
        logger(`Message scheduled: ${id} (in ${Math.round(delay / 1000)}s)`, "info");
        return id;
    }
    function cancelScheduledMessage(id) {
        const scheduled = scheduledMessages.get(id);
        if (!scheduled || scheduled.cancelled) {
            return false;
        }
        clearTimeoutFn(scheduled.timeout);
        scheduled.cancelled = true;
        scheduledMessages.delete(id);
        logger(`Scheduled message ${id} cancelled`, "info");
        return true;
    }
    function getScheduledMessage(id) {
        const scheduled = scheduledMessages.get(id);
        if (!scheduled || scheduled.cancelled) {
            return null;
        }
        return {
            id: scheduled.id,
            message: scheduled.message,
            threadID: scheduled.threadID,
            timestamp: scheduled.timestamp,
            createdAt: scheduled.createdAt,
            options: { ...scheduled.options },
            timeUntilSend: scheduled.timestamp - now()
        };
    }
    function listScheduledMessages() {
        const currentTime = now();
        const list = Array.from(scheduledMessages.values())
            .filter((scheduled) => !scheduled.cancelled)
            .map((scheduled) => ({
            id: scheduled.id,
            message: scheduled.message,
            threadID: scheduled.threadID,
            timestamp: scheduled.timestamp,
            createdAt: scheduled.createdAt,
            options: { ...scheduled.options },
            timeUntilSend: scheduled.timestamp - currentTime
        }));
        return list.sort((a, b) => a.timestamp - b.timestamp);
    }
    function cancelAllScheduledMessages() {
        let count = 0;
        for (const id of scheduledMessages.keys()) {
            if (cancelScheduledMessage(id)) {
                count += 1;
            }
        }
        logger(`Cancelled ${count} scheduled messages`, "info");
        return count;
    }
    function getScheduledCount() {
        return scheduledMessages.size;
    }
    function cleanup() {
        const currentTime = now();
        let cleaned = 0;
        for (const [id, scheduled] of scheduledMessages.entries()) {
            if (scheduled.cancelled || scheduled.timestamp < currentTime) {
                scheduledMessages.delete(id);
                cleaned += 1;
            }
        }
        if (cleaned > 0) {
            logger(`Cleaned up ${cleaned} scheduled messages`, "info");
        }
    }
    const cleanupInterval = setIntervalFn(cleanup, 5 * 60 * 1000);
    function destroy() {
        clearIntervalFn(cleanupInterval);
        const count = cancelAllScheduledMessages();
        logger("Scheduler destroyed and all resources cleaned up", "info");
        return count;
    }
    return {
        scheduleMessage,
        cancelScheduledMessage,
        getScheduledMessage,
        listScheduledMessages,
        cancelAllScheduledMessages,
        getScheduledCount,
        cleanup,
        destroy,
        _cleanupInterval: cleanupInterval
    };
}

export default module.exports;
const __export_createSchedulerDomain = module.exports.createSchedulerDomain;
export { __export_createSchedulerDomain as createSchedulerDomain };
