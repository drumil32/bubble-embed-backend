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
exports.listOrganizationsWithEmails = exports.updateExistingOrganizations = void 0;
const bcrypt = __importStar(require("bcrypt"));
const Organization_1 = require("../models/Organization");
const logger_1 = require("../config/logger");
/**
 * Temporary function to update existing organizations with email and password
 * This should be run once to migrate existing data
 */
const updateExistingOrganizations = async () => {
    try {
        logger_1.logger.info('Starting organization update process...');
        // Find all organizations that don't have email field
        const organizations = await Organization_1.Organization.find({
            $or: [
                { email: { $exists: false } },
                { email: null },
                { email: '' }
            ]
        });
        logger_1.logger.info(`Found ${organizations.length} organizations to update`);
        if (organizations.length === 0) {
            logger_1.logger.info('No organizations need updating');
            return;
        }
        const password = 'abc$%123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        // Update each organization with email and hashed password
        for (let i = 0; i < organizations.length; i++) {
            const org = organizations[i];
            const email = `abc${i + 1}@gmail.com`;
            try {
                await Organization_1.Organization.findByIdAndUpdate(org._id, {
                    email: email,
                    password: hashedPassword
                });
                logger_1.logger.info(`Updated organization: ${org.name} with email: ${email}`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to update organization ${org.name}:`, error);
            }
        }
        logger_1.logger.info('Organization update process completed');
        // Log summary
        const updatedOrgs = await Organization_1.Organization.find({ email: { $exists: true, $ne: '' } });
        logger_1.logger.info(`Total organizations with email: ${updatedOrgs.length}`);
    }
    catch (error) {
        logger_1.logger.error('Error in updateExistingOrganizations:', error);
        throw error;
    }
};
exports.updateExistingOrganizations = updateExistingOrganizations;
/**
 * Function to list all organizations with their emails (for verification)
 */
const listOrganizationsWithEmails = async () => {
    try {
        const organizations = await Organization_1.Organization.find({}, 'name email createdAt').sort({ createdAt: 1 });
        logger_1.logger.info('=== Organizations List ===');
        organizations.forEach((org, index) => {
            logger_1.logger.info(`${index + 1}. Name: ${org.name}, Email: ${org.email || 'NO EMAIL'}, Created: ${org.createdAt}`);
        });
        logger_1.logger.info(`=== Total: ${organizations.length} organizations ===`);
    }
    catch (error) {
        logger_1.logger.error('Error listing organizations:', error);
        throw error;
    }
};
exports.listOrganizationsWithEmails = listOrganizationsWithEmails;
