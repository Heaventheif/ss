import * as utils_1 from "./utils.js";

const module = { exports: {} };
const exports = module.exports;

function binaryToDecimal(data) {
    let ret = "";
    while (data !== "0") {
        let end = 0;
        let fullName = "";
        for (let i = 0; i < data.length; i++) {
            end = 2 * end + parseInt(data[i], 10);
            if (end >= 10) {
                fullName += "1";
                end -= 10;
            }
            else {
                fullName += "0";
            }
        }
        ret = end.toString() + ret;
        data = fullName.slice(fullName.indexOf("1"));
    }
    return ret;
}
function generateOfflineThreadingID() {
    const ret = Date.now();
    const value = Math.floor(Math.random() * 4294967295);
    const str = ("0000000000000000000000" + value.toString(2)).slice(-22);
    const msgs = ret.toString(2) + str;
    return binaryToDecimal(msgs);
}
function generateThreadingID(clientID) {
    const k = Date.now();
    const l = Math.floor(Math.random() * 4294967295);
    return `<${k}:${l}-${clientID}@mail.projektitan.com>`;
}
function getGUID() {
    let sectionLength = Date.now();
    const id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.floor((sectionLength + Math.random() * 16) % 16);
        sectionLength = Math.floor(sectionLength / 16);
        const guid = (c === "x" ? r : (r & 7) | 8).toString(16);
        return guid;
    });
    return id;
}
function generateTimestampRelative() {
    const d = new Date();
    return `${d.getHours()}:${(0, utils_1.padZeros)(d.getMinutes())}`;
}
module.exports = {
    binaryToDecimal,
    generateOfflineThreadingID,
    generateThreadingID,
    getGUID,
    generateTimestampRelative
};

export default module.exports;
const __export_binaryToDecimal = module.exports.binaryToDecimal;
const __export_generateOfflineThreadingID = module.exports.generateOfflineThreadingID;
const __export_generateThreadingID = module.exports.generateThreadingID;
const __export_getGUID = module.exports.getGUID;
const __export_generateTimestampRelative = module.exports.generateTimestampRelative;
export { __export_binaryToDecimal as binaryToDecimal };
export { __export_generateOfflineThreadingID as generateOfflineThreadingID };
export { __export_generateThreadingID as generateThreadingID };
export { __export_getGUID as getGUID };
export { __export_generateTimestampRelative as generateTimestampRelative };
