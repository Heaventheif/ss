
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultContext = void 0;
exports.createStateStore = createStateStore;
exports.createFcaState = createFcaState;
exports.createApiFacade = createApiFacade;
exports.attachThreadUpdater = attachThreadUpdater;
const createDefaultContext = () => ({
    fbid: "",
    clientId: ((Math.random() * 2147483648) | 0).toString(16),
    cookieString: "",
    mqttClient: null,
    options: {
        logLevel: "info",
        listenEvents: false,
        selfListen: false,
        updatePresence: false,
        forceLogin: false,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/600.3.18 (KHTML, like Gecko) Version/8.0.3 Safari/600.3.18"
    }
});
exports.createDefaultContext = createDefaultContext;
function createStateStore(initialState) {
    const state = Object.assign({}, initialState);
    Object.defineProperty(state, "__set", {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function setStateField(key, value) {
            state[key] = value;
            return value;
        }
    });
    Object.defineProperty(state, "__merge", {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function mergeState(partial) {
            if (partial && typeof partial === "object") {
                Object.assign(state, partial);
            }
            return state;
        }
    });
    Object.defineProperty(state, "__snapshot", {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function snapshotState() {
            return { ...state };
        }
    });
    return state;
}
function createFcaState(input) {
    const base = (0, exports.createDefaultContext)();
    const state = createStateStore({
        ...base,
        userID: input.userID,
        fbid: input.userID || base.fbid,
        jar: input.jar,
        globalOptions: input.globalOptions,
        options: input.globalOptions || base.options,
        loggedIn: true,
        access_token: input.access_token || "NONE",
        mqttClient: null,
        lastSeqId: input.lastSeqId,
        syncToken: undefined,
        mqttEndpoint: input.mqttEndpoint,
        region: input.region,
        firstListen: true,
        fb_dtsg: input.fb_dtsg,
        clientID: input.clientID,
        clientId: input.clientId || base.clientId,
        wsReqNumber: 0,
        wsTaskNumber: 0,
        tasks: new Map(),
        _emitter: input.emitter
    });
    state.options = state.globalOptions || state.options;
    if (typeof input.bypassAutomation === "function") {
        state.bypassAutomation = input.bypassAutomation.bind(state);
    }
    return state;
}
function createApiFacade(params) {
    const { globalOptions, jar, userID, emitter, setOptions, getAppState, cookieHeaderFromJar, getLatestBackup } = params;
    return {
        setOptions: setOptions.bind(null, globalOptions),
        getCookies: function () {
            return cookieHeaderFromJar(jar);
        },
        getAppState: function () {
            return getAppState(jar);
        },
        getLatestAppStateFromDB: async function (uid = userID) {
            const data = await getLatestBackup(uid, "appstate");
            return data ? JSON.parse(data) : null;
        },
        getLatestCookieFromDB: async function (uid = userID) {
            return await getLatestBackup(uid, "cookie");
        },
        on: emitter.on.bind(emitter),
        once: emitter.once.bind(emitter),
        off: emitter.removeListener.bind(emitter),
        removeAllListeners: emitter.removeAllListeners.bind(emitter)
    };
}
function attachThreadUpdater(ctx, models, logger) {
    try {
        const Thread = models && models.Thread;
        if (!Thread)
            return false;
        ctx._updateThreadFromMessage = async (msg) => {
            try {
                if (!msg || !msg.threadID)
                    return;
                const id = String(msg.threadID);
                let affected = 0;
                try {
                    const res = await Thread.increment("messageCount", {
                        by: 1,
                        where: { threadID: id }
                    });
                    if (Array.isArray(res) && typeof res[0] === "number") {
                        affected = res[0];
                    }
                }
                catch { }
                if (!affected) {
                    try {
                        await Thread.create({
                            threadID: id,
                            messageCount: 1,
                            data: { threadID: id }
                        });
                    }
                    catch { }
                }
            }
            catch (e) {
                const msgText = e && e.message ? e.message : String(e);
                logger(`updateThreadFromMessage error: ${msgText}`, "warn");
            }
        };
        return true;
    }
    catch {
        return false;
    }
}

export default module.exports;
const __export_createDefaultContext = module.exports.createDefaultContext;
const __export_createStateStore = module.exports.createStateStore;
const __export_createFcaState = module.exports.createFcaState;
const __export_createApiFacade = module.exports.createApiFacade;
const __export_attachThreadUpdater = module.exports.attachThreadUpdater;
export { __export_createDefaultContext as createDefaultContext };
export { __export_createStateStore as createStateStore };
export { __export_createFcaState as createFcaState };
export { __export_createApiFacade as createApiFacade };
export { __export_attachThreadUpdater as attachThreadUpdater };
