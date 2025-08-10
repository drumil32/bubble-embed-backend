import { Request, Response, NextFunction } from 'express';
import * as Boom from '@hapi/boom';
import { OrganizationService } from '../services/organization.service';
import { logger } from '../config/logger';

export const registerOrganization = async (req: Request, res: Response, next: NextFunction) => {
  const { requestId } = req;
  const { name, aiProviderLink, modelName, apiKey, organizationSummary } = req.body;
  
  // Validate required fields
  if (!name || !aiProviderLink || !modelName || !apiKey || !organizationSummary) {
    return next(Boom.badRequest('Missing required fields: name, aiProviderLink, modelName, apiKey, organizationSummary'));
  }

  let organizationInformation: string;
  
  // Check if organizationInformation is provided as file or text
  if (req.file) {
    // Extract text from PDF
    logger.info('Processing PDF file for organization information', { 
      requestId, 
      filename: req.file.originalname,
      size: req.file.size 
    });
    
    organizationInformation = await OrganizationService.extractPdfText(req.file.buffer);
  } else if (req.body.organizationInformation) {
    // Use text directly
    organizationInformation = req.body.organizationInformation;
  } else {
    return next(Boom.badRequest('Organization information is required (either as text or PDF file)'));
  }

  // Use domain from request if not provided in body
  const orgDomain = req.body.domain;
  
  if (!orgDomain) {
    return next(Boom.badRequest('Domain is required'));
  }

  const organizationData = {
    name,
    domain: orgDomain,
    aiProviderLink,
    modelName,
    apiKey,
    organizationInformation,
    organizationSummary
  };

  const organization = await OrganizationService.createOrganization(organizationData);

  logger.info('Organization registration successful', {
    requestId,
    organizationId: organization._id,
    domain: organization.domain
  });

  res.status(201).json({
    success: true,
    message: 'Organization registered successfully',
    data: {
      id: organization._id,
      name: organization.name,
      domain: organization.domain,
      accessKey: organization.accessKey,
      createdAt: organization.createdAt
    }
  });
};