import { redis } from './redis.js';
const memoryStreakStore = new Map();
function getTodayString() {
    const d = new Date();
    return d.toLocaleDateString('sv-SE', { timeZone: 'Africa/Addis_Ababa' });
}
function getYesterdayString() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('sv-SE', { timeZone: 'Africa/Addis_Ababa' });
}
/**
 * Record user daily activity and return updated streak count
 */
export async function updateDailyStreak(userId) {
    const today = getTodayString();
    const yesterday = getYesterdayString();
    let streakData = { streak: 1, lastDate: '' };
    try {
        if (redis.isOpen) {
            const raw = await redis.get(`user:streak:${userId}`);
            if (raw) {
                streakData = JSON.parse(raw);
            }
        }
        else if (memoryStreakStore.has(userId)) {
            streakData = memoryStreakStore.get(userId);
        }
    }
    catch (e) { }
    let isNewDay = false;
    if (streakData.lastDate === today) {
        // Already checked in today
        isNewDay = false;
    }
    else if (streakData.lastDate === yesterday) {
        // Consecutive day check-in
        streakData.streak += 1;
        streakData.lastDate = today;
        isNewDay = true;
    }
    else {
        // Missed a day or first check-in
        streakData.streak = 1;
        streakData.lastDate = today;
        isNewDay = true;
    }
    // Persist
    try {
        if (redis.isOpen) {
            await redis.set(`user:streak:${userId}`, JSON.stringify(streakData));
        }
    }
    catch (e) { }
    memoryStreakStore.set(userId, streakData);
    return { streak: streakData.streak, isNewDay };
}
/**
 * Get current streak count for user
 */
export async function getDailyStreak(userId) {
    const today = getTodayString();
    const yesterday = getYesterdayString();
    try {
        if (redis.isOpen) {
            const raw = await redis.get(`user:streak:${userId}`);
            if (raw) {
                const data = JSON.parse(raw);
                if (data.lastDate === today || data.lastDate === yesterday) {
                    return data.streak;
                }
                return 0; // Expired streak
            }
        }
        else if (memoryStreakStore.has(userId)) {
            const data = memoryStreakStore.get(userId);
            if (data.lastDate === today || data.lastDate === yesterday) {
                return data.streak;
            }
            return 0;
        }
    }
    catch (e) { }
    return 1;
}
