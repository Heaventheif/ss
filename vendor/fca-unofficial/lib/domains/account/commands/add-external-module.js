import format from "../../../utils/format/index.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAddExternalModuleCommand = createAddExternalModuleCommand;
const format_1 = __importDefault(format);
const { getType } = format_1.default;
function createAddExternalModuleCommand(deps) {
    const { defaultFuncs, api, ctx } = deps;
    return function addExternalModule(moduleObj) {
        if (getType(moduleObj) !== "Object") {
            throw new Error(`moduleObj must be an object, not ${getType(moduleObj)}!`);
        }
        for (const apiName in moduleObj) {
            if (getType(moduleObj[apiName]) === "Function") {
                api[apiName] = moduleObj[apiName](defaultFuncs, api, ctx);
            }
            else {
                throw new Error(`Item "${apiName}" in moduleObj must be a function, not ${getType(moduleObj[apiName])}!`);
            }
        }
    };
}

export default module.exports;
const __export_createAddExternalModuleCommand = module.exports.createAddExternalModuleCommand;
export { __export_createAddExternalModuleCommand as createAddExternalModuleCommand };
