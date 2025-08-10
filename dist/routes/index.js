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
exports.routes = void 0;
const express_1 = require("express");
const Boom = __importStar(require("@hapi/boom"));
const organization_routes_1 = require("./organization.routes");
const chat_routes_1 = require("./chat.routes");
exports.routes = (0, express_1.Router)();
// Organization routes
exports.routes.use('/organization', organization_routes_1.organizationRoutes);
// Chat routes
exports.routes.use('/', chat_routes_1.chatRoutes);
// Health check endpoint
exports.routes.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
    });
});
// Test endpoint with body logging
exports.routes.post('/test', (req, res) => {
    res.json({
        message: 'Test endpoint',
        body: req.body,
        requestId: req.requestId
    });
});
// Async endpoint example (Express 5 handles this automatically)
exports.routes.get('/async-test', async (req, res) => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    res.json({
        message: 'Async test successful',
        requestId: req.requestId
    });
});
// Error handling examples
exports.routes.get('/error/bad-request', (req, res) => {
    throw Boom.badRequest('This is a bad request error');
});
exports.routes.get('/error/not-found', (req, res) => {
    throw Boom.notFound('Resource not found');
});
exports.routes.get('/error/internal', async (req, res) => {
    // Simulate database error
    throw new Error('Database connection failed');
});
exports.routes.get('/error/validation', (req, res) => {
    const error = new Error('Name is required');
    error.name = 'ValidationError';
    throw error;
});
