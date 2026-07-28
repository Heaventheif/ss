import client from "./client.js";
import coreModules from "./core-modules.js";
import core from "./core.js";
import events from "./events.js";
import messaging from "./messaging.js";
import threads from "./threads.js";
import scheduler from "./scheduler.js";

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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(client, exports);
__exportStar(coreModules, exports);
__exportStar(core, exports);
__exportStar(events, exports);
__exportStar(messaging, exports);
__exportStar(threads, exports);
__exportStar(scheduler, exports);

export default module.exports;
