import nodehttps from "node:https";
import node_child_process_1 from "node:child_process";
import package$0 from "../../package.json" with { type: "json" };

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkForPackageUpdate = checkForPackageUpdate;
exports.runConfiguredUpdateCheck = runConfiguredUpdateCheck;
const node_https_1 = __importDefault(nodehttps);
const package_json_1 = __importDefault(package$0);
function compareVersionPart(left, right) {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
        if (leftNumber === rightNumber) {
            return 0;
        }
        return leftNumber > rightNumber ? 1 : -1;
    }
    return left.localeCompare(right);
}
function compareSemver(left, right) {
    const leftParts = left.replace(/^v/i, "").split("-");
    const rightParts = right.replace(/^v/i, "").split("-");
    const leftCore = leftParts[0].split(".");
    const rightCore = rightParts[0].split(".");
    const length = Math.max(leftCore.length, rightCore.length);
    for (let index = 0; index < length; index++) {
        const result = compareVersionPart(leftCore[index] || "0", rightCore[index] || "0");
        if (result !== 0) {
            return result;
        }
    }
    if (leftParts.length === 1 && rightParts.length === 1) {
        return 0;
    }
    if (leftParts.length === 1) {
        return 1;
    }
    if (rightParts.length === 1) {
        return -1;
    }
    return compareVersionPart(leftParts.slice(1).join("-"), rightParts.slice(1).join("-"));
}
function normalizeRegistryUrl(value) {
    return value.replace(/\/+$/, "");
}
function readUpdateConfig(input) {
    if (input && "checkUpdate" in input) {
        return input.checkUpdate;
    }
    const fallback = {
        enabled: true,
        install: false,
        notifyIfCurrent: false,
        packageName: package_json_1.default.name,
        registryUrl: package_json_1.default.publishConfig?.registry || "https://registry.npmjs.org",
        timeoutMs: 10000
    };
    return { ...fallback, ...(input || {}) };
}
function fetchLatestVersion(config) {
    const url = `${normalizeRegistryUrl(config.registryUrl)}/${encodeURIComponent(config.packageName)}/latest`;
    return new Promise((resolve, reject) => {
        const request = node_https_1.default.get(url, {
            headers: {
                Accept: "application/json",
                "User-Agent": `${config.packageName}-update-check`
            },
            timeout: config.timeoutMs
        }, (response) => {
            let body = "";
            response.on("data", (chunk) => {
                body += chunk;
            });
            response.on("end", () => {
                try {
                    const payload = JSON.parse(body);
                    const version = payload?.version;
                    if (!version || typeof version !== "string") {
                        reject(new Error("Invalid version payload from registry"));
                        return;
                    }
                    resolve(version);
                }
                catch (error) {
                    reject(error);
                }
            });
        });
        request.on("timeout", () => {
            request.destroy(new Error("Update check timed out"));
        });
        request.on("error", reject);
    });
}
function installLatestPackage(config, latestVersion) {
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    const dependency = `${config.packageName}@${latestVersion}`;
    return new Promise((resolve, reject) => {
        (0, node_child_process_1.execFile)(npmCommand, ["i", dependency], { cwd: process.cwd() }, (error, _stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message));
                return;
            }
            resolve();
        });
    });
}
let inflightCheck = null;
async function checkForPackageUpdate(input, logger) {
    const config = readUpdateConfig(input);
    if (!config.enabled) {
        return null;
    }
    if (inflightCheck) {
        return inflightCheck;
    }
    inflightCheck = (async () => {
        const currentVersion = package_json_1.default.version;
        const latestVersion = await fetchLatestVersion(config);
        const updateAvailable = compareSemver(latestVersion, currentVersion) > 0;
        if (!updateAvailable) {
            if (config.notifyIfCurrent) {
                logger?.(`You're already on the latest version (${currentVersion})`, "info");
            }
            return {
                packageName: config.packageName,
                currentVersion,
                latestVersion,
                updateAvailable: false,
                installed: false
            };
        }
        logger?.(`Update available for ${config.packageName}: ${currentVersion} -> ${latestVersion}`, "warn");
        if (!config.install) {
            return {
                packageName: config.packageName,
                currentVersion,
                latestVersion,
                updateAvailable: true,
                installed: false
            };
        }
        logger?.(`Installing ${config.packageName}@${latestVersion}`, "info");
        await installLatestPackage(config, latestVersion);
        logger?.(`Installed ${config.packageName}@${latestVersion}. Restart to apply.`, "info");
        return {
            packageName: config.packageName,
            currentVersion,
            latestVersion,
            updateAvailable: true,
            installed: true
        };
    })().finally(() => {
        inflightCheck = null;
    });
    return inflightCheck;
}
async function runConfiguredUpdateCheck(config, logger) {
    try {
        return await checkForPackageUpdate(config, logger);
    }
    catch (error) {
        logger?.(`Cannot check for updates: ${error && error.message ? error.message : String(error)}`, "warn");
        return null;
    }
}

export default module.exports;
const __export_checkForPackageUpdate = module.exports.checkForPackageUpdate;
const __export_runConfiguredUpdateCheck = module.exports.runConfiguredUpdateCheck;
export { __export_checkForPackageUpdate as checkForPackageUpdate };
export { __export_runConfiguredUpdateCheck as runConfiguredUpdateCheck };
