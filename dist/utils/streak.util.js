import { redis } from './redis.js';
import { apiService } from '../services/api.service.js';
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
 * Record user daily activity and return updated streak count (persisted to PostgreSQL DB)
 */
export async function updateDailyStreak(userId) {
    const today = getTodayString();
    // 1. Persist directly to PostgreSQL database via backend API
    try {
        const res = await apiService.updateStudentStreak(userId);
        if (res && res.streak !== undefined) {
            const streakData = { streak: res.streak, lastDate: today };
            memoryStreakStore.set(userId, streakData);
            if (redis.isOpen) {
                await redis.set(`user:streak:${userId}`, JSON.stringify(streakData));
            }
            return { streak: res.streak, isNewDay: res.isNewDay };
        }
    }
    catch (e) {
        console.error('[Streak] Failed to update streak in database:', e);
    }
    // 2. Fallback to local cache if backend is unreachable
    const yesterday = getYesterdayString();
    let streakData = { streak: 1, lastDate: '' };
    try {
        if (redis.isOpen) {
            const raw = await redis.get(`user:streak:${userId}`);
            if (raw)
                streakData = JSON.parse(raw);
        }
        else if (memoryStreakStore.has(userId)) {
            streakData = memoryStreakStore.get(userId);
        }
    }
    catch (e) { }
    let isNewDay = false;
    if (streakData.lastDate === today) {
        isNewDay = false;
    }
    else if (streakData.lastDate === yesterday) {
        streakData.streak += 1;
        streakData.lastDate = today;
        isNewDay = true;
    }
    else {
        streakData.streak = 1;
        streakData.lastDate = today;
        isNewDay = true;
    }
    memoryStreakStore.set(userId, streakData);
    return { streak: streakData.streak, isNewDay };
}
/**
 * Get current streak count for user from database or cache
 */
export async function getDailyStreak(userId) {
    const today = getTodayString();
    const yesterday = getYesterdayString();
    // 1. Try local cache
    try {
        if (redis.isOpen) {
            const raw = await redis.get(`user:streak:${userId}`);
            if (raw) {
                const data = JSON.parse(raw);
                if (data.lastDate === today || data.lastDate === yesterday) {
                    return data.streak;
                }
            }
        }
        else if (memoryStreakStore.has(userId)) {
            const data = memoryStreakStore.get(userId);
            if (data.lastDate === today || data.lastDate === yesterday) {
                return data.streak;
            }
        }
    }
    catch (e) { }
    // 2. Query authoritative database
    try {
        const streak = await apiService.getStudentStreak(userId);
        if (streak !== undefined) {
            return streak;
        }
    }
    catch (e) { }
    return 1;
}
