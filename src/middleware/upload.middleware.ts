import multer from 'multer';
import * as Boom from '@hapi/boom';
import { logger } from '../config/logger';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    logger.info("from upload middleware");
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(Boom.badRequest('Only PDF files are allowed for organization information'));
    }
  }
});

export const uploadPdfMiddleware = upload.single('organizationInformation');