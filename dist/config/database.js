"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./logger");
const connectDatabase = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        await mongoose_1.default.connect(mongoUri);
        logger_1.logger.info('Database connection established', {
            database: mongoose_1.default.connection.name,
            host: mongoose_1.default.connection.host,
            port: mongoose_1.default.connection.port
        });
    }
    catch (error) {
        logger_1.logger.error('Database connection failed', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
