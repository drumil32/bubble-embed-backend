"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationArchiverService = void 0;
const ConversationHistory_1 = require("../models/ConversationHistory");
const organization_service_1 = require("./organization.service");
const logger_1 = require("../config/logger");
class ConversationArchiverService {
    static async archiveConversation(conversationId, conversationData) {
        try {
            // Check if already archived to avoid duplicates
            const existingArchive = await ConversationHistory_1.ConversationHistory.findOne({ conversationId });
            if (existingArchive) {
                logger_1.logger.info('Conversation already archived', { conversationId });
                return;
            }
            // Get organization details using the organizationId from conversation
            const organization = await organization_service_1.OrganizationService.getOrganizationById(conversationData.organizationId);
            if (!organization) {
                logger_1.logger.error('Cannot archive conversation - organization not found', {
                    conversationId,
                    organizationId: conversationData.organizationId
                });
                return;
            }
            // Calculate conversation metrics
            const metrics = this.calculateConversationMetrics(conversationData);
            // Create conversation history record
            const conversationHistory = new ConversationHistory_1.ConversationHistory({
                conversationId: conversationData.conversationId,
                organizationId: organization._id,
                organizationName: organization.name,
                domain: organization.domain,
                messages: conversationData.messages,
                startedAt: new Date(conversationData.createdAt),
                endedAt: new Date(conversationData.updatedAt),
                totalMessages: metrics.totalMessages,
                userMessages: metrics.userMessages,
                assistantMessages: metrics.assistantMessages,
                systemMessages: metrics.systemMessages,
                duration: conversationData.updatedAt - conversationData.createdAt,
                firstUserMessage: metrics.firstUserMessage,
                lastUserMessage: metrics.lastUserMessage
            });
            await conversationHistory.save();
            logger_1.logger.info('Conversation archived successfully', {
                conversationId,
                organizationId: organization._id,
                organizationName: organization.name,
                totalMessages: metrics.totalMessages,
                duration: conversationHistory.duration
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to archive conversation', {
                conversationId,
                error: error.message,
                stack: error.stack
            });
        }
    }
    static calculateConversationMetrics(conversation) {
        const userMessages = conversation.messages.filter(msg => msg.role === 'user');
        const assistantMessages = conversation.messages.filter(msg => msg.role === 'assistant');
        const systemMessages = conversation.messages.filter(msg => msg.role === 'system');
        return {
            totalMessages: conversation.messages.length,
            userMessages: userMessages.length,
            assistantMessages: assistantMessages.length,
            systemMessages: systemMessages.length,
            firstUserMessage: userMessages[0]?.content || '',
            lastUserMessage: userMessages[userMessages.length - 1]?.content || ''
        };
    }
    // Get conversation analytics for an organization
    static async getOrganizationAnalytics(organizationId, dateFrom, dateTo) {
        const matchFilter = { organizationId };
        if (dateFrom || dateTo) {
            matchFilter.startedAt = {};
            if (dateFrom)
                matchFilter.startedAt.$gte = dateFrom;
            if (dateTo)
                matchFilter.startedAt.$lte = dateTo;
        }
        const analytics = await ConversationHistory_1.ConversationHistory.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: null,
                    totalConversations: { $sum: 1 },
                    totalMessages: { $sum: '$totalMessages' },
                    totalUserMessages: { $sum: '$userMessages' },
                    totalAssistantMessages: { $sum: '$assistantMessages' },
                    avgConversationDuration: { $avg: '$duration' },
                    avgMessagesPerConversation: { $avg: '$totalMessages' },
                    totalDuration: { $sum: '$duration' }
                }
            }
        ]);
        return analytics[0] || {
            totalConversations: 0,
            totalMessages: 0,
            totalUserMessages: 0,
            totalAssistantMessages: 0,
            avgConversationDuration: 0,
            avgMessagesPerConversation: 0,
            totalDuration: 0
        };
    }
}
exports.ConversationArchiverService = ConversationArchiverService;
