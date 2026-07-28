
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createRealtimeMiddlewareSystem = createRealtimeMiddlewareSystem;
function createRealtimeMiddlewareSystem(logger) {
    const middlewareStack = [];
    function use(middleware, fn) {
        let middlewareFn;
        let name;
        if (typeof middleware === "string" && typeof fn === "function") {
            name = middleware;
            middlewareFn = fn;
        }
        else if (typeof middleware === "function") {
            middlewareFn = middleware;
            name = `middleware_${middlewareStack.length}`;
        }
        else {
            throw new Error("Middleware must be a function or (name, function)");
        }
        const wrapped = {
            name,
            fn: middlewareFn,
            enabled: true
        };
        middlewareStack.push(wrapped);
        logger?.(`Middleware "${name}" added`, "info");
        return function remove() {
            const index = middlewareStack.indexOf(wrapped);
            if (index !== -1) {
                middlewareStack.splice(index, 1);
                logger?.(`Middleware "${name}" removed`, "info");
            }
        };
    }
    function remove(identifier) {
        if (typeof identifier === "string") {
            const index = middlewareStack.findIndex((item) => item.name === identifier);
            if (index !== -1) {
                const removed = middlewareStack.splice(index, 1)[0];
                logger?.(`Middleware "${removed.name}" removed`, "info");
                return true;
            }
            return false;
        }
        if (typeof identifier === "function") {
            const index = middlewareStack.findIndex((item) => item.fn === identifier);
            if (index !== -1) {
                const removed = middlewareStack.splice(index, 1)[0];
                logger?.(`Middleware "${removed.name}" removed`, "info");
                return true;
            }
            return false;
        }
        return false;
    }
    function clear() {
        const count = middlewareStack.length;
        middlewareStack.length = 0;
        logger?.(`All middleware cleared (${count} removed)`, "info");
    }
    function list() {
        return middlewareStack.filter((item) => item.enabled).map((item) => item.name);
    }
    function setEnabled(name, enabled) {
        const middleware = middlewareStack.find((item) => item.name === name);
        if (middleware) {
            middleware.enabled = enabled;
            logger?.(`Middleware "${name}" ${enabled ? "enabled" : "disabled"}`, "info");
            return true;
        }
        return false;
    }
    function process(event, finalCallback) {
        if (!middlewareStack.length) {
            return finalCallback(null, event);
        }
        let index = 0;
        const enabledMiddleware = middlewareStack.filter((item) => item.enabled);
        function next(err) {
            if (err && err !== false && err !== null) {
                return finalCallback(err, null);
            }
            if (err === false || err === null) {
                return finalCallback(null, null);
            }
            if (index >= enabledMiddleware.length) {
                return finalCallback(null, event);
            }
            const middleware = enabledMiddleware[index++];
            try {
                const result = middleware.fn(event, next);
                if (result && typeof result.then === "function") {
                    result.then(() => next()).catch((promiseErr) => next(promiseErr));
                }
                else if (result === false || result === null) {
                    finalCallback(null, null);
                }
            }
            catch (invokeErr) {
                logger?.(`Middleware "${middleware.name}" error: ${invokeErr && invokeErr.message ? invokeErr.message : String(invokeErr)}`, "error");
                next(invokeErr);
            }
        }
        next();
    }
    function wrapCallback(callback) {
        return function wrappedCallback(err, event) {
            if (err) {
                return callback(err, null);
            }
            if (!event) {
                return callback(null, null);
            }
            process(event, (middlewareErr, processedEvent) => {
                if (middlewareErr) {
                    return callback(middlewareErr, null);
                }
                if (processedEvent === null) {
                    return;
                }
                callback(null, processedEvent);
            });
        };
    }
    return {
        use,
        remove,
        clear,
        list,
        setEnabled,
        process,
        wrapCallback,
        get count() {
            return middlewareStack.filter((item) => item.enabled).length;
        }
    };
}
exports.default = createRealtimeMiddlewareSystem;

export default module.exports;
const __export_createRealtimeMiddlewareSystem = module.exports.createRealtimeMiddlewareSystem;
export { __export_createRealtimeMiddlewareSystem as createRealtimeMiddlewareSystem };
