import { Router } from 'express';
import { LeadController } from '../controllers/lead.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route POST /api/leads-data
 * @description Create or update lead data from conversation
 * @body { conversationToken, name?, email?, phone? }
 * @access Public (uses conversation token for auth)
 */
router.post('/leads-data', LeadController.createLead);

/**
 * @route GET /api/leads
 * @description Get all leads for authenticated organization
 * @query { page?, limit? }
 * @access Private (requires organization auth)
 */
router.get('/leads', authenticateToken, LeadController.getLeads);

/**
 * @route GET /api/leads/:conversationId
 * @description Get lead by conversation ID
 * @param conversationId
 * @access Private (requires organization auth)
 */
router.get('/leads/:conversationId', authenticateToken, LeadController.getLeadByConversation);

export { router as leadRoutes };