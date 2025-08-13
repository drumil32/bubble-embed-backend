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
exports.ConversationHistory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ConversationHistorySchema = new mongoose_1.Schema({
    conversationId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
exports.ConversationHistory = mongoose_1.default.model('ConversationHistory', ConversationHistorySchema);
