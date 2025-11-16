// src/app.ts
import express from 'express';
import { errorHandler } from './shared/errorHandler';
import { logger } from './shared/logger';
import { middlewares } from './shared/middlewares';
import cookieParser from 'cookie-parser';
import routes from './routes';

const app = express();

// app.use(xssClean());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Core middlewares
app.use(middlewares.requestId);
app.use(middlewares.requestLogger);
app.use(middlewares.rateLimiter);
app.use(middlewares.security);
app.use(middlewares.corsMiddleware);
app.use(middlewares.compressionMiddleware);

// Routes
app.use('/api', routes);

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler (catch-all)
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Error handling (must be last)
app.use(errorHandler);

export default app;
