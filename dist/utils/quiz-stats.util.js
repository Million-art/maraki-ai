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
    // Hydrate from Database API if local/redis cache is empty
    let stats = { totalQuizzesCompleted: 0, totalQuestions: 0, totalCorrect: 0 };
    try {
        const { apiService } = await import('../services/api.service.js');
        const user = await apiService.getUserByTelegramId(userId);
        if (user) {
            const attempts = user.quizAttempts && Array.isArray(user.quizAttempts) ? user.quizAttempts : [];
            stats.totalQuizzesCompleted = user.totalQuizzesCompleted || attempts.length;
            if (attempts.length > 0) {
                stats.totalQuestions = attempts.reduce((acc, q) => acc + (q.totalQuestions || 5), 0);
                stats.totalCorrect = attempts.reduce((acc, q) => acc + (q.correctAnswers || 0), 0);
            }
            else if (stats.totalQuizzesCompleted > 0) {
                stats.totalQuestions = stats.totalQuizzesCompleted * 5;
                stats.totalCorrect = Math.round(stats.totalQuestions * 0.75); // Approximate historical
            }
        }
        if (redis.isOpen) {
            await redis.set(`user:quiz_stats:${userId}`, JSON.stringify(stats));
        }
        memoryStatsStore.set(userId, stats);
    }
    catch (e) { }
    return stats;
}
export const quizStatsService = {
    getLocalQuizStats,
    recordQuizCompletion,
};
