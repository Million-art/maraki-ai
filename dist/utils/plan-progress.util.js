import { redis } from './redis.js';
import { apiService } from '../services/api.service.js';
const memoryPlanStore = new Map();
function getTodayString() {
    const d = new Date();
    return d.toLocaleDateString('sv-SE', { timeZone: 'Africa/Addis_Ababa' });
}
/**
 * Retrieve user's current 7-day plan progress (Database is primary, Redis/memory as cache)
 */
export async function getPlanProgress(userId) {
    // 1. Try fast local cache
    try {
        if (redis.isOpen) {
            const raw = await redis.get(`user:plan_progress:${userId}`);
            if (raw)
                return JSON.parse(raw);
        }
        else if (memoryPlanStore.has(userId)) {
            return memoryPlanStore.get(userId);
        }
    }
    catch (e) { }
    // 2. Fetch authoritative state from PostgreSQL database
    try {
        const dbProgress = await apiService.getStudentPlanProgress(userId);
        if (dbProgress && (dbProgress.completedDays?.length > 0 || dbProgress.currentDay > 1)) {
            const formatted = {
                currentDay: dbProgress.currentDay || 1,
                completedDays: dbProgress.completedDays || [],
                lastCompletedAt: dbProgress.lastCompletedAt,
                activeLesson: dbProgress.activeLesson,
            };
            // Populate cache
            memoryPlanStore.set(userId, formatted);
            if (redis.isOpen) {
                await redis.set(`user:plan_progress:${userId}`, JSON.stringify(formatted));
            }
            return formatted;
        }
    }
    catch (e) { }
    return { currentDay: 1, completedDays: [] };
}
/**
 * Mark a plan day as completed and advance to next day (persisted to PostgreSQL DB)
 */
export async function completePlanDay(userId, dayNumber) {
    const today = getTodayString();
    const current = await getPlanProgress(userId);
    const completedSet = new Set(current.completedDays);
    completedSet.add(dayNumber);
    const completedDays = Array.from(completedSet).sort((a, b) => a - b);
    let nextDay = current.currentDay;
    if (dayNumber >= current.currentDay) {
        nextDay = Math.min(7, dayNumber + 1);
    }
    const updated = {
        currentDay: nextDay,
        completedDays,
        lastCompletedAt: today,
    };
    // 1. Update cache
    memoryPlanStore.set(userId, updated);
    try {
        if (redis.isOpen) {
            await redis.set(`user:plan_progress:${userId}`, JSON.stringify(updated));
        }
    }
    catch (e) { }
    // 2. Persist to PostgreSQL database
    try {
        await apiService.saveStudentPlanProgress(userId, {
            completedDay: dayNumber,
            currentDay: nextDay,
        });
    }
    catch (e) {
        console.error('[PlanProgress] Failed to persist to database:', e);
    }
    return updated;
}
