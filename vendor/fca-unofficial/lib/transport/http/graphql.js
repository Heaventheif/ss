import * as client_1 from "../../utils/client.js";

const module = { exports: {} };
const exports = module.exports;

Object.defineProperty(exports, "__esModule", { value: true });
exports.postGraphql = postGraphql;
exports.postGraphqlBatch = postGraphqlBatch;
async function postGraphql(params) {
    const { defaultFuncs, ctx, form, url = "https://www.facebook.com/api/graphql/", jar = ctx.jar } = params;
    return defaultFuncs
        .post(url, jar, form)
        .then((0, client_1.parseAndCheckLogin)(ctx, defaultFuncs));
}
async function postGraphqlBatch(params) {
    const { defaultFuncs, ctx, form, url = "https://www.facebook.com/api/graphqlbatch/" } = params;
    return defaultFuncs
        .post(url, ctx.jar, form)
        .then((0, client_1.parseAndCheckLogin)(ctx, defaultFuncs));
}

export default module.exports;
const __export_postGraphql = module.exports.postGraphql;
const __export_postGraphqlBatch = module.exports.postGraphqlBatch;
export { __export_postGraphql as postGraphql };
export { __export_postGraphqlBatch as postGraphqlBatch };
