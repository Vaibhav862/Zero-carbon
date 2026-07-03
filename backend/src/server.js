import 'dotenv/config';
import app from './app.js';
import connectDB from './config/database.js';
import { initializeDatabase } from './config/dbInit.js';
import { createRedisClient } from './config/redis.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Auto-create collections + indexes (idempotent)
    await initializeDatabase();

    // 3. Verify Redis
    const redis = createRedisClient();
    await redis.ping();
    logger.info('Redis connection verified');
    await redis.quit();

    // 4. Start Express
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    // ── Graceful shutdown ──────────────────────────────────────────────────
    const shutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error(`Unhandled Rejection: ${reason}`);
      server.close(() => process.exit(1));
    });

  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();