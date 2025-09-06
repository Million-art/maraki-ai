import { createClient } from 'redis';
const redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redis.on('error', err => {
    console.error('Redis Client Error', err);
});
let isConnected = false;
export const connectRedis = async () => {
    if (!isConnected) {
        await redis.connect();
        isConnected = true;
    }
};
export const setSession = async (userId, sessionData) => {
    await redis.set(`session:${userId}`, JSON.stringify(sessionData), { EX: 3600 }); // Expire in 1 hour
};
export const getSession = async (userId) => {
    try {
        if (!isConnected) {
            await connectRedis();
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
    if (!isConnected) {
        await connectRedis();
    }
    await redis.del(`session:${userId}`);
};
export { redis };
