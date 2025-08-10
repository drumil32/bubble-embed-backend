import jwt from 'jsonwebtoken';
import * as Boom from '@hapi/boom';
import { randomUUID } from 'crypto';

export interface ConversationTokenPayload {
  conversationId: string;
  createdAt: number;
}

export class TokenService {
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw Boom.internal('JWT_SECRET environment variable is not set');
    }
    return secret;
  }

  static generateConversationToken(): { token: string; conversationId: string } {
    const conversationId = randomUUID();
    const payload: ConversationTokenPayload = {
      conversationId,
      createdAt: Date.now()
    };

    const token = jwt.sign(payload, this.getJwtSecret(), {
      expiresIn: '1h',
      issuer: 'chatbot-backend'
    });

    return { token, conversationId };
  }

  static verifyConversationToken(token: string): ConversationTokenPayload {
    const secret = this.getJwtSecret();
    
    const decoded = jwt.verify(token, secret, {
      issuer: 'chatbot-backend'
    }) as ConversationTokenPayload;

    if (!decoded.conversationId || !decoded.createdAt) {
      throw Boom.unauthorized('Invalid token payload');
    }

    return decoded;
  }

  static isTokenExpired(token: string): boolean {
    try {
      this.verifyConversationToken(token);
      return false;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return true;
      }
      throw error;
    }
  }
}