import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { routes } from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import { requestLoggingMiddleware } from './middleware/logging.middleware';

export const createApp = () => {
  const app = express();

  // Trust proxy for nginx
  app.set('trust proxy', '192.168.1.101'); // TODO: test this on production after changing ip

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Logging middleware
  app.use(requestLoggingMiddleware);

  // Routes
  app.use('/api', routes);

  // Error handling
  app.use(errorMiddleware);

  return app;
};