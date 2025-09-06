import {createClient} from 'redis'

const redisUrl = process.env.REDIS_URL || process.env.REDIS_URL_RENDER || 'redis://localhost:6379'

// Force TLS for Upstash Redis connections
const finalRedisUrl = redisUrl.includes('upstash.io') ? redisUrl.replace('redis://', 'rediss://') : redisUrl

const redis  = createClient({
    url: finalRedisUrl,
    socket: finalRedisUrl.startsWith('rediss://') ? {
        tls: true,
        rejectUnauthorized: false
    } : undefined
})

redis.on('error', err=>{
    console.error('Redis Client Error', err);
})

let isConnected = false;

export const connectRedis = async()=>{
    if (!isConnected) {
        await redis.connect();
        isConnected = true;
    }
}

export const setSession = async(userId: number, sessionData: any)=>{
  await redis.set(`session:${userId}`, JSON.stringify(sessionData), { EX: 3600 }); // Expire in 1 hour
}

export const getSession = async (userId: number) => {
  try {
    if (!isConnected) {
      await connectRedis();
    }
    const data = await redis.get(`session:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

export const deleteSession = async (userId: number) => {
  if (!isConnected) {
    await connectRedis();
  }
  await redis.del(`session:${userId}`);
};

export { redis };
