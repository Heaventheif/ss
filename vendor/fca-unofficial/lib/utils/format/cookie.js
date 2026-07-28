
const module = { exports: {} };
const exports = module.exports;

function formatCookie(arr, urlBase) {
    return `${arr[0]}=${arr[1]}; Path=${arr[3]}; Domain=${urlBase}.com`;
}
module.exports = {
    formatCookie
};

export default module.exports;
const __export_formatCookie = module.exports.formatCookie;
export { __export_formatCookie as formatCookie };
