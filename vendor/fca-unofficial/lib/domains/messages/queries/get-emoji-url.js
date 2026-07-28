
const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createGetEmojiUrlQuery = createGetEmojiUrlQuery;
function createGetEmojiUrlQuery() {
    return function getEmojiUrl(character, size, pixelRatio = "1.0") {
        const codePoint = character.codePointAt(0);
        const ending = `${pixelRatio}/${size}/${codePoint?.toString(16)}.png`;
        let hash = 317426846;
        for (let index = 0; index < ending.length; index += 1) {
            hash = (hash << 5) - hash + ending.charCodeAt(index);
        }
        const shard = (hash & 255).toString(16);
        return `https://static.xx.fbcdn.net/images/emoji.php/v8/z${shard}/${ending}`;
    };
}

export default module.exports;
const __export_createGetEmojiUrlQuery = module.exports.createGetEmojiUrlQuery;
export { __export_createGetEmojiUrlQuery as createGetEmojiUrlQuery };
