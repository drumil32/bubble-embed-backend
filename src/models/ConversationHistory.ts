import mongoose, { Schema } from 'mongoose';
import { Message } from '../services/conversation.service';

export interface IConversationHistory extends mongoose.Document {
  conversationId: string;
  organizationId: mongoose.Types.ObjectId;
  organizationName: string;
  domains: string[];
  messages: Message[];
  startedAt: Date;
  endedAt: Date;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  systemMessages: number;
  duration: number; // in milliseconds
  firstUserMessage: string;
  lastUserMessage: string;
}

const ConversationHistorySchema: Schema = new Schema({
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  organizationName: {
    type: String,
    required: true
  },
  domains: [{
    type: String,
    required: true
  }],
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Number,
      required: true
    }
  }],
  startedAt: {
    type: Date,
    required: true
  },
  endedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  totalMessages: {
    type: Number,
    required: true
  },
  userMessages: {
    type: Number,
    required: true,
    default: 0
  },
  assistantMessages: {
    type: Number,
    required: true,
    default: 0
  },
  systemMessages: {
    type: Number,
    required: true,
    default: 0
  },
  duration: {
    type: Number,
    required: true
  },
  firstUserMessage: {
    type: String,
    default: ''
  },
  lastUserMessage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
ConversationHistorySchema.index({ organizationId: 1, createdAt: -1 });
ConversationHistorySchema.index({ domains: 1, createdAt: -1 });
ConversationHistorySchema.index({ startedAt: -1 });

export const ConversationHistory = mongoose.model<IConversationHistory>('ConversationHistory', ConversationHistorySchema);