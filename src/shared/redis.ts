import Redis from 'ioredis';
import { logger } from './logger';
import config from '../config';

let client: Redis | null = null;

export const connectRedis = async (): Promise<void> => {
  if (client) return;

  client = new Redis(config.redis.url, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 100, 3000); // exponential backoff: 100ms → 3s cap
      logger.warn(`Redis retry attempt ${times}, reconnecting in ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err: Error) => {
      // Reconnect on READONLY errors (occurs during Redis primary failover)
      return err.message.includes('READONLY');
    },
  });

  // Mandatory: unhandled 'error' events crash Node.js
  client.on('error', (err: Error) => {
    logger.error('Redis client error:', err.message);
  });

  client.on('reconnecting', () => {
    logger.warn('Redis reconnecting...');
  });

  client.on('ready', () => {
    logger.info('Redis client ready');
  });

  try {
    await client.connect(); // explicit connect (lazyConnect: true)
    await client.ping(); // health check — mirrors SELECT NOW() in database.ts
    logger.info('✅ Connected to Redis');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Redis connection failed:', errorMessage);
    client = null;
    throw new Error('Redis connection failed');
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (!client) return;
  await client.quit(); // graceful: sends QUIT command, waits for ACK before closing socket
  client = null;
  logger.info('Redis disconnected');
};

export const getRedisClient = (): Redis => {
  if (!client) {
    throw new Error('Redis not connected. Call connectRedis first.');
  }
  return client;
};

// Usage
// import { getRedisClient } from '../../shared/redis';

// const redis = getRedisClient();
// await redis.set('session:abc', JSON.stringify(data), 'EX', 3600);
// const value = await redis.get('session:abc');
