import pdf from 'pdf-parse';
import * as Boom from '@hapi/boom';
import { randomBytes } from 'crypto';
import { Organization } from '../models/Organization';
import { IOrganization } from '../types/organization';
import { logger } from '../config/logger';

export interface CreateOrganizationData {
  name: string;
  domain: string;
  aiProviderLink: string;
  modelName: string;
  apiKey: string;
  organizationInformation: string;
  organizationSummary: string;
  accessKey?: string;
}

export class OrganizationService {
  static async extractPdfText(buffer: Buffer): Promise<string> {
    const data = await pdf(buffer);
    if (!data.text.trim()) {
      throw Boom.badRequest('PDF file appears to be empty or contains no extractable text');
    }
    return data.text;
  }

  static async generateUniqueAccessKey(): Promise<string> {
    let accessKey: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      // Generate a 32-character hex string
      accessKey = randomBytes(16).toString('hex');
      
      // Check if this key already exists
      const existingOrg = await Organization.findOne({ accessKey });
      if (!existingOrg) {
        return accessKey;
      }
      
      attempts++;
    } while (attempts < maxAttempts);

    throw Boom.internal('Unable to generate unique access key after multiple attempts');
  }

  static async createOrganization(data: CreateOrganizationData): Promise<IOrganization> {
    // Check if organization with same name or domain already exists
    const existingOrg = await Organization.findOne({
      $or: [
        { name: data.name },
        { domain: data.domain }
      ]
    });

    if (existingOrg) {
      if (existingOrg.name === data.name) {
        throw Boom.conflict('Organization with this name already exists');
      }
      if (existingOrg.domain === data.domain) {
        throw Boom.conflict('Organization with this domain already exists');
      }
    }

    // Generate unique access key
    const accessKey = await this.generateUniqueAccessKey();

    const organizationData = {
      ...data,
      accessKey
    };

    const organization = new Organization(organizationData);
    await organization.save();

    logger.info('Organization created successfully', {
      organizationId: organization._id,
      name: organization.name,
      domain: organization.domain,
      accessKey: organization.accessKey
    });

    return organization;
  }

  static async getOrganizationByDomain(domain: string): Promise<IOrganization | null> {
    return await Organization.findOne({ domain });
  }
}