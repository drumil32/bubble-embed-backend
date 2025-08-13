"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateAndAuthorizeOrganization = exports.authorizeOrganization = exports.authenticateToken = void 0;
const Boom = __importStar(require("@hapi/boom"));
const logger_1 = require("../config/logger");
const token_service_1 = require("../services/token.service");
const authenticateToken = (req, res, next) => {
    const { requestId } = req;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        logger_1.logger.warn('Authentication failed: No token provided', { requestId });
        return next(Boom.unauthorized('Access token is required'));
    }
    try {
        const decoded = token_service_1.TokenService.verifyAuthToken(token);
        // Attach user info to request
        req.user = {
            email: decoded.email,
            organizationId: decoded.organizationId
        };
        logger_1.logger.info('Authentication successful', {
            requestId,
            email: decoded.email,
            organizationId: decoded.organizationId
        });
        next();
    }
    catch (error) {
        if (error instanceof Error) {
            logger_1.logger.warn('Authentication failed', { requestId, error: error.message });
            return next(Boom.unauthorized(error.message));
        }
        else {
            logger_1.logger.error('Authentication error', { requestId, error: 'Unknown error' });
            return next(Boom.internal('Authentication error'));
        }
    }
};
exports.authenticateToken = authenticateToken;
const authorizeOrganization = (req, res, next) => {
    const { requestId } = req;
    const { organizationId } = req.query;
    if (!req.user) {
        logger_1.logger.error('Authorization failed: User not authenticated', { requestId });
        return next(Boom.unauthorized('User not authenticated'));
    }
    if (!organizationId) {
        logger_1.logger.warn('Authorization failed: organizationId parameter is required', { requestId });
        return next(Boom.badRequest('organizationId parameter is required'));
    }
    const orgId = organizationId;
    if (!req.user.organizationId.includes(orgId)) {
        logger_1.logger.warn('Authorization failed: Access denied to organization', {
            requestId,
            email: req.user.email,
            requestedOrgId: orgId,
            authorizedOrgIds: req.user.organizationId
        });
        return next(Boom.forbidden('Access denied to this organization'));
    }
    logger_1.logger.info('Authorization successful', {
        requestId,
        email: req.user.email,
        organizationId: orgId
    });
    next();
};
exports.authorizeOrganization = authorizeOrganization;
// Combined middleware for authentication + organization authorization
exports.authenticateAndAuthorizeOrganization = [exports.authenticateToken, exports.authorizeOrganization];
