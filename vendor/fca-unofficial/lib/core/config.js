import nodefs from "node:fs";
import nodepath from "node:path";
import logger from "../func/logger.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = void 0;
exports.resolveConfig = resolveConfig;
exports.getConfigPath = getConfigPath;
exports.loadConfig = loadConfig;
exports.writeConfigTemplate = writeConfigTemplate;
const node_fs_1 = __importDefault(nodefs);
const node_path_1 = __importDefault(nodepath);
const logger_1 = __importDefault(logger);
const DEFAULT_REGISTRY_URL = "https://registry.npmjs.org";
const DEFAULT_PACKAGE_NAME = "";
exports.defaultConfig = {
    autoUpdate: false,
    checkUpdate: {
        enabled: false,
        install: false,
        notifyIfCurrent: false,
        packageName: DEFAULT_PACKAGE_NAME,
        registryUrl: DEFAULT_REGISTRY_URL,
        timeoutMs: 10000
    },
    mqtt: { enabled: true, reconnectInterval: 3600 },
    autoLogin: false,
    apiServer: "",
    apiKey: "",
    credentials: { email: "", password: "", twofactor: "" },
    antiGetInfo: {
        AntiGetThreadInfo: false,
        AntiGetUserInfo: false
    },
    // ========== إضافة جديدة لمكافحة الكشف ==========
    antiDetection: {
        enabled: false,
        requestDelayMin: 0,
        requestDelayMax: 0,
        userAgentPool: []
    },
    // ============================================
    remoteControl: {
        enabled: false,
        url: "",
        token: "",
        autoReconnect: true
    }
};
function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function cloneConfig(value) {
    if (Array.isArray(value)) {
        return value.map((item) => cloneConfig(item));
    }
    if (isPlainObject(value)) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneConfig(item)]));
    }
    return value;
}
function deepMerge(base, override) {
    if (!isPlainObject(base) || !isPlainObject(override)) {
        return override === undefined ? cloneConfig(base) : cloneConfig(override);
    }
    const result = cloneConfig(base);
    for (const [key, value] of Object.entries(override)) {
        const current = result[key];
        if (isPlainObject(current) && isPlainObject(value)) {
            result[key] = deepMerge(current, value);
        }
        else {
            result[key] = cloneConfig(value);
        }
    }
    return result;
}
function normalizeBoolean(value, fallback) {
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") {
            return true;
        }
        if (normalized === "false") {
            return false;
        }
    }
    return fallback;
}
function normalizeNumber(value, fallback) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return fallback;
}
function normalizeString(value, fallback) {
    return typeof value === "string" ? value : fallback;
}
function resolveConfig(input) {
    const rawInput = isPlainObject(input) ? input : {};
    const rawCheckUpdate = isPlainObject(rawInput.checkUpdate) ? rawInput.checkUpdate : {};
    const merged = deepMerge(exports.defaultConfig, input || {});
    const config = merged;
    config.credentials = deepMerge(exports.defaultConfig.credentials, config.credentials || {});
    config.mqtt = deepMerge(exports.defaultConfig.mqtt, config.mqtt || {});
    config.antiGetInfo = deepMerge(exports.defaultConfig.antiGetInfo, config.antiGetInfo || {});
    config.remoteControl = deepMerge(exports.defaultConfig.remoteControl, config.remoteControl || {});
    config.checkUpdate = deepMerge(exports.defaultConfig.checkUpdate, config.checkUpdate || {});
    // ========== معالجة إعدادات مكافحة الكشف ==========
    config.antiDetection = deepMerge(exports.defaultConfig.antiDetection, config.antiDetection || {});
    config.antiDetection.enabled = normalizeBoolean(config.antiDetection.enabled, false);
    config.antiDetection.requestDelayMin = normalizeNumber(config.antiDetection.requestDelayMin, 0);
    config.antiDetection.requestDelayMax = normalizeNumber(config.antiDetection.requestDelayMax, 0);
    if (!Array.isArray(config.antiDetection.userAgentPool)) {
        config.antiDetection.userAgentPool = [];
    }
    // ===============================================
    config.autoLogin = normalizeBoolean(config.autoLogin, exports.defaultConfig.autoLogin);
    config.autoUpdate = normalizeBoolean(rawInput.autoUpdate, exports.defaultConfig.autoUpdate);
    config.mqtt.enabled = normalizeBoolean(config.mqtt.enabled, exports.defaultConfig.mqtt.enabled);
    config.mqtt.reconnectInterval = normalizeNumber(config.mqtt.reconnectInterval, exports.defaultConfig.mqtt.reconnectInterval);
    config.remoteControl.enabled = normalizeBoolean(config.remoteControl.enabled, exports.defaultConfig.remoteControl.enabled);
    config.remoteControl.autoReconnect = normalizeBoolean(config.remoteControl.autoReconnect, exports.defaultConfig.remoteControl.autoReconnect);
    config.antiGetInfo.AntiGetThreadInfo = normalizeBoolean(config.antiGetInfo.AntiGetThreadInfo, exports.defaultConfig.antiGetInfo.AntiGetThreadInfo);
    config.antiGetInfo.AntiGetUserInfo = normalizeBoolean(config.antiGetInfo.AntiGetUserInfo, exports.defaultConfig.antiGetInfo.AntiGetUserInfo);
    config.checkUpdate.enabled = normalizeBoolean(rawCheckUpdate.enabled, config.autoUpdate);
    config.checkUpdate.install = normalizeBoolean(config.checkUpdate.install, exports.defaultConfig.checkUpdate.install);
    config.checkUpdate.notifyIfCurrent = normalizeBoolean(config.checkUpdate.notifyIfCurrent, exports.defaultConfig.checkUpdate.notifyIfCurrent);
    config.checkUpdate.packageName = normalizeString(config.checkUpdate.packageName, exports.defaultConfig.checkUpdate.packageName);
    config.checkUpdate.registryUrl = normalizeString(config.checkUpdate.registryUrl, exports.defaultConfig.checkUpdate.registryUrl);
    config.checkUpdate.timeoutMs = Math.max(1000, normalizeNumber(config.checkUpdate.timeoutMs, exports.defaultConfig.checkUpdate.timeoutMs));
    config.autoUpdate = config.checkUpdate.enabled;
    return config;
}
function getConfigPath() {
    return node_path_1.default.join(process.cwd(), "fca-config.json");
}
function loadConfig() {
    const configPath = getConfigPath();
    if (!node_fs_1.default.existsSync(configPath)) {
        return {
            config: resolveConfig(exports.defaultConfig),
            configPath,
            exists: false
        };
    }
    try {
        const fileContent = node_fs_1.default.readFileSync(configPath, "utf8");
        if (fileContent.trim() === "") {
            return {
                config: resolveConfig(exports.defaultConfig),
                configPath,
                exists: true
            };
        }
        const parsed = JSON.parse(fileContent);
        return {
            config: resolveConfig(parsed),
            configPath,
            exists: true
        };
    }
    catch (err) {
        (0, logger_1.default)(`Error reading config file, using defaults: ${err.message}`, "warn");
        return {
            config: resolveConfig(exports.defaultConfig),
            configPath,
            exists: true
        };
    }
}
function writeConfigTemplate(targetPath = node_path_1.default.join(process.cwd(), "fca-config.example.json")) {
    const payload = `${JSON.stringify(exports.defaultConfig, null, 2)}\n`;
    node_fs_1.default.writeFileSync(targetPath, payload, "utf8");
    return targetPath;
}

export default module.exports;
const __export_defaultConfig = module.exports.defaultConfig;
const __export_resolveConfig = module.exports.resolveConfig;
const __export_getConfigPath = module.exports.getConfigPath;
const __export_loadConfig = module.exports.loadConfig;
const __export_writeConfigTemplate = module.exports.writeConfigTemplate;
export { __export_defaultConfig as defaultConfig };
export { __export_resolveConfig as resolveConfig };
export { __export_getConfigPath as getConfigPath };
export { __export_loadConfig as loadConfig };
export { __export_writeConfigTemplate as writeConfigTemplate };
