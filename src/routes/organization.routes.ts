import { Router } from 'express';
import { uploadPdfMiddleware } from '../middleware/upload.middleware';
import { registerOrganization } from '../controllers/organization.controller';

const router = Router();

router.post('/register', uploadPdfMiddleware, registerOrganization);

export { router as organizationRoutes };