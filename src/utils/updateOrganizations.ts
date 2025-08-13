import * as bcrypt from 'bcrypt';
import { Organization } from '../models/Organization';
import { logger } from '../config/logger';

/**
 * Temporary function to update existing organizations with email and password
 * This should be run once to migrate existing data
 */
export const updateExistingOrganizations = async (): Promise<void> => {
  try {
    logger.info('Starting organization update process...');

    // Find all organizations that don't have email field
    const organizations = await Organization.find({
      $or: [
        { email: { $exists: false } },
        { email: null },
        { email: '' }
      ]
    });

    logger.info(`Found ${organizations.length} organizations to update`);

    if (organizations.length === 0) {
      logger.info('No organizations need updating');
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
        await Organization.findByIdAndUpdate(org._id, {
          email: email,
          password: hashedPassword
        });

        logger.info(`Updated organization: ${org.name} with email: ${email}`);
      } catch (error) {
        logger.error(`Failed to update organization ${org.name}:`, error);
      }
    }

    logger.info('Organization update process completed');
    
    // Log summary
    const updatedOrgs = await Organization.find({ email: { $exists: true, $ne: '' } });
    logger.info(`Total organizations with email: ${updatedOrgs.length}`);
    
  } catch (error) {
    logger.error('Error in updateExistingOrganizations:', error);
    throw error;
  }
};

/**
 * Function to list all organizations with their emails (for verification)
 */
export const listOrganizationsWithEmails = async (): Promise<void> => {
  try {
    const organizations = await Organization.find({}, 'name email createdAt').sort({ createdAt: 1 });
    
    logger.info('=== Organizations List ===');
    organizations.forEach((org, index) => {
      logger.info(`${index + 1}. Name: ${org.name}, Email: ${org.email || 'NO EMAIL'}, Created: ${org.createdAt}`);
    });
    logger.info(`=== Total: ${organizations.length} organizations ===`);
    
  } catch (error) {
    logger.error('Error listing organizations:', error);
    throw error;
  }
};