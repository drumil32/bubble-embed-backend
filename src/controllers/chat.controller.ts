import { Request, Response, NextFunction } from 'express';
import * as Boom from '@hapi/boom';
import { TokenService } from '../services/token.service';
import { Conversation, ConversationService } from '../services/conversation.service';
import { OrganizationService } from '../services/organization.service';
import { logger } from '../config/logger';
import OpenAI from 'openai';
import { IOrganization } from '../types/organization';

export const chat = async (req: Request, res: Response, next: NextFunction) => {
  const { requestId, finalDomain } = req;
  const { message, token } = req.body;

  // Validate required message field
  if (!message || typeof message !== 'string' || !message.trim()) {
    return next(Boom.badRequest('Message is required and must be a non-empty string'));
  }

  // Find organization based on domain
  const organization = await OrganizationService.getOrganizationByDomain(finalDomain);
  if (!organization) {
    return next(Boom.notFound(`No organization found for domain: ${finalDomain}`));
  }

  logger.info('Organization found for chat', {
    requestId,
    organizationId: organization._id,
    organizationName: organization.name,
    domain: finalDomain
  });

  let conversationId: string;
  let conversationToken: string;
  let isNewConversation = false;

  // Handle token logic
  if (token) {
    // Existing conversation
    try {
      const payload = TokenService.verifyConversationToken(token);
      conversationId = payload.conversationId;
      conversationToken = token;

      logger.info('Continuing existing conversation', { 
        requestId, 
        conversationId 
      });
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw Boom.unauthorized('Conversation token has expired. Please start a new conversation.');
      } else if (error.name === 'JsonWebTokenError') {
        throw Boom.unauthorized('Invalid conversation token');
      } else {
        throw error;
      }
    }
  } else {
    // New conversation
    const tokenData = TokenService.generateConversationToken();
    conversationId = tokenData.conversationId;
    conversationToken = tokenData.token;
    isNewConversation = true;

    logger.info('Starting new conversation', { 
      requestId, 
      conversationId 
    });
  }

  // Get or create conversation
  let conversation;
  if (isNewConversation) {
    const baseMessage =`
      You are an AI assistant representing **${organization.name}**. Your sole purpose is to interact with visitors on ${organization.name}'s personal or professional website, specifically answering questions related to:

- ${organization.name}'s career, background, experience, achievements, and skills
- Information derived from ${organization.name}'s provided summary and LinkedIn profile

Your goal is to faithfully represent ${organization.name} in a professional, engaging, and articulate manner — as if you're speaking on their behalf to a potential client, employer, or collaborator.

You are provided with the following background:

## Summary:
${organization.organizationSummary}

## Organization Information:
${organization.organizationInformation}

### Instructions:
- Always stay in character as ${organization.name}.
- Respond only to queries related to ${organization.name}. If a question is not related to ${organization.name}, politely decline to answer.
- Do **not** provide explanations, opinions, or assistance outside the scope of {name}'s information.
- Keep responses relevant, factual, and to the point.
- If unsure about any specific detail, respond honestly by stating that the information is not available.

Begin your conversation with the user now, as ${organization.name}.
      `;
    conversation = await ConversationService.createConversation(conversationId,baseMessage);
  } else {
    conversation = await ConversationService.getConversation(conversationId);
    if (!conversation) {
      return next(Boom.notFound('Conversation not found or expired'));
    }
  }

  // Add user message to conversation
  conversation = await ConversationService.addUserMessage(conversationId, message.trim());

  // Simulate AI response (replace this with actual AI API call)
  const aiResponse = await simulateAIResponse(conversation, organization);

  // Add AI response to conversation
  conversation = await ConversationService.addAssistantMessage(conversationId, aiResponse);

  logger.info('Chat exchange completed', {
    requestId,
    conversationId,
    messageCount: conversation.messages.length,
    isNewConversation
  });

  res.status(200).json({
    success: true,
    data: {
      reply: aiResponse,
      token: conversationToken,
      conversationId,
      messageCount: conversation.messages.length,
      isNewConversation
    }
  });
};

// AI response using OpenAI API
async function simulateAIResponse(conversation: Conversation, organization: IOrganization): Promise<string> {  
  try {
    // Initialize OpenAI client with organization's config
    const openai = new OpenAI({
      baseURL: organization.aiProviderLink,
      apiKey: organization.apiKey
    });

    // Convert conversation messages to OpenAI format
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    logger.info('Calling OpenAI API', {
      organizationId: organization._id,
      modelName: organization.modelName,
      messageCount: messages.length,
      aiProvider: organization.aiProviderLink
    });

    // Make API call to OpenAI
    const completion = await openai.chat.completions.create({
      model: organization.modelName,
      messages: messages,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    logger.info('OpenAI API response received', {
      organizationId: organization._id,
      responseLength: aiResponse.length,
      tokensUsed: completion.usage?.total_tokens || 0
    });

    return aiResponse;

  } catch (error: any) {
    logger.error('OpenAI API error', {
      organizationId: organization._id,
      error: error.message,
      stack: error.stack
    });

    // Fallback response on API error
    return `I apologize, but I'm experiencing technical difficulties at the moment. Please try again later or contact ${organization.name} directly for assistance.`;
  }
}