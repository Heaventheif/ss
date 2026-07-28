import * as legacy_promise_1 from "../../../compat/legacy-promise.js";
import * as facebook_1 from "../../../transport/http/facebook.js";
import * as constants_1 from "../../../utils/constants.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogoutCommand = createLogoutCommand;
function createLogoutCommand(deps) {
    const { defaultFuncs, ctx, logInfo, logError } = deps;
    return function logout(callback) {
        const { callback: cb, promise } = (0, legacy_promise_1.createLegacyPromise)(callback);
        (0, facebook_1.postWithLoginCheck)({
            defaultFuncs,
            ctx,
            url: "https://www.facebook.com/bluebar/modern_settings_menu/?help_type=364455653583099&show_contextual_help=1",
            form: { pmid: "0" }
        })
            .then((resData) => {
            const elem = resData.jsmods.instances[0][2][0].filter((value) => value.value === "logout")[0];
            const html = resData.jsmods.markup.filter((value) => value[0] === elem.markup.__m)[0][1].__html;
            return (0, facebook_1.postAndSaveCookies)({
                defaultFuncs,
                ctx,
                url: "https://www.facebook.com/logout.php",
                form: {
                    fb_dtsg: (0, constants_1.getFrom)(html, '"fb_dtsg" value="', '"'),
                    ref: (0, constants_1.getFrom)(html, '"ref" value="', '"'),
                    h: (0, constants_1.getFrom)(html, '"h" value="', '"')
                }
            });
        })
            .then((res) => {
            if (!res.headers) {
                throw { error: "An error occurred when logging out." };
            }
            return (0, facebook_1.getAndSaveCookies)({
                defaultFuncs,
                ctx,
                url: res.headers.location
            });
        })
            .then(() => {
            ctx.loggedIn = false;
            logInfo?.("logout", "Logged out successfully.");
            cb();
        })
            .catch((error) => {
            logError?.("logout", error);
            cb(error);
        });
        return promise;
    };
}

export default module.exports;
const __export_createLogoutCommand = module.exports.createLogoutCommand;
export { __export_createLogoutCommand as createLogoutCommand };
