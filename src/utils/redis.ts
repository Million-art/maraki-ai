import {createClient} from 'redis'

const redis = createClient({
  url: process.env.REDIS_URL, 
  socket: {
    tls: true,        // Force TLS for Upstash
    rejectUnauthorized: false,
  },
})


redis.on('error', err=>{
    console.error('Redis Client Error', err);
})

 
export const connectRedis = async()=>{
 if (!redis.isOpen) {
    await redis.connect();
    console.log('✅ Connected to Redis (Upstash)');
  }
}

export const setSession = async(userId: number, sessionData: any)=>{
  await redis.set(`session:${userId}`, JSON.stringify(sessionData), { EX: 3600 }); // Expire in 1 hour
}

export const getSession = async (userId: number) => {
  try {
     if (!redis.isOpen) {
    await redis.connect();
   }
    const data = await redis.get(`session:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

export const deleteSession = async (userId: number) => {
   if (!redis.isOpen) {
    await redis.connect();
   }
  await redis.del(`session:${userId}`);
};

export { redis };
