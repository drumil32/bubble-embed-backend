import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';
import dotenv from 'dotenv';

dotenv.config();

class RedisConnection {
  private readonly client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL!
    });

    this.client.on('error', (error) => {
      logger.error('Redis connection error', error);
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      this.client.destroy();
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }
}

export const redisConnection = new RedisConnection();