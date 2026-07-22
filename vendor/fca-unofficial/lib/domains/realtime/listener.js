
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createRealtimeListener = createRealtimeListener;
const CYCLE_MS_DEFAULT = 60 * 60 * 1000;
const RECONNECT_DELAY_MS_DEFAULT = 2000;
const UNSUB_ALL_TIMEOUT_MS = 5000;
const MQTT_DEFAULTS = {
    cycleMs: CYCLE_MS_DEFAULT,
    reconnectDelayMs: RECONNECT_DELAY_MS_DEFAULT,
    autoReconnect: true,
    reconnectAfterStop: false
};
function mqttConf(ctx, overrides) {
    ctx._mqttOpt = Object.assign({}, MQTT_DEFAULTS, ctx._mqttOpt || {}, overrides || {});
    if (typeof ctx._mqttOpt.autoReconnect === "boolean") {
        ctx.globalOptions.autoReconnect = ctx._mqttOpt.autoReconnect;
    }
    return ctx._mqttOpt;
}
function createRealtimeListener(deps) {
    const { EventEmitter, logger, emitAuth, createMiddlewareSystem, topics, listenMqttCore, getSeqIDFactory } = deps;
    return function attachRealtimeListener(defaultFuncs, api, ctx, opts) {
        const identity = function () { };
        let globalCallback = identity;
        if (!ctx._middleware) {
            ctx._middleware = createMiddlewareSystem();
        }
        const middleware = ctx._middleware;
        function installPostGuard() {
            if (ctx._postGuarded) {
                return defaultFuncs.post;
            }
            const rawPost = defaultFuncs.post && defaultFuncs.post.bind(defaultFuncs);
            if (!rawPost) {
                return defaultFuncs.post;
            }
            function postSafe(...args) {
                return rawPost(...args).catch((error) => {
                    const message = (error && error.error) || (error && error.message) || String(error || "");
                    if (/Not logged in|blocked the login/i.test(message)) {
                        emitAuth(ctx, api, globalCallback, /blocked/i.test(message) ? "login_blocked" : "not_logged_in", message);
                    }
                    throw error;
                });
            }
            defaultFuncs.post = postSafe;
            ctx._postGuarded = true;
            return postSafe;
        }
        let conf = mqttConf(ctx, opts);
        function getSeqIDWrapper() {
            if (ctx._ending && !ctx._cycling) {
                logger("mqtt getSeqID skipped - ending", "warn");
                return Promise.resolve();
            }
            if (ctx._getSeqRetryTimer) {
                clearTimeout(ctx._getSeqRetryTimer);
                ctx._getSeqRetryTimer = null;
            }
            const form = {
                av: ctx.globalOptions.pageID,
                queries: JSON.stringify({
                    o0: {
                        doc_id: "3336396659757871",
                        query_params: {
                            limit: 1,
                            before: null,
                            tags: ["INBOX"],
                            includeDeliveryReceipts: false,
                            includeSeqID: true
                        }
                    }
                })
            };
            logger("mqtt getSeqID call", "info");
            return getSeqIDFactory(defaultFuncs, api, ctx, globalCallback, form)
                .then(() => {
                logger("mqtt getSeqID done", "info");
                ctx._cycling = false;
            })
                .catch((error) => {
                ctx._cycling = false;
                const message = error && error.message ? error.message : String(error || "Unknown error");
                logger(`mqtt getSeqID error: ${message}`, "error");
                if (ctx._ending) {
                    return;
                }
                if (ctx.globalOptions.autoReconnect) {
                    const delay = conf.reconnectDelayMs + Math.floor(Math.random() * 400);
                    logger(`mqtt getSeqID will retry in ~${delay}ms`, "warn");
                    ctx._getSeqRetryTimer = setTimeout(() => {
                        ctx._getSeqRetryTimer = null;
                        if (!ctx._ending) {
                            getSeqIDWrapper();
                        }
                    }, delay);
                }
            });
        }
        function isConnected() {
            return !!(ctx.mqttClient && ctx.mqttClient.connected);
        }
        function unsubAll(callback) {
            if (!isConnected()) {
                if (callback) {
                    setTimeout(callback, 0);
                }
                return;
            }
            let pending = topics.length;
            if (!pending) {
                if (callback) {
                    setTimeout(callback, 0);
                }
                return;
            }
            let fired = false;
            const timeout = setTimeout(() => {
                if (!fired) {
                    fired = true;
                    logger("unsubAll timeout, proceeding anyway", "warn");
                    callback?.();
                }
            }, UNSUB_ALL_TIMEOUT_MS);
            topics.forEach((topic) => {
                try {
                    ctx.mqttClient.unsubscribe(topic, () => {
                        if (--pending === 0 && !fired) {
                            clearTimeout(timeout);
                            fired = true;
                            callback?.();
                        }
                    });
                }
                catch (error) {
                    logger(`unsubAll error for topic ${topic}: ${error && error.message ? error.message : String(error)}`, "warn");
                    if (--pending === 0 && !fired) {
                        clearTimeout(timeout);
                        fired = true;
                        callback?.();
                    }
                }
            });
        }
        function endQuietly(next) {
            const finish = () => {
                try {
                    if (ctx.mqttClient) {
                        ctx.mqttClient.removeAllListeners();
                    }
                }
                catch { }
                ctx.mqttClient = undefined;
                ctx.lastSeqId = null;
                ctx.syncToken = undefined;
                ctx.t_mqttCalled = false;
                ctx._ending = false;
                ctx._cycling = false;
                if (ctx._reconnectTimer) {
                    clearTimeout(ctx._reconnectTimer);
                    ctx._reconnectTimer = null;
                }
                if (ctx._getSeqRetryTimer) {
                    clearTimeout(ctx._getSeqRetryTimer);
                    ctx._getSeqRetryTimer = null;
                }
                if (ctx._rTimeout) {
                    clearTimeout(ctx._rTimeout);
                    ctx._rTimeout = null;
                }
                if (ctx.tasks && ctx.tasks instanceof Map) {
                    ctx.tasks.clear();
                }
                if (ctx._userInfoIntervals && Array.isArray(ctx._userInfoIntervals)) {
                    ctx._userInfoIntervals.forEach((interval) => {
                        try {
                            clearInterval(interval);
                        }
                        catch { }
                    });
                    ctx._userInfoIntervals = [];
                }
                if (ctx._autoSaveInterval && Array.isArray(ctx._autoSaveInterval)) {
                    ctx._autoSaveInterval.forEach((interval) => {
                        try {
                            clearInterval(interval);
                        }
                        catch { }
                    });
                    ctx._autoSaveInterval = [];
                }
                if (ctx._scheduler && typeof ctx._scheduler.destroy === "function") {
                    try {
                        ctx._scheduler.destroy();
                    }
                    catch { }
                    ctx._scheduler = undefined;
                }
                next?.();
            };
            try {
                if (ctx.mqttClient) {
                    if (isConnected()) {
                        try {
                            ctx.mqttClient.publish("/browser_close", "{}", { qos: 0 });
                        }
                        catch { }
                    }
                    ctx.mqttClient.end(true, finish);
                }
                else {
                    finish();
                }
            }
            catch {
                finish();
            }
        }
        function delayedReconnect() {
            const delay = conf.reconnectDelayMs;
            logger(`mqtt reconnect in ${delay}ms`, "info");
            setTimeout(() => getSeqIDWrapper(), delay);
        }
        function forceCycle() {
            if (ctx._cycling) {
                logger("mqtt force cycle already in progress", "warn");
                return;
            }
            ctx._cycling = true;
            ctx._ending = true;
            logger("mqtt force cycle begin", "warn");
            unsubAll(() => endQuietly(() => delayedReconnect()));
        }
        return function listenRealtime(callback) {
            class MessageEmitter extends EventEmitter {
                stopListening(callback2) {
                    const cb = callback2 || function () { };
                    logger("mqtt stop requested", "info");
                    globalCallback = identity;
                    if (ctx._autoCycleTimer) {
                        clearInterval(ctx._autoCycleTimer);
                        ctx._autoCycleTimer = null;
                        logger("mqtt auto-cycle cleared", "info");
                    }
                    if (ctx._reconnectTimer) {
                        clearTimeout(ctx._reconnectTimer);
                        ctx._reconnectTimer = null;
                    }
                    if (ctx._getSeqRetryTimer) {
                        clearTimeout(ctx._getSeqRetryTimer);
                        ctx._getSeqRetryTimer = null;
                    }
                    ctx._ending = true;
                    unsubAll(() => endQuietly(() => {
                        logger("mqtt stopped", "info");
                        cb();
                        conf = mqttConf(ctx, conf);
                        if (conf.reconnectAfterStop) {
                            delayedReconnect();
                        }
                    }));
                }
                async stopListeningAsync() {
                    return new Promise((resolve) => {
                        this.stopListening(resolve);
                    });
                }
            }
            const msgEmitter = new MessageEmitter();
            const originalCallback = callback ||
                function (error, message) {
                    if (error) {
                        logger("mqtt emit error", "error");
                        msgEmitter.emit("error", error);
                        return;
                    }
                    msgEmitter.emit("message", message);
                };
            globalCallback = middleware.count > 0 ? middleware.wrapCallback(originalCallback) : originalCallback;
            conf = mqttConf(ctx, conf);
            installPostGuard();
            if (!ctx.firstListen) {
                ctx.lastSeqId = null;
            }
            ctx.syncToken = undefined;
            ctx.t_mqttCalled = false;
            if (ctx._autoCycleTimer) {
                clearInterval(ctx._autoCycleTimer);
                ctx._autoCycleTimer = null;
            }
            if (conf.cycleMs && conf.cycleMs > 0) {
                ctx._autoCycleTimer = setInterval(forceCycle, conf.cycleMs);
                logger(`mqtt auto-cycle enabled ${conf.cycleMs}ms`, "info");
            }
            else {
                logger("mqtt auto-cycle disabled", "info");
            }
            if (!ctx.firstListen || !ctx.lastSeqId) {
                getSeqIDWrapper();
            }
            else {
                logger("mqtt starting listenMqtt", "info");
                listenMqttCore(defaultFuncs, api, ctx, globalCallback);
            }
            api.stopListening = msgEmitter.stopListening;
            api.stopListeningAsync = msgEmitter.stopListeningAsync;
            let currentOriginalCallback = originalCallback;
            let currentGlobalCallback = globalCallback;
            function rewrapCallbackIfNeeded() {
                if (!ctx.mqttClient || ctx._ending) {
                    return;
                }
                const hasMiddleware = middleware.count > 0;
                const isWrapped = currentGlobalCallback !== currentOriginalCallback;
                if (hasMiddleware && !isWrapped) {
                    currentGlobalCallback = middleware.wrapCallback(currentOriginalCallback);
                    globalCallback = currentGlobalCallback;
                    logger("Middleware added - callback re-wrapped", "info");
                }
                else if (!hasMiddleware && isWrapped) {
                    currentGlobalCallback = currentOriginalCallback;
                    globalCallback = currentGlobalCallback;
                    logger("All middleware removed - callback unwrapped", "info");
                }
            }
            api.useMiddleware = function (middlewareFn, fn) {
                const result = middleware.use(middlewareFn, fn);
                rewrapCallbackIfNeeded();
                return result;
            };
            api.removeMiddleware = function (identifier) {
                const result = middleware.remove(identifier);
                rewrapCallbackIfNeeded();
                return result;
            };
            api.clearMiddleware = function () {
                middleware.clear();
                rewrapCallbackIfNeeded();
            };
            api.listMiddleware = function () {
                return middleware.list();
            };
            api.setMiddlewareEnabled = function (name, enabled) {
                const result = middleware.setEnabled(name, enabled);
                rewrapCallbackIfNeeded();
                return result;
            };
            const existingMiddlewareCount = Object.getOwnPropertyDescriptor(api, "middlewareCount");
            if (!existingMiddlewareCount) {
                Object.defineProperty(api, "middlewareCount", {
                    configurable: true,
                    enumerable: false,
                    get: function () {
                        return (ctx._middleware && ctx._middleware.count) || 0;
                    }
                });
            }
            else if (existingMiddlewareCount.configurable) {
                Object.defineProperty(api, "middlewareCount", {
                    configurable: true,
                    enumerable: existingMiddlewareCount.enumerable,
                    get: function () {
                        return (ctx._middleware && ctx._middleware.count) || 0;
                    }
                });
            }
            return msgEmitter;
        };
    };
}

export default module.exports;
const __export_createRealtimeListener = module.exports.createRealtimeListener;
export { __export_createRealtimeListener as createRealtimeListener };
