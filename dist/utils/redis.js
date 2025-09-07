import { createClient } from 'redis';
// Environment-specific Redis configuration
const redisUrlLocal = process.env.REDIS_URL_LOCAL || 'redis://localhost:6379';
const redisUrlProd = process.env.REDIS_URL;
const redisUrl = process.env.NODE_ENV === 'production' ? redisUrlProd : redisUrlLocal;
// Force TLS for Upstash Redis connections in production
const finalRedisUrl = redisUrl.includes('upstash.io') ? redisUrl.replace('redis://', 'rediss://') : redisUrl;
const redis = createClient({
    url: finalRedisUrl,
    socket: finalRedisUrl.startsWith('rediss://') ? {
        tls: true,
        rejectUnauthorized: false,
        reconnectStrategy: (retries) => {
            return Math.min(retries * 100, 3000); // backoff up to 3s
        },
    } : {
        reconnectStrategy: (retries) => {
            return Math.min(retries * 100, 3000); // backoff up to 3s
        },
    },
});
redis.on('error', err => {
    console.error('Redis Client Error', err);
});
export const connectRedis = async () => {
    if (!redis.isOpen) {
        await redis.connect();
        console.log('✅ Connected to Redis');
    }
};
export const setSession = async (userId, sessionData) => {
    await redis.set(`session:${userId}`, JSON.stringify(sessionData), { EX: 3600 }); // Expire in 1 hour
};
export const getSession = async (userId) => {
    try {
        if (!redis.isOpen) {
            await redis.connect();
        }
        const data = await redis.get(`session:${userId}`);
        return data ? JSON.parse(data) : null;
    }
    catch (error) {
        console.error('Error getting session:', error);
        return null;
    }
};
export const deleteSession = async (userId) => {
    if (!redis.isOpen) {
        await redis.connect();
    }
    await redis.del(`session:${userId}`);
};
export { redis };
