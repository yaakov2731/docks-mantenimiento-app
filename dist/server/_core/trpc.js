"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectedProcedure = exports.publicProcedure = exports.router = exports.JWT_COOKIE = exports.JWT_SECRET = void 0;
exports.createContext = createContext;
const server_1 = require("@trpc/server");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("./env");
const _jwtSecret = (0, env_1.readEnv)('SESSION_SECRET');
if (!_jwtSecret)
    throw new Error('SESSION_SECRET env var is required');
exports.JWT_SECRET = _jwtSecret;
exports.JWT_COOKIE = 'docks_token';
function createContext({ req, res }) {
    let user = null;
    const token = req.cookies?.[exports.JWT_COOKIE];
    if (token) {
        try {
            user = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET, { algorithms: ['HS256'] });
        }
        catch { }
    }
    return { req, res, user };
}
const t = server_1.initTRPC.context().create();
exports.router = t.router;
exports.publicProcedure = t.procedure;
exports.protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.user)
        throw new server_1.TRPCError({ code: 'UNAUTHORIZED' });
    return next({ ctx: { ...ctx, user: ctx.user } });
});
