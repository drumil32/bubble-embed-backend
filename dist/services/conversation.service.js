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
exports.ConversationService = void 0;
const Boom = __importStar(require("@hapi/boom"));
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
class ConversationService {
    static getRedisKey(conversationId) {
        return `conversation:${conversationId}`;
    }
    static async getConversation(conversationId) {
        const client = redis_1.redisConnection.getClient();
        if (!redis_1.redisConnection.isClientConnected()) {
            throw Boom.serverUnavailable('Redis connection not available');
        }
        const data = await client.get(this.getRedisKey(conversationId));
        if (!data) {
            return null;
        }
        return JSON.parse(data);
    }
    static async createConversation(conversationId, organizationId, baseMessage) {
        const conversation = {
            conversationId,
            organizationId,
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await this.saveConversation(conversation);
        const message = {
            role: 'system',
            content: baseMessage,
            timestamp: Date.now()
        };
        await this.addMessage(conversationId, message);
        logger_1.logger.info('New conversation created', { conversationId });
        return conversation;
    }
    static async addMessage(conversationId, message) {
        let conversation = await this.getConversation(conversationId);
        if (!conversation) {
            throw Boom.notFound('Conversation not found');
        }
        conversation.messages.push(message);
        conversation.updatedAt = Date.now();
        await this.saveConversation(conversation);
        logger_1.logger.info('Message added to conversation', {
            conversationId,
            role: message.role,
            messageCount: conversation.messages.length
        });
        return conversation;
    }
    static async addUserMessage(conversationId, content) {
        const message = {
            role: 'user',
            content,
            timestamp: Date.now()
        };
        return await this.addMessage(conversationId, message);
    }
    static async addAssistantMessage(conversationId, content) {
        const message = {
            role: 'assistant',
            content,
            timestamp: Date.now()
        };
        return await this.addMessage(conversationId, message);
    }
    static async saveConversation(conversation) {
        const client = redis_1.redisConnection.getClient();
        if (!redis_1.redisConnection.isClientConnected()) {
            throw Boom.serverUnavailable('Redis connection not available');
        }
        const key = this.getRedisKey(conversation.conversationId);
        const data = JSON.stringify(conversation);
        // Set with 1 hour expiration (matching JWT token expiration)
        await client.setEx(key, 3600, data);
    }
    static async deleteConversation(conversationId) {
        const client = redis_1.redisConnection.getClient();
        if (!redis_1.redisConnection.isClientConnected()) {
            throw Boom.serverUnavailable('Redis connection not available');
        }
        await client.del(this.getRedisKey(conversationId));
        logger_1.logger.info('Conversation deleted', { conversationId });
    }
}
exports.ConversationService = ConversationService;
