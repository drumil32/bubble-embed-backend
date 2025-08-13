import * as Boom from '@hapi/boom';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import pdf from 'pdf-parse';
import { logger } from '../config/logger';
import { Organization } from '../models/Organization';
import { IOrganization } from '../types/organization';
import { TokenService } from './token.service';

export interface CreateOrganizationData {
  name: string;
  domains: string[];
  aiProviderLink: string;
  modelName: string;
  apiKey: string;
  organizationInformation: string;
  organizationSummary: string;
  email: string;
  password: string;
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
    // Check if organization with same name or any of the domains already exists
    const existingOrg = await Organization.findOne({
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

    const organization = new Organization(organizationData);
    await organization.save();

    logger.info('Organization created successfully', {
      organizationId: organization._id,
      name: organization.name,
      domains: organization.domains,
      email: organization.email,
      accessKey: organization.accessKey
    });

    return organization;
  }

  static async getOrganizationByDomain(domain: string): Promise<IOrganization | null> {
    return await Organization.findOne({ domains: { $in: [domain] } });
  }

  static async getOrganizationByName(name: string): Promise<IOrganization | null> {
    return await Organization.findOne({ name });
  }

  static async getOrganizationById(id: string): Promise<IOrganization | null> {
    return await Organization.findById(id);
  }

  static async authenticateOrganization(email: string, password: string): Promise<{ token: string; organization: { name: string; id: string } } | null> {
    const organization = await Organization.findOne({ email });
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
      id: (organization._id as any).toString() 
    };

    // Generate JWT token using TokenService
    const token = TokenService.generateAuthToken({
      email: organization.email,
      organizationId: orgData.id
    });

    return { token, organization: orgData };
  }
}