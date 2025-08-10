import mongoose, { Schema } from 'mongoose';
import { IOrganization } from '../types/organization';

const OrganizationSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  aiProviderLink: {
    type: String,
    required: true,
    trim: true
  },
  modelName: {
    type: String,
    required: true,
    trim: true
  },
  apiKey: {
    type: String,
    required: true
  },
  organizationInformation: {
    type: String,
    required: true
  },
  organizationSummary: {
    type: String,
    required: true
  },
  accessKey: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);