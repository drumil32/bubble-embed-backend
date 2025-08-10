import * as Boom from '@hapi/boom';
import { redisConnection } from '../config/redis';
import { logger } from '../config/logger';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Conversation {
  conversationId: string;
  organizationId: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export class ConversationService {
  private static getRedisKey(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  static async getConversation(conversationId: string): Promise<Conversation | null> {
    const client = redisConnection.getClient();
    
    if (!redisConnection.isClientConnected()) {
      throw Boom.serverUnavailable('Redis connection not available');
    }

    const data = await client.get(this.getRedisKey(conversationId));
    
    if (!data) {
      return null;
    }

    return JSON.parse(data) as Conversation;
  }

  static async createConversation(conversationId: string, organizationId: string, baseMessage: string): Promise<Conversation> {
    const conversation: Conversation = {
      conversationId,
      organizationId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.saveConversation(conversation);
    const message : Message = {
      role:'system',
      content:baseMessage,
      timestamp: Date.now()
    };
    await this.addMessage(conversationId,message);
    logger.info('New conversation created', { conversationId });
    
    return conversation;
  }

  static async addMessage(conversationId: string, message: Message): Promise<Conversation> {
    let conversation = await this.getConversation(conversationId);
    
    if (!conversation) {
      throw Boom.notFound('Conversation not found');
    }

    conversation.messages.push(message);
    conversation.updatedAt = Date.now();

    await this.saveConversation(conversation);
    
    logger.info('Message added to conversation', { 
      conversationId, 
      role: message.role,
      messageCount: conversation.messages.length 
    });

    return conversation;
  }

  static async addUserMessage(conversationId: string, content: string): Promise<Conversation> {
    const message: Message = {
      role: 'user',
      content,
      timestamp: Date.now()
    };

    return await this.addMessage(conversationId, message);
  }

  static async addAssistantMessage(conversationId: string, content: string): Promise<Conversation> {
    const message: Message = {
      role: 'assistant',
      content,
      timestamp: Date.now()
    };

    return await this.addMessage(conversationId, message);
  }

  private static async saveConversation(conversation: Conversation): Promise<void> {
    const client = redisConnection.getClient();
    
    if (!redisConnection.isClientConnected()) {
      throw Boom.serverUnavailable('Redis connection not available');
    }

    const key = this.getRedisKey(conversation.conversationId);
    const data = JSON.stringify(conversation);
    
    // Set with 1 hour expiration (matching JWT token expiration)
    await client.setEx(key, 3600, data);
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    const client = redisConnection.getClient();
    
    if (!redisConnection.isClientConnected()) {
      throw Boom.serverUnavailable('Redis connection not available');
    }

    await client.del(this.getRedisKey(conversationId));
    
    logger.info('Conversation deleted', { conversationId });
  }
}