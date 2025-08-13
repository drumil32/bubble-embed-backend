"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLoggingMiddleware = void 0;
const crypto_1 = require("crypto");
const logger_1 = require("../config/logger");
const requestLoggingMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const requestId = (0, crypto_1.randomUUID)();
    // Store requestId and domain in request for use in other middlewares
    req.requestId = requestId;
    // Get real IP from nginx headers
    const getRealIP = (req) => {
        return req.get('X-Real-IP') ||
            req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
            req.ip ||
            req.connection.remoteAddress ||
            'unknown';
    };
    // Extract domain from host header
    const getDomain = (req) => {
        const origin = req.get('Origin');
        if (!origin)
            return 'unknown';
        try {
            const url = new URL(origin);
            return url.hostname; // keeps full domain including subdomain
        }
        catch {
            return 'unknown';
        }
    };
    // Set domain in request for use in other middlewares
    req.finalDomain = getDomain(req);
    // Log incoming request
    logger_1.logger.info('Incoming Request', {
        requestId,
        method: req.method,
        endpoint: req.originalUrl,
        finalDomain: req.finalDomain,
        ip: getRealIP(req),
        userAgent: req.get('User-Agent'),
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params
    });
    // Store original end function
    const originalEnd = res.end;
    let responseBody = '';
    // Override res.end to capture response
    res.end = function (chunk, encoding, cb) {
        if (chunk) {
            responseBody = chunk;
        }
        const responseTime = Date.now() - startTime;
        // Log outgoing response
        logger_1.logger.info('Outgoing Response', {
            requestId,
            method: req.method,
            endpoint: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            contentLength: res.get('Content-Length'),
            responseBody: responseBody.toString()
        });
        return originalEnd.call(res, chunk, encoding, cb);
    };
    logger_1.logger.info("calling next");
    next();
};
exports.requestLoggingMiddleware = requestLoggingMiddleware;
