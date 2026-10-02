import express, {
  Router,
  type Express,
  type Router as ExpressRouter,
} from 'express';
import { errorHandler } from './middlewares/error-handler.js';
import { healthRouter } from './routes/health/health.js';
import { AppError } from './shared/errors/app-error.js';

export function createApp(apiRouter: ExpressRouter = Router()): Express {
  const app = express();

  app.use(express.json({ limit: '100kb' }));

  app.use(healthRouter);

  app.use('/api/v1', apiRouter);

  app.use((_request, _response, next) => {
    next(
      new AppError({
        statusCode: 404,
        code: 'ROUTE_NOT_FOUND',
        publicMessage: 'Route not found',
      }),
    );
  });

  app.use(errorHandler);

  return app;
}
