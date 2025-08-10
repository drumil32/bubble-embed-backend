import { createApp } from './app';
import { connectDatabase } from './config/database';
import { redisConnection } from './config/redis';
import { ConversationSchedulerService } from './services/conversation-scheduler.service';
import { logger } from './config/logger';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDatabase();
    await redisConnection.connect();
    
    // Start conversation archiver scheduler
    ConversationSchedulerService.startScheduler();
    
    const app = createApp();
    
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      ConversationSchedulerService.stopScheduler();
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      ConversationSchedulerService.stopScheduler();
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();