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
exports.registerOrganization = void 0;
const Boom = __importStar(require("@hapi/boom"));
const organization_service_1 = require("../services/organization.service");
const logger_1 = require("../config/logger");
const registerOrganization = async (req, res, next) => {
    const { requestId } = req;
    const { name, aiProviderLink, modelName, apiKey, organizationSummary } = req.body;
    // Validate required fields
    if (!name || !aiProviderLink || !modelName || !apiKey || !organizationSummary) {
        return next(Boom.badRequest('Missing required fields: name, aiProviderLink, modelName, apiKey, organizationSummary'));
    }
    let organizationInformation;
    // Check if organizationInformation is provided as file or text
    if (req.file) {
        // Extract text from PDF
        logger_1.logger.info('Processing PDF file for organization information', {
            requestId,
            filename: req.file.originalname,
            size: req.file.size
        });
        organizationInformation = await organization_service_1.OrganizationService.extractPdfText(req.file.buffer);
    }
    else if (req.body.organizationInformation) {
        // Use text directly
        organizationInformation = req.body.organizationInformation;
    }
    else {
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
    const organization = await organization_service_1.OrganizationService.createOrganization(organizationData);
    logger_1.logger.info('Organization registration successful', {
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
exports.registerOrganization = registerOrganization;
