"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const openai_1 = __importDefault(require("openai"));
const Boom = __importStar(require("@hapi/boom"));
const token_service_1 = require("./token.service");
const conversation_service_1 = require("./conversation.service");
const organization_service_1 = require("./organization.service");
const logger_1 = require("../config/logger");
class ChatService {
    static async processChat(chatRequest) {
        const { message, token, domain, requestId } = chatRequest;
        // Find organization based on domain
        const organization = await organization_service_1.OrganizationService.getOrganizationByDomain(domain);
        if (!organization) {
            throw Boom.notFound(`No organization found for domain: ${domain}`);
        }
        logger_1.logger.info('Organization found for chat', {
            requestId,
            organizationId: organization._id,
            organizationName: organization.name,
            matchedDomain: domain,
            allDomains: organization.domains
        });
        // Handle token logic and get conversation
        const { conversationId, conversationToken, isNewConversation } = await this.handleConversationToken(token, requestId, organization);
        // Add user message to conversation
        const updatedConversation = await conversation_service_1.ConversationService.addUserMessage(conversationId, message.trim());
        // Get AI response
        const aiResponse = await this.generateAIResponse(updatedConversation, organization);
        // Store AI response in Redis
        const finalConversation = await conversation_service_1.ConversationService.addAssistantMessage(conversationId, aiResponse);
        logger_1.logger.info('Chat exchange completed', {
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
    static async handleConversationToken(token, requestId, organization) {
        let conversationId;
        let conversationToken;
        let isNewConversation = false;
        let conversation;
        if (token) {
            // Existing conversation
            try {
                const payload = token_service_1.TokenService.verifyConversationToken(token);
                conversationId = payload.conversationId;
                conversationToken = token;
                logger_1.logger.info('Continuing existing conversation', {
                    requestId,
                    conversationId
                });
            }
            catch (error) {
                if (error.name === 'TokenExpiredError') {
                    throw Boom.unauthorized('Conversation token has expired. Please start a new conversation.');
                }
                else if (error.name === 'JsonWebTokenError') {
                    throw Boom.unauthorized('Invalid conversation token');
                }
                else {
                    throw error;
                }
            }
        }
        else {
            // New conversation
            const tokenData = token_service_1.TokenService.generateConversationToken();
            conversationId = tokenData.conversationId;
            conversationToken = tokenData.token;
            isNewConversation = true;
            logger_1.logger.info('Starting new conversation', {
                requestId,
                conversationId
            });
        }
        // Get or create conversation
        if (isNewConversation) {
            const baseMessage = this.createSystemMessage(organization);
            conversation = await conversation_service_1.ConversationService.createConversation(conversationId, String(organization._id), baseMessage);
        }
        else {
            const existingConversation = await conversation_service_1.ConversationService.getConversation(conversationId);
            if (!existingConversation) {
                throw Boom.notFound('Conversation not found or expired');
            }
            conversation = existingConversation;
        }
        return { conversationId, conversationToken, isNewConversation, conversation };
    }
    static createSystemMessage(organization) {
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
    static async generateAIResponse(conversation, organization) {
        try {
            // Initialize OpenAI client with organization's config
            const openai = new openai_1.default({
                baseURL: organization.aiProviderLink,
                apiKey: organization.apiKey
            });
            // Convert conversation messages to OpenAI format
            const messages = conversation.messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            logger_1.logger.info('Calling OpenAI Chat Completions API', {
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
            logger_1.logger.info('OpenAI API response received', {
                organizationId: organization._id,
                responseLength: aiResponse.length,
                tokensUsed: completion.usage?.total_tokens || 0
            });
            return aiResponse;
        }
        catch (error) {
            logger_1.logger.error('OpenAI API error', {
                organizationId: organization._id,
                error: error.message,
                stack: error.stack
            });
            // Fallback response on API error
            return `I apologize, but I'm experiencing technical difficulties at the moment. Please try again later or contact ${organization.name} directly for assistance.`;
        }
    }
}
exports.ChatService = ChatService;
