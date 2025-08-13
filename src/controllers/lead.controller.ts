import { Request, Response } from 'express';
import * as Boom from '@hapi/boom';
import { LeadService } from '../services/lead.service';
import { TokenService } from '../services/token.service';
import { ConversationService } from '../services/conversation.service';
import { logger } from '../config/logger';

export interface CreateLeadBody {
  conversationToken: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    organizationId: string;
    email: string;
  };
}

export class LeadController {
  /**
   * Create or update lead data from conversation
   */
  static async createLead(req: Request, res: Response): Promise<void> {

    const { conversationToken, name, email, phone } = req.body as CreateLeadBody;
    const { requestId } = req;

    // Validate required fields
    if (!conversationToken) {
      throw Boom.badRequest('conversationToken is required');
    }

    // Validate at least one field is provided
    if (!name && !email && !phone) {
      throw Boom.badRequest('At least one of name, email, or phone must be provided');
    }

    // Verify conversation token to get conversation ID and organization
    let conversationPayload;
    try {
      conversationPayload = TokenService.verifyConversationToken(conversationToken);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw Boom.unauthorized('Conversation token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw Boom.unauthorized('Invalid conversation token');
      }
      throw error;
    }

    const { conversationId } = conversationPayload;

    // Get conversation to retrieve organization ID
    const conversation = await ConversationService.getConversation(conversationId);
    if (!conversation) {
      throw Boom.notFound('Conversation not found or expired');
    }

    const organizationId = conversation.organizationId;

    // Validate individual fields if provided
    if (email && !LeadService.validateEmail(email)) {
      throw Boom.badRequest('Invalid email format');
    }

    if (phone && !LeadService.validatePhoneNumber(phone)) {
      throw Boom.badRequest('Invalid phone number format. Please use Indian format (10 digits starting with 6-9, +91 is optional)');
    }

    // Create or update lead
    const lead = await LeadService.createOrUpdateLead({
      organizationId,
      conversationId,
      name: name?.trim(),
      email: email?.trim().toLowerCase(),
      phone: phone?.trim()
    });

    logger.info('Lead created/updated via API', {
      requestId,
      leadId: lead._id,
      conversationId,
      organizationId,
      hasName: !!name,
      hasEmail: !!email,
      hasPhone: !!phone
    });

    res.status(200).json({
      success: true,
      message: 'Lead information saved successfully',
      data: {
        leadId: lead._id,
        conversationId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt
      }
    });


  }

  /**
   * Get leads for authenticated organization
   */
  static async getLeads(req: AuthenticatedRequest, res: Response): Promise<void> {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw Boom.unauthorized('Authentication required');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page

    const result = await LeadService.getLeadsByOrganization(organizationId, page, limit);

    logger.info('Leads retrieved for organization', {
      organizationId,
      page,
      limit,
      total: result.total
    });

    res.status(200).json({
      success: true,
      data: result
    });
  }

  /**
   * Get lead by conversation ID (for authenticated organization)
   */
  static async getLeadByConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        throw Boom.unauthorized('Authentication required');
      }

      const { conversationId } = req.params;
      if (!conversationId) {
        throw Boom.badRequest('conversationId parameter is required');
      }

      const lead = await LeadService.getLeadByConversation(organizationId, conversationId);

      if (!lead) {
        throw Boom.notFound('Lead not found for this conversation');
      }

      logger.info('Lead retrieved by conversation', {
        organizationId,
        conversationId,
        leadId: lead._id
      });

      res.status(200).json({
        success: true,
        data: {
          leadId: lead._id,
          conversationId,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt
        }
      });

    } catch (error: any) {
      logger.error('Error retrieving lead by conversation', {
        organizationId: req.user?.organizationId,
        conversationId: req.params.conversationId,
        error: error.message
      });

      if (error.isBoom) {
        res.status(error.output.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }
}