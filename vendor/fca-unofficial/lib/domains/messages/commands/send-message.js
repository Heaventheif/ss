import * as callbackify_1 from "../../../compat/callbackify.js";
import * as ls_requests_1 from "../../../transport/realtime/ls-requests.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createSendMessageCommand = createSendMessageCommand;
const EMOJI_SIZES = {
    small: 1,
    medium: 2,
    large: 3
};
function toEmojiSize(size) {
    if (typeof size === "number" && !Number.isNaN(size)) {
        return Math.min(3, Math.max(1, size));
    }
    if (typeof size === "string" && size in EMOJI_SIZES) {
        return EMOJI_SIZES[size];
    }
    return 1;
}
function hasLinks(text) {
    return /(https?:\/\/|www\.|t\.me\/|fb\.me\/|youtu\.be\/|facebook\.com\/|youtube\.com\/)/i.test(text);
}
function extractIdsFromPayload(payload) {
    let messageID = null;
    let threadID = null;
    function walk(node) {
        if (!Array.isArray(node)) return;
        if (node[0] === 5 && (node[1] === "replaceOptimsiticMessage" || node[1] === "replaceOptimisticMessage")) {
            messageID = String(node[3]);
        }
        if (node[0] === 5 && node[1] === "writeCTAIdToThreadsTable") {
            const candidate = node[2];
            if (Array.isArray(candidate) && candidate[0] === 19) {
                threadID = String(candidate[1]);
            }
        }
        for (const child of node) walk(child);
    }
    walk(payload?.step);
    return { threadID, messageID };
}
function buildMentionData(msg, baseBody) {
    if (!Array.isArray(msg.mentions) || msg.mentions.length === 0) return null;
    const ids = [];
    const offsets = [];
    const lengths = [];
    const types = [];
    let cursor = 0;
    for (const mention of msg.mentions) {
        const rawTag = String(mention.tag || "");
        const displayName = rawTag.replace(/^@+/, "");
        const start = Number.isInteger(mention.fromIndex) ? mention.fromIndex : cursor;
        let index = baseBody.indexOf(rawTag, start);
        let adjustment = 0;
        if (index === -1) {
            index = baseBody.indexOf(displayName, start);
        } else {
            adjustment = rawTag.length - displayName.length;
        }
        if (index < 0) {
            index = 0;
            adjustment = 0;
        }
        const offset = index + adjustment;
        ids.push(String(mention.id || 0));
        offsets.push(offset);
        lengths.push(displayName.length);
        types.push("p");
        cursor = offset + displayName.length;
    }
    return {
        mention_ids: ids.join(","),
        mention_offsets: offsets.join(","),
        mention_lengths: lengths.join(","),
        mention_types: types.join(",")
    };
}
function coercePayload(input) {
    if (input == null) return { body: "" };
    if (typeof input === "string") return { body: input };
    if (typeof input === "object") return input;
    return { body: String(input) };
}
function isPreUploadedAttachmentTuple(value) {
    return (Array.isArray(value) &&
        value.length >= 2 &&
        typeof value[0] === "string" &&
        (typeof value[1] === "string" || typeof value[1] === "number"));
}
function createSendMessageCommand(deps) {
    const { ctx, uploadAttachment, generateOfflineThreadingID, isReadableStream, logError } = deps;
    return async function sendMessage(msg, threadID, callback, replyToMessage) {
        if (typeof threadID === "function") {
            return threadID({ error: "Pass a threadID as a second argument." });
        }
        let cb = typeof callback === "function" ? callback : (0, callbackify_1.ensureNodeCallback)();
        let explicitReplyTo = replyToMessage;
        if (typeof callback === "string" && !explicitReplyTo) {
            explicitReplyTo = callback;
            cb = (0, callbackify_1.ensureNodeCallback)();
        }
        if (!threadID) {
            const error = { error: "threadID is required" };
            cb(error);
            throw error;
        }
        const normalized = coercePayload(msg);
        const payloadReplyTo = normalized.replyToMessage;
        const effectiveReplyTo = explicitReplyTo || payloadReplyTo;
        const bodyValue = "body" in normalized ? normalized.body : undefined;
        const baseBody = bodyValue != null ? String(bodyValue) : "";
        const stickerValue = "sticker" in normalized ? normalized.sticker : undefined;
        const emojiValue = "emoji" in normalized ? normalized.emoji : undefined;
        const emojiSizeValue = "emojiSize" in normalized ? normalized.emojiSize : undefined;
        const locationValue = "location" in normalized ? normalized.location : undefined;
        const attachmentValue = "attachment" in normalized ? normalized.attachment : undefined;
        const forwardAttachmentIdsValue = "forwardAttachmentIds" in normalized ? normalized.forwardAttachmentIds : undefined;

        // ========== تأخير عشوائي لتجنب الكشف ==========
        if (ctx?.antiDetection?.enabled) {
            const min = ctx.antiDetection.requestDelayMin || 0;
            const max = ctx.antiDetection.requestDelayMax || 0;
            if (min > 0 && max > 0) {
                const delayMs = Math.floor(Math.random() * (max - min + 1)) + min;
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        // =============================================

        const requestId = Math.floor(100 + Math.random() * 900);
        const epoch = (BigInt(Date.now()) << 22n).toString();
        const payload0 = {
            thread_id: String(threadID),
            otid: generateOfflineThreadingID(),
            source: 2097153,
            send_type: 1,
            sync_group: 1,
            mark_thread_read: 1,
            text: baseBody === "" ? null : baseBody,
            initiating_source: 0,
            skip_url_preview_gen: 0,
            text_has_links: hasLinks(baseBody) ? 1 : 0,
            multitab_env: 0,
            metadata_dataclass: JSON.stringify({ media_accessibility_metadata: { alt_text: null } })
        };
        const mentionData = buildMentionData(normalized, baseBody);
        if (mentionData) payload0.mention_data = mentionData;
        if (stickerValue) {
            payload0.send_type = 2;
            payload0.sticker_id = stickerValue;
        }
        if (emojiValue) {
            payload0.send_type = 1;
            payload0.text = emojiValue;
            payload0.hot_emoji_size = toEmojiSize(emojiSizeValue);
        }
        if (locationValue && locationValue.latitude != null && locationValue.longitude != null) {
            payload0.send_type = 1;
            payload0.location_data = {
                coordinates: { latitude: locationValue.latitude, longitude: locationValue.longitude },
                is_current_location: Boolean(locationValue.current),
                is_live_location: Boolean(locationValue.live)
            };
        }
        if (effectiveReplyTo) {
            payload0.reply_metadata = {
                reply_source_id: effectiveReplyTo,
                reply_source_type: 1,
                reply_type: 0
            };
        }
        if (attachmentValue) {
            payload0.send_type = 3;
            if (payload0.text === "") payload0.text = null;
            payload0.attachment_fbids = [];
            const list = Array.isArray(attachmentValue) && !isPreUploadedAttachmentTuple(attachmentValue)
                ? attachmentValue
                : [attachmentValue];
            const idsFromPairs = [];
            const uploadInputs = [];
            for (const item of list) {
                if (isPreUploadedAttachmentTuple(item)) {
                    idsFromPairs.push(String(item[1]));
                    continue;
                }
                if (Buffer.isBuffer(item) || isReadableStream(item)) {
                    uploadInputs.push(item);
                }
            }
            if (idsFromPairs.length) payload0.attachment_fbids.push(...idsFromPairs);
            if (Array.isArray(forwardAttachmentIdsValue) && forwardAttachmentIdsValue.length > 0) {
                payload0.attachment_fbids.push(...forwardAttachmentIdsValue.map(String));
            }
            if (uploadInputs.length) {
                try {
                    const uploaded = await uploadAttachment(uploadInputs);
                    for (const file of uploaded) {
                        const key = Object.keys(file)[0];
                        payload0.attachment_fbids.push(String(file[key]));
                    }
                } catch (error) {
                    logError?.("uploadAttachment", error);
                    cb(error);
                    throw error;
                }
            }
        }
        const content = {
            app_id: "2220391788200892",
            payload: {
                tasks: [
                    {
                        label: "46",
                        payload: payload0,
                        queue_name: String(threadID),
                        task_id: 400,
                        failure_count: null
                    },
                    {
                        label: "21",
                        payload: { thread_id: String(threadID), last_read_watermark_ts: Date.now(), sync_group: 1 },
                        queue_name: String(threadID),
                        task_id: 401,
                        failure_count: null
                    }
                ],
                epoch_id: epoch,
                version_id: "24804310205905615",
                data_trace_id: `#${Buffer.from(String(Math.random())).toString("base64").replace(/=+$/g, "")}`
            },
            request_id: requestId,
            type: 3
        };
        content.payload.tasks = content.payload.tasks.map((task) => ({
            ...task,
            payload: JSON.stringify(task.payload)
        }));
        content.payload = JSON.stringify(content.payload);
        try {
            const result = await (0, ls_requests_1.publishLsRequestWithAck)({
                client: ctx.mqttClient || null,
                content,
                requestId,
                extract: (message) => {
                    const { threadID: ackThreadID, messageID } = extractIdsFromPayload(message.payload);
                    return { body: baseBody || null, messageID, threadID: ackThreadID };
                }
            });
            cb(undefined, result);
            return result;
        } catch (error) {
            logError?.("sendMessage", error);
            cb(error);
            throw error;
        }
    };
}

export default module.exports;
const __export_createSendMessageCommand = module.exports.createSendMessageCommand;
export { __export_createSendMessageCommand as createSendMessageCommand };
