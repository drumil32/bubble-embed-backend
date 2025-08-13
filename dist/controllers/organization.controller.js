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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatHistory = exports.loginOrganization = exports.registerOrganization = void 0;
const Boom = __importStar(require("@hapi/boom"));
const moment_1 = __importDefault(require("moment"));
const organization_service_1 = require("../services/organization.service");
const ConversationHistory_1 = require("../models/ConversationHistory");
const logger_1 = require("../config/logger");
const registerOrganization = async (req, res, next) => {
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
    const organizationData = {
        name,
        domains: domainList.map((domain) => domain.trim().toLowerCase()),
        aiProviderLink,
        modelName,
        apiKey,
        organizationInformation,
        organizationSummary,
        email: email.trim().toLowerCase(),
        password
    };
    const organization = await organization_service_1.OrganizationService.createOrganization(organizationData);
    logger_1.logger.info('Organization registration successful', {
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
exports.registerOrganization = registerOrganization;
const loginOrganization = async (req, res, next) => {
    const { requestId } = req;
    const { email, password } = req.body;
    // Validate required fields
    if (!email || !password) {
        return next(Boom.badRequest('Missing required fields: email, password'));
    }
    const result = await organization_service_1.OrganizationService.authenticateOrganization(email.trim().toLowerCase(), password);
    if (!result) {
        return next(Boom.unauthorized('Invalid email or password'));
    }
    logger_1.logger.info('Organization login successful', {
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
exports.loginOrganization = loginOrganization;
const getChatHistory = async (req, res, next) => {
    const { requestId } = req;
    const { startDate, endDate } = req.query;
    // Get organizationId from authenticated user token
    if (!req.user) {
        return next(Boom.unauthorized('User not authenticated'));
    }
    const organizationId = req.user.organizationId;
    // Set default date range using moment (today if no dates provided)
    let startMoment;
    let endMoment;
    if (startDate || endDate) {
        // Parse provided dates
        if (startDate) {
            startMoment = (0, moment_1.default)(startDate);
            if (!startMoment.isValid()) {
                return next(Boom.badRequest('Invalid startDate format. Use YYYY-MM-DD or ISO format'));
            }
            startMoment.startOf('day'); // Set to beginning of day
        }
        else {
            // Default to beginning of today if only endDate provided
            startMoment = (0, moment_1.default)().startOf('day');
        }
        if (endDate) {
            endMoment = (0, moment_1.default)(endDate);
            if (!endMoment.isValid()) {
                return next(Boom.badRequest('Invalid endDate format. Use YYYY-MM-DD or ISO format'));
            }
            endMoment.endOf('day'); // Set to end of day
        }
        else {
            // Default to end of today if only startDate provided
            endMoment = (0, moment_1.default)().endOf('day');
        }
    }
    else {
        // Default: today's chats
        startMoment = (0, moment_1.default)().startOf('day');
        endMoment = (0, moment_1.default)().endOf('day');
    }
    // Validate date range
    if (startMoment.isAfter(endMoment)) {
        return next(Boom.badRequest('startDate cannot be later than endDate'));
    }
    try {
        const chatHistory = await ConversationHistory_1.ConversationHistory.find({
            organizationId: organizationId,
            startedAt: {
                $gte: startMoment.toDate(),
                $lte: endMoment.toDate()
            }
        })
            .sort({ startedAt: 1 }) // Ascending order
            .lean();
        logger_1.logger.info('Chat history retrieved successfully', {
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
    }
    catch (error) {
        logger_1.logger.error('Error retrieving chat history', {
            requestId,
            organizationId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return next(Boom.internal('Failed to retrieve chat history'));
    }
};
exports.getChatHistory = getChatHistory;
