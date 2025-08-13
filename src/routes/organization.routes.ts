import { Router } from 'express';
import { uploadPdfMiddleware } from '../middleware/upload.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { registerOrganization, loginOrganization, getChatHistory } from '../controllers/organization.controller';

const router = Router();

router.post('/register', uploadPdfMiddleware, registerOrganization);
router.post('/login', loginOrganization);
router.get('/chat-history', authenticateToken, getChatHistory);

export { router as organizationRoutes };