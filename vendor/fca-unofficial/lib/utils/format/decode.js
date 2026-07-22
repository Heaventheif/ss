
const module = { exports: {} };
const exports = module.exports;

function decodeClientPayload(payload) {
    function utf8ArrayToStr(array) {
        let out = "";
        const len = array.length;
        let i = 0;
        while (i < len) {
            const c = array[i++];
            let char2;
            let char3;
            switch (c >> 4) {
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                    out += String.fromCharCode(c);
                    break;
                case 12:
                case 13:
                    char2 = array[i++];
                    out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f));
                    break;
                case 14:
                    char2 = array[i++];
                    char3 = array[i++];
                    out += String.fromCharCode(((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | (char3 & 0x3f));
                    break;
            }
        }
        return out;
    }
    return JSON.parse(utf8ArrayToStr(payload));
}
module.exports = {
    decodeClientPayload
};

export default module.exports;
const __export_decodeClientPayload = module.exports.decodeClientPayload;
export { __export_decodeClientPayload as decodeClientPayload };
