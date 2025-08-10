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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Boom = __importStar(require("@hapi/boom"));
const crypto_1 = require("crypto");
class TokenService {
    static getJwtSecret() {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw Boom.internal('JWT_SECRET environment variable is not set');
        }
        return secret;
    }
    static generateConversationToken() {
        const conversationId = (0, crypto_1.randomUUID)();
        const payload = {
            conversationId,
            createdAt: Date.now()
        };
        const token = jsonwebtoken_1.default.sign(payload, this.getJwtSecret(), {
            expiresIn: '1h',
            issuer: 'chatbot-backend'
        });
        return { token, conversationId };
    }
    static verifyConversationToken(token) {
        const secret = this.getJwtSecret();
        const decoded = jsonwebtoken_1.default.verify(token, secret, {
            issuer: 'chatbot-backend'
        });
        if (!decoded.conversationId || !decoded.createdAt) {
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
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                return true;
            }
            throw error;
        }
    }
}
exports.TokenService = TokenService;
