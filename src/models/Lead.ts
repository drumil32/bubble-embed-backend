import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  conversationId: string;
  name?: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(phone: string) {
        if (!phone) return true; // Optional field
        // Indian phone number validation: 10 digits with optional +91
        return /^(\+91)?[6-9]\d{9}$/.test(phone);
      },
      message: 'Please enter a valid Indian phone number (10 digits starting with 6-9, +91 is optional)'
    }
  }
}, {
  timestamps: true,
});

// Compound index for organization and conversation
LeadSchema.index({ organizationId: 1, conversationId: 1 }, { unique: true });

// Index for email lookup
LeadSchema.index({ email: 1 });

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);