import { Request, Response, NextFunction } from 'express';
import * as Boom from '@hapi/boom';
import moment from 'moment';
import { OrganizationService } from '../services/organization.service';
import { ConversationHistory } from '../models/ConversationHistory';
import { logger } from '../config/logger';

export const registerOrganization = async (req: Request, res: Response, next: NextFunction) => {
  const { requestId } = req;
  const { name, aiProviderLink, modelName, apiKey, organizationSummary, domains, email, password } = req.body;
  
  // Validate required fields
  if (!name || !aiProviderLink || !modelName || !apiKey || !organizationSummary || !domains || !email || !password) {
    return next(Boom.badRequest('Missing required fields: name, aiProviderLink, modelName, apiKey, organizationSummary, domains, email, password'));
  }
  const domainList = JSON.parse(domains);
  // Validate domains is array and not empty
  if (!Array.isArray(domainList) || domainList.length === 0) {
    return next(Boom.badRequest('Domains must be a non-empty array of strings'));
  }

  // Validate all domains are strings
  if (!domainList.every(domain => typeof domain === 'string' && domain.trim())) {
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
    domains: domainList.map((domain: string) => domain.trim().toLowerCase()),
    aiProviderLink,
    modelName,
    apiKey,
    organizationInformation,
    organizationSummary,
    email: email.trim().toLowerCase(),
    password
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

export const loginOrganization = async (req: Request, res: Response, next: NextFunction) => {
  const { requestId } = req;
  const { email, password } = req.body;
  
  // Validate required fields
  if (!email || !password) {
    return next(Boom.badRequest('Missing required fields: email, password'));
  }

  const result = await OrganizationService.authenticateOrganization(email.trim().toLowerCase(), password);
  
  if (!result) {
    return next(Boom.unauthorized('Invalid email or password'));
  }

  logger.info('Organization login successful', {
    requestId,
    email,
    organizationId: result.organization.id,
    organizationName: result.organization.name
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      token: result.token,
      organization: result.organization
    }
  });
};

export const getChatHistory = async (req: Request, res: Response, next: NextFunction) => {
  const { requestId } = req;
  const { startDate, endDate } = req.query;

  // Get organizationId from authenticated user token
  if (!req.user) {
    return next(Boom.unauthorized('User not authenticated'));
  }

  const organizationId = req.user.organizationId;

  // Set default date range using moment (today if no dates provided)
  let startMoment: moment.Moment;
  let endMoment: moment.Moment;

  if (startDate || endDate) {
    // Parse provided dates
    if (startDate) {
      startMoment = moment(startDate as string);
      if (!startMoment.isValid()) {
        return next(Boom.badRequest('Invalid startDate format. Use YYYY-MM-DD or ISO format'));
      }
      startMoment.startOf('day'); // Set to beginning of day
    } else {
      // Default to beginning of today if only endDate provided
      startMoment = moment().startOf('day');
    }

    if (endDate) {
      endMoment = moment(endDate as string);
      if (!endMoment.isValid()) {
        return next(Boom.badRequest('Invalid endDate format. Use YYYY-MM-DD or ISO format'));
      }
      endMoment.endOf('day'); // Set to end of day
    } else {
      // Default to end of today if only startDate provided
      endMoment = moment().endOf('day');
    }
  } else {
    // Default: today's chats
    startMoment = moment().startOf('day');
    endMoment = moment().endOf('day');
  }

  // Validate date range
  if (startMoment.isAfter(endMoment)) {
    return next(Boom.badRequest('startDate cannot be later than endDate'));
  }

  try {
    const chatHistory = await ConversationHistory.find({
      organizationId: organizationId,
      startedAt: {
        $gte: startMoment.toDate(),
        $lte: endMoment.toDate()
      }
    })
    .sort({ startedAt: 1 }) // Ascending order
    .lean();

    logger.info('Chat history retrieved successfully', {
      requestId,
      organizationId,
      startDate: startMoment.format('YYYY-MM-DD'),
      endDate: endMoment.format('YYYY-MM-DD'),
      totalConversations: chatHistory.length
    });

    res.status(200).json({
      success: true,
      message: 'Chat history retrieved successfully',
      data: {
        conversations: chatHistory,
        dateRange: {
          start: startMoment.format('YYYY-MM-DD'),
          end: endMoment.format('YYYY-MM-DD')
        },
        totalConversations: chatHistory.length
      }
    });
  } catch (error) {
    logger.error('Error retrieving chat history', {
      requestId,
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return next(Boom.internal('Failed to retrieve chat history'));
  }
};