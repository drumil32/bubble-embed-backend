import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { updateExistingOrganizations, listOrganizationsWithEmails } from '../utils/updateOrganizations';
import { logger } from '../config/logger';

// Load environment variables
dotenv.config();

/**
 * Migration script to update existing organizations with email and password
 * Run this script to add email/password to existing organizations
 */
const runMigration = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatbot';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // List organizations before update
    logger.info('=== BEFORE UPDATE ===');
    await listOrganizationsWithEmails();

    // Update organizations
    await updateExistingOrganizations();

    // List organizations after update
    logger.info('=== AFTER UPDATE ===');
    await listOrganizationsWithEmails();

    logger.info('Migration completed successfully');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
    process.exit(0);
  }
};

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration();
}