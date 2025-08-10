import { Request, Response, NextFunction } from 'express';
import * as Boom from '@hapi/boom';
import { ChatService } from '../services/chat.service';

export const chat = async (req: Request, res: Response, next: NextFunction) => {
  const { requestId, finalDomain } = req;
  const { message, token } = req.body;

  // Validate required message field
  if (!message || typeof message !== 'string' || !message.trim()) {
    return next(Boom.badRequest('Message is required and must be a non-empty string'));
  }

  // Process chat using the chat service
  const chatResponse = await ChatService.processChat({
    message: message.trim(),
    token,
    domain: finalDomain,
    requestId
  });

  res.status(200).json({
    success: true,
    data: chatResponse
  });
};