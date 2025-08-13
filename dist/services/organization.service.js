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
exports.OrganizationService = void 0;
const Boom = __importStar(require("@hapi/boom"));
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const logger_1 = require("../config/logger");
const Organization_1 = require("../models/Organization");
const token_service_1 = require("./token.service");
class OrganizationService {
    static async extractPdfText(buffer) {
        const data = await (0, pdf_parse_1.default)(buffer);
        if (!data.text.trim()) {
            throw Boom.badRequest('PDF file appears to be empty or contains no extractable text');
        }
        return data.text;
    }
    static async generateUniqueAccessKey() {
        let accessKey;
        let attempts = 0;
        const maxAttempts = 10;
        do {
            // Generate a 32-character hex string
            accessKey = (0, crypto_1.randomBytes)(16).toString('hex');
            // Check if this key already exists
            const existingOrg = await Organization_1.Organization.findOne({ accessKey });
            if (!existingOrg) {
                return accessKey;
            }
            attempts++;
        } while (attempts < maxAttempts);
        throw Boom.internal('Unable to generate unique access key after multiple attempts');
    }
    static async createOrganization(data) {
        // Check if organization with same name or any of the domains already exists
        const existingOrg = await Organization_1.Organization.findOne({
            $or: [
                { name: data.name },
                { domains: { $in: data.domains } }
            ]
        });
        if (existingOrg) {
            if (existingOrg.name === data.name) {
                throw Boom.conflict('Organization with this name already exists');
            }
            const conflictingDomain = data.domains.find(domain => existingOrg.domains.includes(domain));
            if (conflictingDomain) {
                throw Boom.conflict(`Organization with domain '${conflictingDomain}' already exists`);
            }
        }
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);
        // Generate unique access key
        const accessKey = await this.generateUniqueAccessKey();
        const organizationData = {
            ...data,
            password: hashedPassword,
            accessKey
        };
        const organization = new Organization_1.Organization(organizationData);
        await organization.save();
        logger_1.logger.info('Organization created successfully', {
            organizationId: organization._id,
            name: organization.name,
            domains: organization.domains,
            email: organization.email,
            accessKey: organization.accessKey
        });
        return organization;
    }
    static async getOrganizationByDomain(domain) {
        return await Organization_1.Organization.findOne({ domains: { $in: [domain] } });
    }
    static async getOrganizationByName(name) {
        return await Organization_1.Organization.findOne({ name });
    }
    static async getOrganizationById(id) {
        return await Organization_1.Organization.findById(id);
    }
    static async authenticateOrganization(email, password) {
        const organization = await Organization_1.Organization.findOne({ email });
        if (!organization) {
            return null;
        }
        const isPasswordValid = await bcrypt.compare(password, organization.password);
        if (!isPasswordValid) {
            return null;
        }
        // Since email is unique, there's only one organization per email
        const orgData = {
            name: organization.name,
            id: organization._id.toString()
        };
        // Generate JWT token using TokenService
        const token = token_service_1.TokenService.generateAuthToken({
            email: organization.email,
            organizationId: orgData.id
        });
        return { token, organization: orgData };
    }
}
exports.OrganizationService = OrganizationService;
