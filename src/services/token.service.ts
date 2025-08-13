import * as jwt from 'jsonwebtoken';
import * as Boom from '@hapi/boom';
import { randomUUID } from 'crypto';

export interface ConversationTokenPayload {
  conversationId: string;
  createdAt: number;
}

export interface AuthTokenPayload {
  email: string;
  organizationId: string;
}

export class TokenService {

  static generateConversationToken(): { token: string; conversationId: string } {
    const conversationId = randomUUID();
    const payload: ConversationTokenPayload = {
      conversationId,
      createdAt: Date.now()
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET_CHAT_SESSION!, {
      expiresIn: parseInt(process.env.CHAT_SESSION_EXPIRY!), 
      issuer: process.env.JWT_ISSUER
    });

    return { token, conversationId };
  }

  static generateAuthToken(payload: AuthTokenPayload): string {
    const options: jwt.SignOptions = {
      expiresIn: parseInt(process.env.AUTH_TOKEN_EXPIRY!), 
      issuer: process.env.JWT_ISSUER
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET_AUTH!,options);
    return token;
  }

  static verifyConversationToken(token: string): ConversationTokenPayload {
    const secret = process.env.JWT_SECRET_CHAT_SESSION!;

    const decoded = jwt.verify(token, secret, {
      issuer: process.env.JWT_ISSUER
    }) as ConversationTokenPayload;

    if (!decoded.conversationId || !decoded.createdAt) {
      throw Boom.unauthorized('Invalid token payload');
    }

    return decoded;
  }

  static verifyAuthToken(token: string): AuthTokenPayload {
    const secret = process.env.JWT_SECRET_AUTH!;

    const decoded = jwt.verify(token, secret, {
      issuer: process.env.JWT_ISSUER
    }) as AuthTokenPayload;

    if (!decoded.email || !decoded.organizationId) {
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