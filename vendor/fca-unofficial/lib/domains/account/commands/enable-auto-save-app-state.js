import path from "path";
import fs from "fs";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEnableAutoSaveAppStateCommand = createEnableAutoSaveAppStateCommand;
const path_1 = __importDefault(path);
const fs_1 = __importDefault(fs);
function createEnableAutoSaveAppStateCommand(deps) {
    const { api, ctx, logger } = deps;
    return function enableAutoSaveAppState(options = {}) {
        const filePath = options.filePath || path_1.default.join(process.cwd(), "appstate.json");
        const interval = options.interval || 10 * 60 * 1000;
        const saveOnLogin = options.saveOnLogin !== false;
        function saveAppState() {
            try {
                const appState = api.getAppState();
                if (!appState || !appState.appState || appState.appState.length === 0) {
                    logger?.("AppState is empty, skipping save", "warn");
                    return;
                }
                fs_1.default.writeFileSync(filePath, JSON.stringify(appState, null, 2), "utf8");
                logger?.(`AppState saved to ${filePath}`, "info");
            }
            catch (error) {
                logger?.(`Error saving AppState: ${error && error.message ? error.message : String(error)}`, "error");
            }
        }
        let immediateSaveTimer = null;
        if (saveOnLogin) {
            immediateSaveTimer = setTimeout(() => {
                saveAppState();
                immediateSaveTimer = null;
            }, 2000);
        }
        const intervalId = setInterval(saveAppState, interval);
        logger?.(`Auto-save AppState enabled: ${filePath} (every ${Math.round(interval / 1000 / 60)} minutes)`, "info");
        if (!ctx._autoSaveInterval) {
            ctx._autoSaveInterval = [];
        }
        ctx._autoSaveInterval.push(intervalId);
        return function disableAutoSaveAppState() {
            if (immediateSaveTimer) {
                clearTimeout(immediateSaveTimer);
                immediateSaveTimer = null;
            }
            clearInterval(intervalId);
            const index = ctx._autoSaveInterval ? ctx._autoSaveInterval.indexOf(intervalId) : -1;
            if (index !== -1) {
                ctx._autoSaveInterval.splice(index, 1);
            }
            logger?.("Auto-save AppState disabled", "info");
        };
    };
}

export default module.exports;
const __export_createEnableAutoSaveAppStateCommand = module.exports.createEnableAutoSaveAppStateCommand;
export { __export_createEnableAutoSaveAppStateCommand as createEnableAutoSaveAppStateCommand };
