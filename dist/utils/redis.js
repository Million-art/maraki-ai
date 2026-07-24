import { createClient } from 'redis';
// In-memory session store fallback when Redis is offline
const inMemoryStore = new Map();
const redisUrlLocal = process.env.REDIS_URL_LOCAL || 'redis://localhost:6379';
const redisUrlProd = process.env.REDIS_URL || '';
const redisUrl = process.env.NODE_ENV === 'production' ? redisUrlProd : redisUrlLocal;
const finalRedisUrl = redisUrl.includes('upstash.io') ? redisUrl.replace('redis://', 'rediss://') : redisUrl;
let isRedisAvailable = false;
const redis = createClient({
    url: finalRedisUrl,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 1) {
                // Stop reconnect spamming if local Redis server is not running
                return new Error('Redis connection limit reached');
            }
            return 500;
        },
    },
});
redis.on('error', (err) => {
    if (!isRedisAvailable) {
        // Quietly ignore initial connection error when local redis is offline
        return;
    }
    console.error('Redis Client Error:', err.message);
});
export const connectRedis = async () => {
    try {
        if (!redis.isOpen && finalRedisUrl) {
            await redis.connect();
            isRedisAvailable = true;
            console.log('✅ Connected to Redis');
        }
    }
    catch (error) {
        isRedisAvailable = false;
        console.log('ℹ️ Redis offline. Using fast in-memory session cache.');
    }
};
export const setSession = async (userId, sessionData) => {
    if (isRedisAvailable && redis.isOpen) {
        try {
            await redis.set(`session:${userId}`, JSON.stringify(sessionData), { EX: 3600 });
            return;
        }
        catch (e) {
            // Fallback
        }
    }
    inMemoryStore.set(`session:${userId}`, sessionData);
};
export const getSession = async (userId) => {
    if (isRedisAvailable && redis.isOpen) {
        try {
            const data = await redis.get(`session:${userId}`);
            return data ? JSON.parse(data) : null;
        }
        catch (e) {
            // Fallback
        }
    }
    return inMemoryStore.get(`session:${userId}`) || null;
};
export const deleteSession = async (userId) => {
    if (isRedisAvailable && redis.isOpen) {
        try {
            await redis.del(`session:${userId}`);
        }
        catch (e) {
            // Fallback
        }
    }
    inMemoryStore.delete(`session:${userId}`);
};
export { redis };
