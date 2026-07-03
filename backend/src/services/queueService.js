import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import logger from '../utils/logger.js';

export const documentQueue = new Queue('document-processing', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

documentQueue.on('error', (err) => {
  logger.error(`Queue error: ${err.message}`);
});

logger.info('BullMQ document queue initialized');