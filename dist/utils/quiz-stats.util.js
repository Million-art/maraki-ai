import { redis } from './redis.js';
const memoryStatsStore = new Map();
export async function recordQuizCompletion(userId, correct, total = 5) {
    let stats = { totalQuizzesCompleted: 0, totalQuestions: 0, totalCorrect: 0 };
    try {
        if (redis.isOpen) {
            const raw = await redis.get(`user:quiz_stats:${userId}`);
            if (raw) {
                stats = JSON.parse(raw);
            }
        }
        else if (memoryStatsStore.has(userId)) {
            stats = memoryStatsStore.get(userId);
        }
    }
    catch (e) { }
    stats.totalQuizzesCompleted += 1;
    stats.totalQuestions += total;
    stats.totalCorrect += correct;
    try {
        if (redis.isOpen) {
            await redis.set(`user:quiz_stats:${userId}`, JSON.stringify(stats));
        }
    }
    catch (e) { }
    memoryStatsStore.set(userId, stats);
    return stats;
}
export async function getLocalQuizStats(userId) {
    try {
        if (redis.isOpen) {
            const raw = await redis.get(`user:quiz_stats:${userId}`);
            if (raw) {
                return JSON.parse(raw);
            }
        }
        else if (memoryStatsStore.has(userId)) {
            return memoryStatsStore.get(userId);
        }
    }
    catch (e) { }
    // Return zero stats   the backend API is the authoritative source for weekly counts.
    // We must NOT hydrate from totalQuizzesCompleted (a lifetime counter) as it would
    // poison the cache and make the bot think the user has exhausted their weekly quota.
    return { totalQuizzesCompleted: 0, totalQuestions: 0, totalCorrect: 0 };
}
export const quizStatsService = {
    getLocalQuizStats,
    recordQuizCompletion,
};
