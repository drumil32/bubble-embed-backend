import { logger } from '../config/logger';
import { redisConnection } from '../config/redis';
import { ConversationArchiverService } from './conversation-archiver.service';

export class ConversationSchedulerService {
  private static schedulerInterval: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL = 30000; // 30 seconds
  private static readonly ARCHIVE_THRESHOLD = 120; // 2 minutes in seconds
  private static isRunning = false;

  static startScheduler(): void {
    if (this.schedulerInterval) {
      logger.warn('Conversation scheduler is already running');
      return;
    }

    logger.info('Starting conversation archiver scheduler', {
      checkInterval: this.CHECK_INTERVAL / 1000 + ' seconds',
      archiveThreshold: this.ARCHIVE_THRESHOLD / 60 + ' minutes'
    });

    this.schedulerInterval = setInterval(async () => {
      await this.checkAndArchiveExpiringConversations();
    }, this.CHECK_INTERVAL);

    this.isRunning = true;
  }

  static stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      this.isRunning = false;
      logger.info('Conversation scheduler stopped');
    }
  }

  static getStatus(): { isRunning: boolean; checkInterval: number; archiveThreshold: number } {
    return {
      isRunning: this.isRunning,
      checkInterval: this.CHECK_INTERVAL,
      archiveThreshold: this.ARCHIVE_THRESHOLD
    };
  }

  private static async checkAndArchiveExpiringConversations(): Promise<void> {
    try {
      const client = redisConnection.getClient();
      
      if (!redisConnection.isClientConnected()) {
        logger.warn('Redis not connected, skipping conversation archival check');
        return;
      }

      // Get all conversation keys
      const conversationKeys = await client.keys('conversation:*');
      
      if (conversationKeys.length === 0) {
        logger.debug('No conversations found in Redis');
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
              logger.warn('Conversation data not found for key', { key });
              continue;
            }

            const conversation = JSON.parse(conversationData);
            
            // Archive to MongoDB
            await ConversationArchiverService.archiveConversation(
              conversation.conversationId, 
              conversation
            );

            // Mark as archived in Redis with same TTL as original key
            await client.setEx(`${key}:archived`, ttl, '1');

            archivedCount++;
            logger.debug('Conversation archived', { 
              conversationId: conversation.conversationId, 
              ttlRemaining: ttl 
            });
          }

        } catch (error: any) {
          errorCount++;
          logger.error('Error processing conversation for archival', {
            key,
            error: error.message
          });
        }
      }

      if (archivedCount > 0 || errorCount > 0) {
        logger.info('Conversation archival batch completed', {
          totalChecked: conversationKeys.length,
          archived: archivedCount,
          skipped: skippedCount,
          errors: errorCount
        });
      }

    } catch (error: any) {
      logger.error('Error in conversation archival scheduler', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  // Manual trigger for testing
  static async triggerArchivalCheck(): Promise<{ archived: number; errors: number }> {
    logger.info('Manual archival check triggered');
    
    const beforeStats = await this.getArchivalStats();
    await this.checkAndArchiveExpiringConversations();
    const afterStats = await this.getArchivalStats();

    return {
      archived: afterStats.archived - beforeStats.archived,
      errors: afterStats.errors - beforeStats.errors
    };
  }

  private static async getArchivalStats(): Promise<{ archived: number; errors: number }> {
    try {
      const client = redisConnection.getClient();
      const archivedKeys = await client.keys('conversation:*:archived');
      return {
        archived: archivedKeys.length,
        errors: 0 // Could track errors in Redis if needed
      };
    } catch (error) {
      return { archived: 0, errors: 0 };
    }
  }

  // Health check method
  static async healthCheck(): Promise<{
    schedulerRunning: boolean;
    redisConnected: boolean;
    activeConversations: number;
    archivedMarkers: number;
  }> {
    try {
      const client = redisConnection.getClient();
      const isRedisConnected = redisConnection.isClientConnected();
      
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
    } catch (error: any) {
      logger.error('Health check failed', { error: error.message });
      return {
        schedulerRunning: this.isRunning,
        redisConnected: false,
        activeConversations: 0,
        archivedMarkers: 0
      };
    }
  }
}