import * as Boom from '@hapi/boom';
import { NextFunction, Response } from 'express';
import { logger } from '../config/logger';
import { AuthTokenPayload, TokenService } from '../services/token.service';
import { AuthenticatedRequest } from '../types/auth';

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { requestId } = req;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    logger.warn('Authentication failed: No token provided', { requestId });
    return next(Boom.unauthorized('Access token is required'));
  }

  try {
    const decoded: AuthTokenPayload = TokenService.verifyAuthToken(token);

    // Attach user info to request
    req.user = {
      email: decoded.email,
      organizationId: decoded.organizationId
    };

    logger.info('Authentication successful', {
      requestId,
      email: decoded.email,
      organizationId: decoded.organizationId
    });

    next();
  } catch (error) {
    if (error instanceof Error) {
      logger.warn('Authentication failed', { requestId, error: error.message });
      return next(Boom.unauthorized(error.message));
    } else {
      logger.error('Authentication error', { requestId, error: 'Unknown error' });
      return next(Boom.internal('Authentication error'));
    }
  }
};

export const authorizeOrganization = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { requestId } = req;
  const { organizationId } = req.query;

  if (!req.user) {
    logger.error('Authorization failed: User not authenticated', { requestId });
    return next(Boom.unauthorized('User not authenticated'));
  }

  if (!organizationId) {
    logger.warn('Authorization failed: organizationId parameter is required', { requestId });
    return next(Boom.badRequest('organizationId parameter is required'));
  }

  const orgId = organizationId as string;
  
  if (!req.user.organizationId.includes(orgId)) {
    logger.warn('Authorization failed: Access denied to organization', {
      requestId,
      email: req.user.email,
      requestedOrgId: orgId,
      authorizedOrgIds: req.user.organizationId
    });
    return next(Boom.forbidden('Access denied to this organization'));
  }

  logger.info('Authorization successful', {
    requestId,
    email: req.user.email,
    organizationId: orgId
  });

  next();
};

// Combined middleware for authentication + organization authorization
export const authenticateAndAuthorizeOrganization = [authenticateToken, authorizeOrganization];