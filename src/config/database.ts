import mongoose from 'mongoose';
import { logger } from './logger';

export const connectDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI!;
    
    await mongoose.connect(mongoUri);
    
    logger.info('Database connection established', {
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    });
  } catch (error) {
    logger.error('Database connection failed', error);
    throw error;
  }
};