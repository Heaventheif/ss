
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.getType = getType;
exports.formatID = formatID;
exports.padZeros = padZeros;
exports.arrayToObject = arrayToObject;
exports.arrToForm = arrToForm;
exports.getData_Path = getData_Path;
exports.setData_Path = setData_Path;
exports.getPaths = getPaths;
exports.cleanHTML = cleanHTML;
exports.getCurrentTimestamp = getCurrentTimestamp;
exports.getSignatureID = getSignatureID;
function getType(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
}
function formatID(id) {
    if (id !== undefined && id !== null)
        return id.replace(/(fb)?id[:.]/, "");
    return id;
}
function padZeros(val, len = 2) {
    let out = String(val);
    while (out.length < len)
        out = "0" + out;
    return out;
}
function arrayToObject(arr, getKey, getValue) {
    return arr.reduce((acc, val) => {
        acc[getKey(val)] = getValue(val);
        return acc;
    }, {});
}
function arrToForm(form) {
    return arrayToObject(form, (v) => v.name, (v) => v.val);
}
function getData_Path(Obj, Arr, Stt) {
    if (Arr.length === 0 && Obj !== undefined) {
        return Obj;
    }
    if (Obj === undefined) {
        return Stt;
    }
    const head = Arr[0];
    if (head === undefined) {
        return Stt;
    }
    const tail = Arr.slice(1);
    return getData_Path(Obj[head], tail, Stt++);
}
function setData_Path(obj, path, value) {
    if (!path.length) {
        return obj;
    }
    const currentKey = path[0];
    let currentObj = obj[currentKey];
    if (!currentObj) {
        obj[currentKey] = value;
        currentObj = obj[currentKey];
    }
    path.shift();
    if (!path.length) {
        currentObj = value;
    }
    else {
        currentObj = setData_Path(currentObj, path, value);
    }
    return obj;
}
function getPaths(obj, parentPath = []) {
    let paths = [];
    for (const prop in obj) {
        if (typeof obj[prop] === "object" && obj[prop] !== null) {
            paths = paths.concat(getPaths(obj[prop], [...parentPath, prop]));
        }
        else {
            paths.push([...parentPath, prop]);
        }
    }
    return paths;
}
function cleanHTML(text) {
    let out = text;
    out = out.replace(/(<br>)|(<\/?i>)|(<\/?em>)|(<\/?b>)|(!?~)|(&amp;)|(&#039;)|(&lt;)|(&gt;)|(&quot;)/g, (match) => {
        switch (match) {
            case "<br>":
                return "\n";
            case "<i>":
            case "<em>":
            case "</i>":
            case "</em>":
                return "*";
            case "<b>":
            case "</b>":
                return "**";
            case "~!":
            case "!~":
                return "||";
            case "&amp;":
                return "&";
            case "&#039;":
                return "'";
            case "&lt;":
                return "<";
            case "&gt;":
                return ">";
            case "&quot;":
                return '"';
            default:
                return match;
        }
    });
    return out;
}
function getCurrentTimestamp() {
    return Date.now();
}
function getSignatureID() {
    return Math.floor(Math.random() * 2147483648).toString(16);
}

export default module.exports;
const __export_getType = module.exports.getType;
const __export_formatID = module.exports.formatID;
const __export_padZeros = module.exports.padZeros;
const __export_arrayToObject = module.exports.arrayToObject;
const __export_arrToForm = module.exports.arrToForm;
const __export_getData_Path = module.exports.getData_Path;
const __export_setData_Path = module.exports.setData_Path;
const __export_getPaths = module.exports.getPaths;
const __export_cleanHTML = module.exports.cleanHTML;
const __export_getCurrentTimestamp = module.exports.getCurrentTimestamp;
const __export_getSignatureID = module.exports.getSignatureID;
export { __export_getType as getType };
export { __export_formatID as formatID };
export { __export_padZeros as padZeros };
export { __export_arrayToObject as arrayToObject };
export { __export_arrToForm as arrToForm };
export { __export_getData_Path as getData_Path };
export { __export_setData_Path as setData_Path };
export { __export_getPaths as getPaths };
export { __export_cleanHTML as cleanHTML };
export { __export_getCurrentTimestamp as getCurrentTimestamp };
export { __export_getSignatureID as getSignatureID };
