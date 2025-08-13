"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const Boom = __importStar(require("@hapi/boom"));
const crypto_1 = require("crypto");
class TokenService {
    static generateConversationToken() {
        const conversationId = (0, crypto_1.randomUUID)();
        const payload = {
            conversationId,
            createdAt: Date.now()
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET_CHAT_SESSION, {
            expiresIn: parseInt(process.env.CHAT_SESSION_EXPIRY),
            issuer: process.env.JWT_ISSUER
        });
        return { token, conversationId };
    }
    static generateAuthToken(payload) {
        const options = {
            expiresIn: parseInt(process.env.AUTH_TOKEN_EXPIRY),
            issuer: process.env.JWT_ISSUER
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET_AUTH, options);
        return token;
    }
    static verifyConversationToken(token) {
        const secret = process.env.JWT_SECRET_CHAT_SESSION;
        const decoded = jwt.verify(token, secret, {
            issuer: process.env.JWT_ISSUER
        });
        if (!decoded.conversationId || !decoded.createdAt) {
            throw Boom.unauthorized('Invalid token payload');
        }
        return decoded;
    }
    static verifyAuthToken(token) {
        const secret = process.env.JWT_SECRET_AUTH;
        const decoded = jwt.verify(token, secret, {
            issuer: process.env.JWT_ISSUER
        });
        if (!decoded.email || !decoded.organizationId) {
            throw Boom.unauthorized('Invalid token payload');
        }
        return decoded;
    }
    static isTokenExpired(token) {
        try {
            this.verifyConversationToken(token);
            return false;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                return true;
            }
            throw error;
        }
    }
}
exports.TokenService = TokenService;
