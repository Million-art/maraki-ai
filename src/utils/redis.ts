import { createClient, RedisClientType } from 'redis'

// Type definitions
interface SessionData {
  [key: string]: any;
}

interface RedisSocketOptions {
  tls?: boolean;
  rejectUnauthorized?: boolean;
  reconnectStrategy?: (retries: number) => number;
}

// Environment-specific Redis configuration
const redisUrlLocal: string = process.env.REDIS_URL_LOCAL || 'redis://localhost:6379'
const redisUrlProd: string = process.env.REDIS_URL || ''

const redisUrl: string = process.env.NODE_ENV === 'production' ? redisUrlProd : redisUrlLocal

// Force TLS for Upstash Redis connections in production
const finalRedisUrl: string = redisUrl.includes('upstash.io') ? redisUrl.replace('redis://', 'rediss://') : redisUrl

const redis: RedisClientType = createClient({
  url: finalRedisUrl,
  socket: finalRedisUrl.startsWith('rediss://') ? {
    tls: true,
    rejectUnauthorized: false,
    reconnectStrategy: (retries: number): number => {
       return Math.min(retries * 100, 3000); // backoff up to 3s
    },
  } : {
    reconnectStrategy: (retries: number): number => {
       return Math.min(retries * 100, 3000); // backoff up to 3s
    },
  },
});

redis.on('error', (err: Error): void => {
    console.error('Redis Client Error', err);
})


export const connectRedis = async (): Promise<void> => {
 if (!redis.isOpen) {
    await redis.connect();
    console.log('✅ Connected to Redis');
  }
}

export const setSession = async (userId: number, sessionData: SessionData): Promise<void> => {
  await redis.set(`session:${userId}`, JSON.stringify(sessionData), { EX: 3600 }); // Expire in 1 hour
}

export const getSession = async (userId: number): Promise<SessionData | null> => {
  try {
     if (!redis.isOpen) {
    await redis.connect();
   }
    const data: string | null = await redis.get(`session:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

export const deleteSession = async (userId: number): Promise<void> => {
   if (!redis.isOpen) {
    await redis.connect();
   }
  await redis.del(`session:${userId}`);
};

export { redis };
