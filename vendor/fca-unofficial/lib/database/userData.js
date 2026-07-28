import models from "./models/index.js";
import * as helpers_1 from "./helpers.js";

const module = { exports: {} };
const exports = module.exports;

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createUserData;
const models_1 = __importDefault(models);
const User = models_1.default.User;
const ID_FIELD = "userID";
function stubUser(userID, data) {
    return { user: { userID, ...(0, helpers_1.normalizePayload)(data || {}, "data") }, created: true };
}
function createUserData(_bot) {
    return {
        async create(userID, data) {
            if (!User)
                return stubUser((0, helpers_1.validateId)(userID, ID_FIELD), data);
            try {
                const uid = (0, helpers_1.validateId)(userID, ID_FIELD);
                (0, helpers_1.validateData)(data);
                const payload = (0, helpers_1.normalizePayload)(data, "data");
                let user = await User.findOne({ where: { userID: uid } });
                if (user)
                    return { user: user.get(), created: false };
                user = await User.create({ userID: uid, ...payload });
                return { user: user.get(), created: true };
            }
            catch (err) {
                throw (0, helpers_1.wrapError)("Failed to create user", err);
            }
        },
        async get(userID) {
            if (!User)
                return null;
            try {
                const uid = (0, helpers_1.validateId)(userID, ID_FIELD);
                const user = await User.findOne({ where: { userID: uid } });
                return user ? user.get() : null;
            }
            catch (err) {
                throw (0, helpers_1.wrapError)("Failed to get user", err);
            }
        },
        async update(userID, data) {
            if (!User)
                return {
                    user: { userID: (0, helpers_1.validateId)(userID, ID_FIELD), ...(0, helpers_1.normalizePayload)(data || {}, "data") },
                    created: false
                };
            try {
                const uid = (0, helpers_1.validateId)(userID, ID_FIELD);
                (0, helpers_1.validateData)(data);
                const payload = (0, helpers_1.normalizePayload)(data, "data");
                const user = await User.findOne({ where: { userID: uid } });
                if (user) {
                    await user.update(payload);
                    return { user: user.get(), created: false };
                }
                const newUser = await User.create({ userID: uid, ...payload });
                return { user: newUser.get(), created: true };
            }
            catch (err) {
                throw (0, helpers_1.wrapError)("Failed to update user", err);
            }
        },
        async del(userID) {
            if (!User)
                throw new Error(helpers_1.DB_NOT_INIT);
            try {
                const uid = (0, helpers_1.validateId)(userID, ID_FIELD);
                const result = await User.destroy({ where: { userID: uid } });
                if (result === 0)
                    throw new Error("No user found with the specified userID");
                return result;
            }
            catch (err) {
                throw (0, helpers_1.wrapError)("Failed to delete user", err);
            }
        },
        async delAll() {
            if (!User)
                return 0;
            try {
                return await User.destroy({ where: {} });
            }
            catch (err) {
                throw (0, helpers_1.wrapError)("Failed to delete all users", err);
            }
        },
        async getAll(keys = null) {
            if (!User)
                return [];
            try {
                const attributes = (0, helpers_1.normalizeAttributes)(keys);
                const rows = await User.findAll({ attributes });
                return rows.map((u) => u.get());
            }
            catch (err) {
                throw (0, helpers_1.wrapError)("Failed to get all users", err);
            }
        }
    };
}

export default module.exports;
