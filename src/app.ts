import express from 'express';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';
import { scrapeRouter } from './routes/scrape.js';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/scrape', scrapeRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
