import config from './config';
import app from './app';
import { logger } from './shared/logger';
import { connectDatabase, query } from './shared/database';
import { initCronJobs } from './shared/cron';

const PORT = config.port || 3000;
const dbUser = config.db.user;

async function startServer() {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');

    initCronJobs();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${PORT}`);
    });

    const { initSocket } = require('./shared/socket');
    initSocket(server);

    const shutdown = (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
