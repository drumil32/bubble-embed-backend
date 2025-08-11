import OpenAI from 'openai';
import * as Boom from '@hapi/boom';
import { TokenService } from './token.service';
import { ConversationService, Conversation } from './conversation.service';
import { OrganizationService } from './organization.service';
import { IOrganization } from '../types/organization';
import { logger } from '../config/logger';

export interface ChatRequest {
  message: string;
  token?: string;
  domain: string;
  requestId: string;
}

export interface ChatResponse {
  reply: string;
  token: string;
  conversationId: string;
  messageCount: number;
  isNewConversation: boolean;
}

export class ChatService {
  static async processChat(chatRequest: ChatRequest): Promise<ChatResponse> {
    const { message, token, domain, requestId } = chatRequest;

    // Find organization based on domain
    const organization = await OrganizationService.getOrganizationByDomain(domain);
    if (!organization) {
      throw Boom.notFound(`No organization found for domain: ${domain}`);
    }

    logger.info('Organization found for chat', {
      requestId,
      organizationId: organization._id,
      organizationName: organization.name,
      matchedDomain: domain,
      allDomains: organization.domains
    });

    // Handle token logic and get conversation
    const { conversationId, conversationToken, isNewConversation } = 
      await this.handleConversationToken(token, requestId, organization);

    // Add user message to conversation
    const updatedConversation = await ConversationService.addUserMessage(conversationId, message.trim());

    // Get AI response
    const aiResponse = await this.generateAIResponse(updatedConversation, organization);

    // Store AI response in Redis
    const finalConversation = await ConversationService.addAssistantMessage(conversationId, aiResponse);

    logger.info('Chat exchange completed', {
      requestId,
      conversationId,
      messageCount: finalConversation.messages.length,
      isNewConversation
    });

    return {
      reply: aiResponse,
      token: conversationToken,
      conversationId,
      messageCount: finalConversation.messages.length,
      isNewConversation
    };
  }

  private static async handleConversationToken(token: string | undefined, requestId: string, organization: IOrganization) {
    let conversationId: string;
    let conversationToken: string;
    let isNewConversation = false;
    let conversation: Conversation;

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
    if (isNewConversation) {
      const baseMessage = this.createSystemMessage(organization);
      conversation = await ConversationService.createConversation(conversationId, String(organization._id), baseMessage);
    } else {
      const existingConversation = await ConversationService.getConversation(conversationId);
      if (!existingConversation) {
        throw Boom.notFound('Conversation not found or expired');
      }
      conversation = existingConversation;
    }

    return { conversationId, conversationToken, isNewConversation, conversation };
  }

  private static createSystemMessage(organization: IOrganization): string {
    return `
You are an intelligent AI assistant representing **${organization.name}**. You serve as the organization's virtual representative, helping visitors learn about the organization's work, mission, services, and impact.

## Your Role:
- You are the **official digital assistant** for ${organization.name}
- You provide accurate, helpful information about the organization
- You engage professionally with potential donors, volunteers, partners, clients, and beneficiaries
- You represent the organization's values and mission in every interaction

## Organization Context:

### About ${organization.name}:
${organization.organizationSummary}

### Detailed Information:
${organization.organizationInformation}

## Response Guidelines:

### ✅ DO:
- **Stay in character** as ${organization.name}'s official representative
- **Be helpful and informative** about the organization's work, programs, services, and impact
- **Use a warm, professional, and engaging tone** that reflects the organization's values
- **Provide specific details** when available (programs, services, contact information, ways to help)
- **Guide visitors** toward relevant actions (donate, volunteer, learn more, contact us)
- **Express gratitude** for visitor interest and support
- **Be transparent** when you don't have specific information

### ❌ DON'T:
- Provide information about other organizations unless directly comparing or referencing partnerships
- Give personal opinions unrelated to the organization's mission
- Make promises or commitments on behalf of the organization
- Share sensitive internal information
- Discuss controversial topics unless directly related to the organization's work

### 🎯 Key Topics You Can Help With:
- Mission, vision, and values
- Programs and services offered
- Impact and achievements
- How to get involved (volunteer, donate, partner)
- Contact information and locations
- Upcoming events and initiatives
- Success stories and testimonials
- Application processes (if applicable)

### 📞 When to Redirect:
If asked about specific personal cases, detailed financial information, or matters requiring human judgment, politely direct visitors to contact the organization directly.

**Remember: You are not just providing information—you are representing ${organization.name}'s commitment to its mission and the communities it serves. Be an ambassador that inspires confidence and trust.**

Welcome visitors warmly and ask how you can help them learn more about ${organization.name} today.
    `;
  }

  private static async generateAIResponse(conversation: Conversation, organization: IOrganization): Promise<string> {
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

      logger.info('Calling OpenAI Chat Completions API', {
        organizationId: organization._id,
        modelName: organization.modelName,
        messageCount: messages.length,
        aiProvider: organization.aiProviderLink
      });

      // Make API call to OpenAI
      const completion = await openai.chat.completions.create({
        model: organization.modelName,
        messages: messages,
        temperature: 0.7
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
}