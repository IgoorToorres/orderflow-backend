import { Router, type Request, type Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_request: Request, response: Response) => {
  return response.status(200).json({ status: 'ok' });
});
