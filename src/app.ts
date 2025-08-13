import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { routes } from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import { requestLoggingMiddleware } from './middleware/logging.middleware';

export const createApp = () => {
  const app = express();

  // Trust proxy for nginx
  app.set('trust proxy', 'loopback');

  // CORS configuration
  const allowedOrigins = [
    process.env.FRONTEND_URL1,
    process.env.FRONTEND_URL2
  ].filter(Boolean); // Remove undefined values

  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  // Middleware
  app.use(helmet());
  app.use(cors(corsOptions));
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