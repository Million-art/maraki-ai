import { createClient } from 'redis';

interface SessionData {
  [key: string]: any;
}

// In-memory session store fallback when Redis is offline
const inMemoryStore = new Map<string, SessionData>();

const redisUrlLocal: string = process.env.REDIS_URL_LOCAL || 'redis://localhost:6379';
const redisUrlProd: string = process.env.REDIS_URL || '';

const redisUrl: string = process.env.NODE_ENV === 'production' ? redisUrlProd : redisUrlLocal;
const finalRedisUrl: string = redisUrl.includes('upstash.io') ? redisUrl.replace('redis://', 'rediss://') : redisUrl;

let isRedisAvailable = false;

const redis = createClient({
  url: finalRedisUrl,
  socket: {
    reconnectStrategy: (retries: number): number | Error => {
      if (retries > 1) {
        // Stop reconnect spamming if local Redis server is not running
        return new Error('Redis connection limit reached');
      }
      return 500;
    },
  },
});

redis.on('error', (err: Error): void => {
  if (!isRedisAvailable) {
    // Quietly ignore initial connection error when local redis is offline
    return;
  }
  console.error('Redis Client Error:', err.message);
});

export const connectRedis = async (): Promise<void> => {
  try {
    if (!redis.isOpen && finalRedisUrl) {
      await redis.connect();
      isRedisAvailable = true;
      console.log('✅ Connected to Redis');
    }
  } catch (error) {
    isRedisAvailable = false;
    console.log('ℹ️ Redis offline. Using fast in-memory session cache.');
  }
};

export const setSession = async (userId: number, sessionData: SessionData): Promise<void> => {
  if (isRedisAvailable && redis.isOpen) {
    try {
      await redis.set(`session:${userId}`, JSON.stringify(sessionData), { EX: 3600 });
      return;
    } catch (e) {
      // Fallback
    }
  }
  inMemoryStore.set(`session:${userId}`, sessionData);
};

export const getSession = async (userId: number): Promise<SessionData | null> => {
  if (isRedisAvailable && redis.isOpen) {
    try {
      const data = await redis.get(`session:${userId}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      // Fallback
    }
  }
  return inMemoryStore.get(`session:${userId}`) || null;
};

export const deleteSession = async (userId: number): Promise<void> => {
  if (isRedisAvailable && redis.isOpen) {
    try {
      await redis.del(`session:${userId}`);
    } catch (e) {
      // Fallback
    }
  }
  inMemoryStore.delete(`session:${userId}`);
};

export { redis };
