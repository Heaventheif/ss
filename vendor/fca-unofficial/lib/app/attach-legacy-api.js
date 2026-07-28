import { createRequire } from "node:module";
import * as account_1 from "../domains/account/index.js";
import * as http_1 from "../domains/http/index.js";
import * as messages_1 from "../domains/messages/index.js";
import * as upload_attachment_1 from "../domains/messages/commands/upload-attachment.js";
import * as listener_1 from "../domains/realtime/listener.js";
import middleware_1 from "../domains/realtime/middleware.js";
import * as scheduler_1 from "../domains/scheduler/index.js";
import * as threads_1 from "../domains/threads/index.js";
import * as users_1 from "../domains/users/index.js";
import node_events_1 from "node:events";
import logAdapter from "../func/logAdapter.js";
import logger from "../func/logger.js";
import emitAuth from "../domains/realtime/emit-auth.js";
import parseDelta from "../domains/realtime/parse-delta.js";
import getSeqId from "../transport/realtime/get-seq-id.js";
import connectMqtt from "../transport/realtime/connect-mqtt.js";
import taskResponse from "../transport/realtime/task-response.js";
import stream from "../transport/realtime/stream.js";
import topics_1 from "../transport/realtime/topics.js";
import * as constants_1 from "../utils/constants.js";
import * as client_1 from "../utils/client.js";
import format from "../utils/format/index.js";

const require = createRequire(import.meta.url);
const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachLegacyApiSurface = attachLegacyApiSurface;
const mqtt_1 = __importDefault(require("mqtt"));
const ws_1 = __importDefault(require("ws"));
const https_proxy_agent_1 = __importDefault(require("https-proxy-agent"));
const logAdapter_1 = __importDefault(logAdapter);
const logger_1 = __importDefault(logger);
const emit_auth_1 = __importDefault(emitAuth);
const parse_delta_1 = __importDefault(parseDelta);
const get_seq_id_1 = __importDefault(getSeqId);
const connect_mqtt_1 = __importDefault(connectMqtt);
const task_response_1 = __importDefault(taskResponse);
const stream_1 = __importDefault(stream);
const format_1 = __importDefault(format);
const { buildProxy, buildStream } = stream_1.default;
const { generateOfflineThreadingID, generateTimestampRelative, generateThreadingID, getCurrentTimestamp } = format_1.default;
function createUploadLogger() {
    return {
        info: (message) => logAdapter_1.default.info(message),
        warn: (message) => logAdapter_1.default.warn(message),
        error: (message) => logAdapter_1.default.error(message)
    };
}
function logError(scope, error) {
    logAdapter_1.default.error(scope, error);
}
function logInfo(scope, message) {
    logAdapter_1.default.info(scope, message);
}
function compactNamespace(namespace) {
    return Object.fromEntries(Object.entries(namespace).filter(([, value]) => typeof value !== "undefined"));
}
function bindLiveMethod(api, key) {
    return (...args) => {
        const candidate = api[key];
        if (typeof candidate !== "function") {
            throw new Error(`API method "${key}" is not available`);
        }
        return candidate.apply(api, args);
    };
}
function createLegacyListenMqttFactory(logger) {
    const parseDelta = (0, parse_delta_1.default)({ parseAndCheckLogin: client_1.parseAndCheckLogin });
    const emitAuth = (0, emit_auth_1.default)({ logger });
    const listenMqttCore = (0, connect_mqtt_1.default)({
        WebSocket: ws_1.default,
        mqtt: mqtt_1.default,
        HttpsProxyAgent: https_proxy_agent_1.default,
        buildStream,
        buildProxy,
        topics: topics_1.topics,
        parseDelta,
        getTaskResponseData: task_response_1.default,
        logger,
        emitAuth
    });
    const getSeqIDFactory = (0, get_seq_id_1.default)({
        listenMqtt: listenMqttCore,
        logger,
        emitAuth
    });
    return (0, listener_1.createRealtimeListener)({
        EventEmitter: node_events_1.EventEmitter,
        logger,
        emitAuth,
        createMiddlewareSystem: () => (0, middleware_1.createRealtimeMiddlewareSystem)(logger),
        topics: topics_1.topics,
        listenMqttCore,
        getSeqIDFactory
    });
}
function attachLegacyApiSurface(api, defaultFuncs, ctx, logger = logger_1.default) {
    const uploadAttachment = (0, upload_attachment_1.createUploadAttachmentCommand)({
        ctx,
        logger: createUploadLogger(),
        logError
    });
    const messages = (0, messages_1.createMessagesDomain)({
        send: {
            ctx,
            uploadAttachment,
            generateOfflineThreadingID,
            isReadableStream: constants_1.isReadableStream,
            logError
        },
        markRead: {
            defaultFuncs,
            ctx,
            logError
        },
        typing: {
            ctx,
            logError
        },
        markSeen: {
            defaultFuncs,
            ctx,
            logError
        },
        markDelivered: {
            defaultFuncs,
            ctx,
            logError
        },
        markReadAll: {
            defaultFuncs,
            ctx,
            logError
        },
        reaction: {
            ctx,
            generateOfflineThreadingID,
            getCurrentTimestamp,
            logError
        },
        uploadAttachment: {
            ctx,
            logger: createUploadLogger(),
            logError
        },
        edit: {
            ctx,
            generateOfflineThreadingID,
            logError
        },
        delete: {
            ctx,
            generateOfflineThreadingID,
            logError
        },
        unsend: {
            ctx,
            generateOfflineThreadingID,
            logError
        },
        forwardAttachment: {
            ctx,
            generateOfflineThreadingID,
            logError
        },
        shareContact: {
            ctx,
            generateOfflineThreadingID,
            logError
        },
        threadColor: {
            ctx,
            generateOfflineThreadingID,
            logError
        },
        threadEmoji: {
            defaultFuncs,
            ctx,
            generateOfflineThreadingID,
            logError
        },
        get: {
            defaultFuncs,
            ctx,
            logError
        },
        photoUrl: {
            defaultFuncs,
            ctx,
            logError
        }
    });
    const threads = (0, threads_1.createThreadsDomain)({
        info: {
            defaultFuncs,
            api,
            ctx,
            logError
        },
        list: {
            defaultFuncs,
            ctx,
            logError
        },
        history: {
            defaultFuncs,
            ctx,
            logError
        },
        pictures: {
            defaultFuncs,
            ctx,
            logError
        },
        color: {
            ctx,
            generateOfflineThreadingID,
            logError
        },
        emoji: {
            defaultFuncs,
            ctx,
            generateOfflineThreadingID,
            logError
        },
        mute: {
            defaultFuncs,
            ctx,
            logError
        },
        archive: {
            defaultFuncs,
            ctx,
            logError
        },
        addUsers: {
            ctx,
            generateOfflineThreadingID,
            logError
        },
        removeUser: {
            ctx,
            generateOfflineThreadingID,
            logError
        },
        adminStatus: {
            ctx,
            generateOfflineThreadingID,
            logError
        },
        groupImage: {
            defaultFuncs,
            ctx,
            generateOfflineThreadingID,
            logError
        },
        nickname: {
            ctx,
            generateOfflineThreadingID,
            logError
        },
        createGroup: {
            defaultFuncs,
            ctx,
            logError
        },
        createPoll: {
            ctx,
            generateOfflineThreadingID,
            logError
        },
        createThemeAI: {
            defaultFuncs,
            ctx,
            logError
        },
        messageRequest: {
            defaultFuncs,
            ctx,
            logError
        },
        deleteThread: {
            defaultFuncs,
            ctx,
            logError
        },
        title: {
            defaultFuncs,
            ctx,
            generateOfflineThreadingID,
            generateTimestampRelative,
            generateThreadingID,
            logError
        },
        search: {
            defaultFuncs,
            ctx,
            logError
        },
        themePictures: {
            defaultFuncs,
            ctx,
            logError
        }
    });
    const users = (0, users_1.createUsersDomain)({
        info: {
            defaultFuncs,
            api,
            ctx,
            logger,
            logError
        },
        infoV2: {
            defaultFuncs,
            ctx,
            logger
        },
        idLookup: {
            defaultFuncs,
            ctx,
            logError
        },
        friendsList: {
            defaultFuncs,
            ctx,
            logError
        }
    });
    const account = (0, account_1.createAccountDomain)({
        addExternalModule: {
            defaultFuncs,
            api,
            ctx
        },
        currentUserId: {
            ctx
        },
        enableAutoSaveAppState: {
            api: {
                getAppState: () => api.getAppState()
            },
            ctx,
            logger
        },
        logout: {
            defaultFuncs,
            ctx,
            logInfo,
            logError
        },
        refreshFbDtsg: {
            ctx
        },
        changeAvatar: {
            defaultFuncs,
            ctx,
            isReadableStream: constants_1.isReadableStream,
            logError
        },
        changeBio: {
            defaultFuncs,
            ctx,
            logError
        },
        handleFriendRequest: {
            defaultFuncs,
            ctx,
            logError
        },
        unfriend: {
            defaultFuncs,
            ctx,
            logError
        },
        setPostReaction: {
            defaultFuncs,
            ctx,
            logError
        },
        changeBlockedStatus: {
            defaultFuncs,
            ctx,
            logError
        }
    });
    const http = (0, http_1.createHttpDomain)({
        get: {
            defaultFuncs,
            ctx
        },
        post: {
            defaultFuncs,
            ctx
        },
        postFormData: {
            defaultFuncs,
            ctx,
            logError
        }
    });
    const attachRealtimeListener = createLegacyListenMqttFactory(logger);
    const listenMqtt = attachRealtimeListener(defaultFuncs, api, ctx);
    if (!ctx._scheduler) {
        ctx._scheduler = (0, scheduler_1.createSchedulerDomain)({
            sendMessage: (...args) => api.sendMessage(...args),
            logger
        });
    }
    const legacySurface = {
        addExternalModule: account.addExternalModule,
        changeAvatar: account.changeAvatar,
        changeBio: account.changeBio,
        enableAutoSaveAppState: account.enableAutoSaveAppState,
        getCurrentUserID: account.getCurrentUserID,
        handleFriendRequest: account.handleFriendRequest,
        logout: account.logout,
        refreshFb_dtsg: account.refreshFb_dtsg,
        setPostReaction: account.setPostReaction,
        unfriend: account.unfriend,
        httpGet: http.get,
        httpPost: http.post,
        postFormData: http.postFormData,
        addUserToGroup: threads.addUsers,
        changeAdminStatus: threads.setAdmin,
        changeArchivedStatus: threads.archive,
        changeBlockedStatus: account.changeBlockedStatus,
        changeGroupImage: threads.setImage,
        changeNickname: threads.setNickname,
        changeThreadColor: threads.setColor,
        changeThreadEmoji: threads.setEmoji,
        createNewGroup: threads.createGroup,
        createPoll: threads.createPoll,
        createThemeAI: threads.createThemeAI,
        deleteMessage: messages.delete,
        deleteThread: threads.delete,
        editMessage: messages.edit,
        forwardAttachment: messages.forwardAttachment,
        getEmojiUrl: messages.getEmojiUrl,
        getFriendsList: users.getFriends,
        getMessage: messages.get,
        getThemePictures: threads.getThemePictures,
        handleMessageRequest: threads.handleMessageRequest,
        markAsDelivered: messages.markDelivered,
        markAsRead: messages.markRead,
        markAsReadAll: messages.markReadAll,
        markAsSeen: messages.markSeen,
        muteThread: threads.mute,
        removeUserFromGroup: threads.removeUser,
        resolvePhotoUrl: messages.resolvePhotoUrl,
        scheduler: ctx._scheduler,
        searchForThread: threads.search,
        sendMessage: messages.send,
        sendTypingIndicator: messages.typing,
        setMessageReaction: messages.react,
        setTitle: threads.setTitle,
        shareContact: messages.shareContact,
        threadColors: threads.getColors ? threads.getColors() : undefined,
        unsendMessage: messages.unsend,
        uploadAttachment: messages.uploadAttachment,
        listenMqtt,
        getThreadHistory: threads.getHistory,
        getThreadInfo: threads.getInfo,
        getThreadList: threads.getList,
        getThreadPictures: threads.getPictures,
        getUserID: users.getID,
        getUserInfo: users.getInfo,
        getUserInfoV2: users.getInfoV2
    };
    const namespaces = {
        messages: compactNamespace({
            send: messages.send,
            edit: messages.edit,
            delete: messages.delete,
            unsend: messages.unsend,
            get: messages.get,
            markRead: messages.markRead,
            markReadAll: messages.markReadAll,
            markSeen: messages.markSeen,
            markDelivered: messages.markDelivered,
            typing: messages.typing,
            react: messages.react,
            shareContact: messages.shareContact,
            getEmojiUrl: messages.getEmojiUrl,
            resolvePhotoUrl: messages.resolvePhotoUrl,
            uploadAttachment: messages.uploadAttachment,
            forwardAttachment: messages.forwardAttachment
        }),
        threads: compactNamespace({
            createGroup: threads.createGroup,
            getInfo: threads.getInfo,
            getList: threads.getList,
            getHistory: threads.getHistory,
            getPictures: threads.getPictures,
            addUsers: threads.addUsers,
            archive: threads.archive,
            removeUser: threads.removeUser,
            setAdmin: threads.setAdmin,
            setImage: threads.setImage,
            setColor: threads.setColor,
            setEmoji: threads.setEmoji,
            setNickname: threads.setNickname,
            createPoll: threads.createPoll,
            createThemeAI: threads.createThemeAI,
            getThemePictures: threads.getThemePictures,
            delete: threads.delete,
            colors: threads.getColors ? threads.getColors() : undefined,
            handleMessageRequest: threads.handleMessageRequest,
            mute: threads.mute,
            setTitle: threads.setTitle,
            search: threads.search
        }),
        users: compactNamespace({
            getID: users.getID,
            getInfo: users.getInfo,
            getInfoV2: users.getInfoV2,
            getFriends: users.getFriends
        }),
        account: compactNamespace({
            addExternalModule: account.addExternalModule,
            changeAvatar: account.changeAvatar,
            changeBio: account.changeBio,
            enableAutoSaveAppState: account.enableAutoSaveAppState,
            getCurrentUserID: account.getCurrentUserID,
            handleFriendRequest: account.handleFriendRequest,
            logout: account.logout,
            refreshDtsg: account.refreshFb_dtsg,
            changeBlockedStatus: account.changeBlockedStatus,
            setOptions: api.setOptions,
            setPostReaction: account.setPostReaction,
            unfriend: account.unfriend,
            getAppState: api.getAppState,
            getCookies: api.getCookies
        }),
        realtime: compactNamespace({
            listen: listenMqtt,
            stop: bindLiveMethod(api, "stopListening"),
            stopAsync: bindLiveMethod(api, "stopListeningAsync"),
            useMiddleware: bindLiveMethod(api, "useMiddleware"),
            removeMiddleware: bindLiveMethod(api, "removeMiddleware"),
            clearMiddleware: bindLiveMethod(api, "clearMiddleware"),
            listMiddleware: bindLiveMethod(api, "listMiddleware"),
            setMiddlewareEnabled: bindLiveMethod(api, "setMiddlewareEnabled")
        }),
        http: compactNamespace({
            get: http.get,
            post: http.post,
            postFormData: http.postFormData
        }),
        scheduler: compactNamespace((ctx._scheduler || {}))
    };
    let loaded = 0;
    let skipped = 0;
    for (const [key, value] of Object.entries(legacySurface)) {
        if (typeof value === "undefined") {
            skipped += 1;
            continue;
        }
        if (typeof api[key] !== "undefined") {
            skipped += 1;
            continue;
        }
        api[key] = value;
        loaded += 1;
    }
    return { loaded, skipped, namespaces };
}
exports.default = attachLegacyApiSurface;

export default module.exports;
const __export_attachLegacyApiSurface = module.exports.attachLegacyApiSurface;
export { __export_attachLegacyApiSurface as attachLegacyApiSurface };
