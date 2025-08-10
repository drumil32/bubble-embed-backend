"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationSchedulerService = void 0;
const logger_1 = require("../config/logger");
const redis_1 = require("../config/redis");
const conversation_archiver_service_1 = require("./conversation-archiver.service");
class ConversationSchedulerService {
    static startScheduler() {
        if (this.schedulerInterval) {
            logger_1.logger.warn('Conversation scheduler is already running');
            return;
        }
        logger_1.logger.info('Starting conversation archiver scheduler', {
            checkInterval: this.CHECK_INTERVAL / 1000 + ' seconds',
            archiveThreshold: this.ARCHIVE_THRESHOLD / 60 + ' minutes'
        });
        this.schedulerInterval = setInterval(async () => {
            await this.checkAndArchiveExpiringConversations();
        }, this.CHECK_INTERVAL);
        this.isRunning = true;
    }
    static stopScheduler() {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
            this.isRunning = false;
            logger_1.logger.info('Conversation scheduler stopped');
        }
    }
    static getStatus() {
        return {
            isRunning: this.isRunning,
            checkInterval: this.CHECK_INTERVAL,
            archiveThreshold: this.ARCHIVE_THRESHOLD
        };
    }
    static async checkAndArchiveExpiringConversations() {
        try {
            const client = redis_1.redisConnection.getClient();
            if (!redis_1.redisConnection.isClientConnected()) {
                logger_1.logger.warn('Redis not connected, skipping conversation archival check');
                return;
            }
            // Get all conversation keys
            const conversationKeys = await client.keys('conversation:*');
            if (conversationKeys.length === 0) {
                logger_1.logger.debug('No conversations found in Redis');
                return;
            }
            let archivedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            for (const key of conversationKeys) {
                try {
                    // Check if this is an archived marker key (skip it)
                    if (key.endsWith(':archived')) {
                        continue;
                    }
                    // Get TTL for the conversation key
                    const ttl = await client.ttl(key);
                    // Skip if key has no expiry or already expired
                    if (ttl === -1 || ttl === -2) {
                        continue;
                    }
                    // Archive if TTL is within threshold (2 minutes)
                    if (ttl <= this.ARCHIVE_THRESHOLD) {
                        // Check if already archived
                        const archivedMarker = await client.get(`${key}:archived`);
                        if (archivedMarker) {
                            skippedCount++;
                            continue;
                        }
                        // Get conversation data
                        const conversationData = await client.get(key);
                        if (!conversationData) {
                            logger_1.logger.warn('Conversation data not found for key', { key });
                            continue;
                        }
                        const conversation = JSON.parse(conversationData);
                        // Archive to MongoDB
                        await conversation_archiver_service_1.ConversationArchiverService.archiveConversation(conversation.conversationId, conversation);
                        // Mark as archived in Redis with same TTL as original key
                        await client.setEx(`${key}:archived`, ttl, '1');
                        archivedCount++;
                        logger_1.logger.debug('Conversation archived', {
                            conversationId: conversation.conversationId,
                            ttlRemaining: ttl
                        });
                    }
                }
                catch (error) {
                    errorCount++;
                    logger_1.logger.error('Error processing conversation for archival', {
                        key,
                        error: error.message
                    });
                }
            }
            if (archivedCount > 0 || errorCount > 0) {
                logger_1.logger.info('Conversation archival batch completed', {
                    totalChecked: conversationKeys.length,
                    archived: archivedCount,
                    skipped: skippedCount,
                    errors: errorCount
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error in conversation archival scheduler', {
                error: error.message,
                stack: error.stack
            });
        }
    }
    // Manual trigger for testing
    static async triggerArchivalCheck() {
        logger_1.logger.info('Manual archival check triggered');
        const beforeStats = await this.getArchivalStats();
        await this.checkAndArchiveExpiringConversations();
        const afterStats = await this.getArchivalStats();
        return {
            archived: afterStats.archived - beforeStats.archived,
            errors: afterStats.errors - beforeStats.errors
        };
    }
    static async getArchivalStats() {
        try {
            const client = redis_1.redisConnection.getClient();
            const archivedKeys = await client.keys('conversation:*:archived');
            return {
                archived: archivedKeys.length,
                errors: 0 // Could track errors in Redis if needed
            };
        }
        catch (error) {
            return { archived: 0, errors: 0 };
        }
    }
    // Health check method
    static async healthCheck() {
        try {
            const client = redis_1.redisConnection.getClient();
            const isRedisConnected = redis_1.redisConnection.isClientConnected();
            let activeConversations = 0;
            let archivedMarkers = 0;
            if (isRedisConnected) {
                const conversationKeys = await client.keys('conversation:*');
                activeConversations = conversationKeys.filter(key => !key.endsWith(':archived')).length;
                archivedMarkers = conversationKeys.filter(key => key.endsWith(':archived')).length;
            }
            return {
                schedulerRunning: this.isRunning,
                redisConnected: isRedisConnected,
                activeConversations,
                archivedMarkers
            };
        }
        catch (error) {
            logger_1.logger.error('Health check failed', { error: error.message });
            return {
                schedulerRunning: this.isRunning,
                redisConnected: false,
                activeConversations: 0,
                archivedMarkers: 0
            };
        }
    }
}
exports.ConversationSchedulerService = ConversationSchedulerService;
ConversationSchedulerService.schedulerInterval = null;
ConversationSchedulerService.CHECK_INTERVAL = 30000; // 30 seconds
ConversationSchedulerService.ARCHIVE_THRESHOLD = 120; // 2 minutes in seconds
ConversationSchedulerService.isRunning = false;
