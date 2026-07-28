
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createGetCurrentUserIdCommand = createGetCurrentUserIdCommand;
function createGetCurrentUserIdCommand(deps) {
    const { ctx } = deps;
    return function getCurrentUserID() {
        return ctx.userID;
    };
}

export default module.exports;
const __export_createGetCurrentUserIdCommand = module.exports.createGetCurrentUserIdCommand;
export { __export_createGetCurrentUserIdCommand as createGetCurrentUserIdCommand };
