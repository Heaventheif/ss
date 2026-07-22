import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const module = { exports: {} };
const exports = module.exports;

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const picocolors_1 = __importDefault(require("picocolors"));
const gradient_string_1 = __importDefault(require("gradient-string"));
let oraFactory = null;
let progressCtor = null;
let progressPreset = null;
let gradientFns;
function writeStdout(message) {
    process.stdout.write(`${message}\n`);
}
function writeStderr(message) {
    process.stderr.write(`${message}\n`);
}
function padLabel(label, width = 8) {
    return label.length >= width ? label : `${label}${" ".repeat(width - label.length)}`;
}
function getTimestamp() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}
function getTheme() {
    const fromEnv = String(process.env.FCA_LOG_THEME || "").toLowerCase();
    if (fromEnv === "minimal")
        return "minimal";
    return "cyberpunk";
}
function makeStyles(theme) {
    if (theme === "minimal") {
        return {
            time: (v) => picocolors_1.default.dim(v),
            text: (v) => picocolors_1.default.white(v),
            info: (v) => picocolors_1.default.cyan(v),
            warn: (v) => picocolors_1.default.yellow(v),
            error: (v) => picocolors_1.default.red(v),
            sys: (v) => picocolors_1.default.blue(v)
        };
    }
    return {
        time: (v) => picocolors_1.default.dim(v),
        text: (v) => picocolors_1.default.white(v),
        info: (v) => picocolors_1.default.cyan(v),
        warn: (v) => picocolors_1.default.yellow(v),
        error: (v) => picocolors_1.default.red(v),
        sys: (v) => picocolors_1.default.blue(v)
    };
}
function parseLabel(message, fallback) {
    const m = message.match(/^([A-Z][A-Z0-9 _-]{1,14})\s*:\s*(.+)$/);
    if (!m)
        return { label: fallback, body: message };
    return { label: m[1].trim(), body: m[2] };
}
function loadGradientFns() {
    if (gradientFns !== undefined)
        return gradientFns;
    try {
        const g = typeof gradient_string_1.default === "function" ? gradient_string_1.default : gradient_string_1.default.default;
        if (typeof g !== "function") {
            gradientFns = null;
            return gradientFns;
        }
        gradientFns = {
            cyberpunk: g("magenta", "cyan"),
            blueToRed: g("#3b82f6", "#ef4444"),
            coolStatus: g("#86efac", "#22d3ee")
        };
    }
    catch {
        gradientFns = null;
    }
    return gradientFns;
}
function formatSuccessBody(body, grad, fallbackPaint) {
    const m = body.match(/^Loaded (\d+) API methods(.*)$/i);
    if (m && grad) {
        return `${picocolors_1.default.dim("Loaded ")}${grad.blueToRed(m[1])}${picocolors_1.default.dim(` API methods${m[2]}`)}`;
    }
    return fallbackPaint(body);
}
async function ensureUiLibs() {
    if (!oraFactory) {
        try {
            const oraMod = await Promise.resolve().then(() => __importStar(require("ora")));
            oraFactory = (oraMod.default ?? oraMod);
        }
        catch {
            /* ignore */
        }
    }
    if (!progressCtor || !progressPreset) {
        try {
            const progressMod = await Promise.resolve().then(() => __importStar(require("cli-progress")));
            progressCtor = (progressMod.SingleBar ?? progressMod.default?.SingleBar);
            progressPreset =
                progressMod.Presets?.shades_classic ?? progressMod.default?.Presets?.shades_classic ?? null;
        }
        catch {
            /* ignore */
        }
    }
}
function logLine(text, type) {
    const level = String(type || "info").toLowerCase();
    const message = String(text ?? "");
    const styles = makeStyles(getTheme());
    const ts = styles.time(`[${getTimestamp()}]`);
    const theme = getTheme();
    const grad = theme === "cyberpunk" ? loadGradientFns() : null;
    if (level === "success") {
        const parts = parseLabel(message, "READY");
        const bodyOut = parts.label === "READY"
            ? formatSuccessBody(parts.body, grad, styles.text)
            : grad
                ? grad.coolStatus(parts.body)
                : styles.text(parts.body);
        const labelOut = grad ? grad.coolStatus(padLabel(parts.label)) : styles.text(padLabel(parts.label));
        writeStdout(`${ts} ${picocolors_1.default.bgGreen(picocolors_1.default.black(picocolors_1.default.bold(" SUCCESS ")))} ${labelOut} : ${bodyOut}`);
        return;
    }
    if (level === "warn") {
        const parts = parseLabel(message, "WARN");
        writeStderr(`${ts} ${styles.text(padLabel(parts.label))} : ${styles.warn(parts.body)}`);
        return;
    }
    if (level === "error") {
        const parts = parseLabel(message, "ERROR");
        writeStderr(`${ts} ${styles.text(padLabel(parts.label))} : ${styles.error(parts.body)}`);
        return;
    }
    if (level === "sys" || level === "system" || level === "core") {
        const parts = parseLabel(message, "SYSTEM");
        const labelOut = grad ? grad.blueToRed(padLabel(parts.label)) : styles.text(padLabel(parts.label));
        const bodyOut = grad ? picocolors_1.default.dim(picocolors_1.default.blue(parts.body)) : styles.sys(parts.body);
        writeStdout(`${ts} ${labelOut} : ${bodyOut}`);
        return;
    }
    const parts = parseLabel(message, "SESSION");
    const labelOut = grad ? grad.coolStatus(padLabel(parts.label)) : styles.text(padLabel(parts.label));
    const bodyOut = grad ? grad.coolStatus(parts.body) : styles.info(parts.body);
    writeStdout(`${ts} ${labelOut} : ${bodyOut}`);
}
const baseLogger = logLine;
baseLogger.fca = (text) => baseLogger(`SESSION: ${text}`, "info");
baseLogger.sys = (text) => baseLogger(`SYSTEM: ${text}`, "sys");
baseLogger.success = (text) => baseLogger(text, "success");
baseLogger.warn = (text) => baseLogger(text, "warn");
baseLogger.error = (text) => baseLogger(text, "error");
baseLogger.showBanner = async () => {
    /* intentionally empty — no startup banner line */
};
baseLogger.startSpinner = async (text) => {
    await ensureUiLibs();
    if (!oraFactory || !process.stdout.isTTY)
        return null;
    const grad = getTheme() === "cyberpunk" ? loadGradientFns() : null;
    const line = grad ? grad.cyberpunk(text) : picocolors_1.default.cyan(text);
    const spinner = oraFactory({
        text: line,
        color: "cyan"
    });
    return typeof spinner.start === "function" ? spinner.start() : spinner;
};
baseLogger.runMethodLoadProgress = async (loaded) => {
    await ensureUiLibs();
    if (!progressCtor || !process.stdout.isTTY || loaded <= 0)
        return;
    const grad = getTheme() === "cyberpunk" ? loadGradientFns() : null;
    const prefix = grad ? grad.cyberpunk("fca · methods") : picocolors_1.default.cyan("fca · methods");
    const bar = new progressCtor({
        format: `${prefix} |{bar}| {percentage}% | {value}/{total}`,
        barCompleteChar: "\u2588",
        barIncompleteChar: "\u2591",
        hideCursor: true
    }, progressPreset ?? undefined);
    bar.start(loaded, 0);
    for (let i = 1; i <= loaded; i += 1) {
        bar.update(i);
    }
    bar.stop();
};
baseLogger.persistCheckpointOk = (spinner) => {
    if (spinner && typeof spinner.stop === "function") {
        spinner.stop();
    }
    baseLogger("SESSION: No checkpoint detected", "info");
};
baseLogger.persistLoginSuccess = (spinner) => {
    if (spinner && typeof spinner.stop === "function") {
        spinner.stop();
    }
};
baseLogger.persistLoginFail = (spinner) => {
    if (spinner && typeof spinner.stop === "function") {
        spinner.stop();
    }
};
exports.default = baseLogger;

export default module.exports;
