import { Router, Request, Response } from 'express';
import * as Boom from '@hapi/boom';
import { organizationRoutes } from './organization.routes';
import { chatRoutes } from './chat.routes';

export const routes = Router();

// Organization routes
routes.use('/organization', organizationRoutes);

// Chat routes
routes.use('/', chatRoutes);

// Health check endpoint
routes.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    requestId: (req as any).requestId 
  });
});

// Test endpoint with body logging
routes.post('/test', (req: Request, res: Response) => {
  res.json({ 
    message: 'Test endpoint', 
    body: req.body,
    requestId: (req as any).requestId
  });
});

// Async endpoint example (Express 5 handles this automatically)
routes.get('/async-test', async (req: Request, res: Response) => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  res.json({ 
    message: 'Async test successful',
    requestId: (req as any).requestId
  });
});

// Error handling examples
routes.get('/error/bad-request', (req: Request, res: Response) => {
  throw Boom.badRequest('This is a bad request error');
});

routes.get('/error/not-found', (req: Request, res: Response) => {
  throw Boom.notFound('Resource not found');
});

routes.get('/error/internal', async (req: Request, res: Response) => {
  // Simulate database error
  throw new Error('Database connection failed');
});

routes.get('/error/validation', (req: Request, res: Response) => {
  const error = new Error('Name is required');
  error.name = 'ValidationError';
  throw error;
});