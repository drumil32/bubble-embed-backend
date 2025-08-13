"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const updateOrganizations_1 = require("../utils/updateOrganizations");
const logger_1 = require("../config/logger");
// Load environment variables
dotenv_1.default.config();
/**
 * Migration script to update existing organizations with email and password
 * Run this script to add email/password to existing organizations
 */
const runMigration = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatbot';
        await mongoose_1.default.connect(mongoUri);
        logger_1.logger.info('Connected to MongoDB');
        // List organizations before update
        logger_1.logger.info('=== BEFORE UPDATE ===');
        await (0, updateOrganizations_1.listOrganizationsWithEmails)();
        // Update organizations
        await (0, updateOrganizations_1.updateExistingOrganizations)();
        // List organizations after update
        logger_1.logger.info('=== AFTER UPDATE ===');
        await (0, updateOrganizations_1.listOrganizationsWithEmails)();
        logger_1.logger.info('Migration completed successfully');
    }
    catch (error) {
        logger_1.logger.error('Migration failed:', error);
        process.exit(1);
    }
    finally {
        // Close database connection
        await mongoose_1.default.connection.close();
        logger_1.logger.info('Database connection closed');
        process.exit(0);
    }
};
// Run the migration if this script is executed directly
if (require.main === module) {
    runMigration();
}
