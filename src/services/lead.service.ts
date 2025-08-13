import { Lead, ILead } from '../models/Lead';
import { redisConnection } from '../config/redis';
import * as Boom from '@hapi/boom';
import { logger } from '../config/logger';

export interface CreateLeadRequest {
  organizationId: string;
  conversationId: string;
  name?: string;
  email?: string;
  phone?: string;
}

export class LeadService {
  // Redis key patterns
  private static getLeadCollectedKey(conversationId: string): string {
    return `lead:collected:${conversationId}`;
  }

  /**
   * Check if user info has been collected for this conversation
   */
  static async hasUserInfoBeenCollected(conversationId: string): Promise<boolean> {
    try {
      const key = this.getLeadCollectedKey(conversationId);
      const result = await redisConnection.getClient().get(key);
      return result === 'true';
    } catch (error) {
      logger.error('Error checking lead collection status', { conversationId, error });
      return false;
    }
  }

  /**
   * Mark user info as collected for this conversation
   */
  static async markUserInfoAsCollected(conversationId: string): Promise<void> {
    try {
      const key = this.getLeadCollectedKey(conversationId);
      // Set with expiration (24 hours - same as conversation token)
      await redisConnection.getClient().setEx(key, 24 * 60 * 60, 'true');
    } catch (error) {
      logger.error('Error marking lead as collected', { conversationId, error });
    }
  }

  /**
   * Create or update a lead
   */
  static async createOrUpdateLead(leadData: CreateLeadRequest): Promise<ILead> {
    try {
      const { organizationId, conversationId, name, email, phone } = leadData;

      // Validate that at least one field is provided
      if (!name && !email && !phone) {
        throw Boom.badRequest('At least one of name, email, or phone must be provided');
      }

      // Create or update lead
      const lead = await Lead.findOneAndUpdate(
        { 
          organizationId: organizationId,
          conversationId: conversationId 
        },
        {
          $set: {
            ...(name && { name }),
            ...(email && { email }),
            ...(phone && { phone })
          }
        },
        { 
          upsert: true, 
          new: true,
          runValidators: true 
        }
      );

      // Mark as collected in Redis
      await this.markUserInfoAsCollected(conversationId);

      logger.info('Lead created/updated successfully', {
        leadId: lead._id,
        organizationId,
        conversationId,
        hasName: !!name,
        hasEmail: !!email,
        hasPhone: !!phone
      });

      return lead;
    } catch (error: any) {
      logger.error('Error creating/updating lead', {
        organizationId: leadData.organizationId,
        conversationId: leadData.conversationId,
        error: error.message
      });

      if (error.name === 'ValidationError') {
        throw Boom.badRequest(`Validation failed: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Get lead by conversation
   */
  static async getLeadByConversation(organizationId: string, conversationId: string): Promise<ILead | null> {
    try {
      const lead = await Lead.findOne({
        organizationId,
        conversationId
      });

      return lead;
    } catch (error) {
      logger.error('Error fetching lead by conversation', {
        organizationId,
        conversationId,
        error
      });
      throw error;
    }
  }

  /**
   * Get all leads for an organization
   */
  static async getLeadsByOrganization(organizationId: string, page = 1, limit = 50): Promise<{
    leads: ILead[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [leads, total] = await Promise.all([
        Lead.find({ organizationId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Lead.countDocuments({ organizationId })
      ]);

      return {
        leads: leads as ILead[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error fetching leads for organization', {
        organizationId,
        error
      });
      throw error;
    }
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phone: string): boolean {
    if (!phone) return true; // Optional field
    return /^(\+91)?[6-9]\d{9}$/.test(phone.trim());
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    if (!email) return true; // Optional field
    return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email.trim().toLowerCase());
  }
}