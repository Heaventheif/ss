import * as client_1 from "./client.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.setProxy = setProxy;
function setProxy(proxyUrl) {
    (0, client_1.setClientProxy)(proxyUrl || null);
    // نبقي هالحقول موجودة بـ defaults حفاظًا على التوافق مع أي كود قديم
    // بيقرأها مباشرة (مثلاً تشخيص/لوغ)، بس هي مش مستخدمة فعليًا بالطلب.
    client_1.client.defaults.proxy = proxyUrl ? proxyUrl : false;
}

export default module.exports;
const __export_setProxy = module.exports.setProxy;
export { __export_setProxy as setProxy };
