import { Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  domains: string[];
  aiProviderLink: string;
  modelName: string;
  apiKey: string;
  organizationInformation: string;
  organizationSummary: string;
  accessKey?: string;
  createdAt?: Date;
}