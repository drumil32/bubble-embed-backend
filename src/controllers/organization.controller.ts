import { Request, Response, NextFunction } from 'express';
import * as Boom from '@hapi/boom';
import { OrganizationService } from '../services/organization.service';
import { logger } from '../config/logger';

export const registerOrganization = async (req: Request, res: Response, next: NextFunction) => {
  const { requestId } = req;
  const { name, aiProviderLink, modelName, apiKey, organizationSummary, domains } = req.body;
  
  // Validate required fields
  if (!name || !aiProviderLink || !modelName || !apiKey || !organizationSummary || !domains) {
    return next(Boom.badRequest('Missing required fields: name, aiProviderLink, modelName, apiKey, organizationSummary, domains'));
  }

  // Validate domains is array and not empty
  if (!Array.isArray(domains) || domains.length === 0) {
    return next(Boom.badRequest('Domains must be a non-empty array of strings'));
  }

  // Validate all domains are strings
  if (!domains.every(domain => typeof domain === 'string' && domain.trim())) {
    return next(Boom.badRequest('All domains must be non-empty strings'));
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

  const organizationData = {
    name,
    domains: domains.map((domain: string) => domain.trim().toLowerCase()),
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
    domains: organization.domains
  });

  res.status(201).json({
    success: true,
    message: 'Organization registered successfully',
    data: {
      id: organization._id,
      name: organization.name,
      domains: organization.domains,
      accessKey: organization.accessKey,
      createdAt: organization.createdAt
    }
  });
};