"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const conversation_scheduler_service_1 = require("./services/conversation-scheduler.service");
const logger_1 = require("./config/logger");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
async function startServer() {
    try {
        await (0, database_1.connectDatabase)();
        await redis_1.redisConnection.connect();
        // Start conversation archiver scheduler
        conversation_scheduler_service_1.ConversationSchedulerService.startScheduler();
        const app = (0, app_1.createApp)();
        const server = app.listen(PORT, () => {
            logger_1.logger.info(`Server running on port ${PORT}`);
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger_1.logger.info('SIGTERM received, shutting down gracefully');
            conversation_scheduler_service_1.ConversationSchedulerService.stopScheduler();
            server.close(() => {
                logger_1.logger.info('Process terminated');
                process.exit(0);
            });
        });
        process.on('SIGINT', () => {
            logger_1.logger.info('SIGINT received, shutting down gracefully');
            conversation_scheduler_service_1.ConversationSchedulerService.stopScheduler();
            server.close(() => {
                logger_1.logger.info('Process terminated');
                process.exit(0);
            });
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
