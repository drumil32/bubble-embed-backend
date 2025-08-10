import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';

export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = randomUUID();
  
  // Store requestId and domain in request for use in other middlewares
  req.requestId = requestId;
  
  // Get real IP from nginx headers
  const getRealIP = (req: Request): string => {
    return req.get('X-Real-IP') || 
           req.get('X-Forwarded-For')?.split(',')[0]?.trim() || 
           req.ip || 
           req.connection.remoteAddress || 
           'unknown';
  };

  // Extract domain from host header
  const getDomain = (req: Request): string => {
    const host = req.get('Host');
    if (!host) return 'unknown';
    
    // Remove port if present
    const hostWithoutPort = host.split(':')[0];
    
    // Split by dots and take appropriate parts
    const parts = hostWithoutPort.split('.');
    
    if (parts.length <= 2) {
      // localhost or abc.com
      return hostWithoutPort;
    } else {
      // def.ghi.com -> def.ghi
      return parts.slice(0, -1).join('.');
    }
  };

  // Set domain in request for use in other middlewares
  req.finalDomain = getDomain(req);
  
  // Log incoming request
  logger.info('Incoming Request', {
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
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    if (chunk) {
      responseBody = chunk;
    }
    
    const responseTime = Date.now() - startTime;
    
    // Log outgoing response
    logger.info('Outgoing Response', {
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
  logger.info("calling next")
  next();
};