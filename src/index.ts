import { createApp } from './app';
import { connectDatabase } from './config/database';
import { redisConnection } from './config/redis';
import { logger } from './config/logger';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDatabase();
    await redisConnection.connect();
    
    const app = createApp();
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();