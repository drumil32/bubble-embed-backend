"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = void 0;
const redis_1 = require("redis");
const logger_1 = require("./logger");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class RedisConnection {
    constructor() {
        this.isConnected = false;
        this.client = (0, redis_1.createClient)({
            url: process.env.REDIS_URL
        });
        this.client.on('error', (error) => {
            logger_1.logger.error('Redis connection error', error);
        });
        this.client.on('connect', () => {
            logger_1.logger.info('Redis connected');
            this.isConnected = true;
        });
        this.client.on('disconnect', () => {
            logger_1.logger.warn('Redis disconnected');
            this.isConnected = false;
        });
    }
    async connect() {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }
    async disconnect() {
        if (this.isConnected) {
            this.client.destroy();
        }
    }
    getClient() {
        return this.client;
    }
    isClientConnected() {
        return this.isConnected;
    }
}
exports.redisConnection = new RedisConnection();
