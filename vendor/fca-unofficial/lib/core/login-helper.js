import loginHelper from "./login-helper.impl.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const login_helper_impl_1 = __importDefault(loginHelper);
const legacy = login_helper_impl_1.default;
module.exports = legacy;

export default module.exports;
