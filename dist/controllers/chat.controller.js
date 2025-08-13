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
exports.chat = void 0;
const Boom = __importStar(require("@hapi/boom"));
const chat_service_1 = require("../services/chat.service");
const chat = async (req, res, next) => {
    const { requestId, finalDomain } = req;
    const { message, token } = req.body;
    // Validate required message field
    if (!message || typeof message !== 'string' || !message.trim()) {
        return next(Boom.badRequest('Message is required and must be a non-empty string'));
    }
    // Process chat using the chat service
    const chatResponse = await chat_service_1.ChatService.processChat({
        message: message.trim(),
        token,
        domain: finalDomain,
        requestId
    });
    res.status(200).json({
        success: true,
        data: chatResponse
    });
};
exports.chat = chat;
