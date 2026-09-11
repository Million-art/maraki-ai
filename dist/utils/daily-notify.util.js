import { redis } from './redis.js';
// Redis keys:
//   user:daily_notify:{userId}        → 'yes' | 'no'
//   user:daily_notify_asked:{userId}  → '1'
//   daily_notify:opted_in             → Redis Set of userId strings
const OPTED_IN_SET = 'daily_notify:opted_in';
// ── Preference helpers ────────────────────────────────────────────────────────
export async function getNotifyPreference(userId) {
    try {
        if (redis.isOpen) {
            const val = await redis.get(`user:daily_notify:${userId}`);
            if (val === 'yes' || val === 'no')
                return val;
        }
    }
    catch (e) { }
    return null;
}
export async function setNotifyPreference(userId, pref) {
    try {
        if (redis.isOpen) {
            await redis.set(`user:daily_notify:${userId}`, pref);
            if (pref === 'yes') {
                await redis.sAdd(OPTED_IN_SET, String(userId));
            }
            else {
                await redis.sRem(OPTED_IN_SET, String(userId));
            }
        }
    }
    catch (e) { }
}
// ── Asked-flag helpers ────────────────────────────────────────────────────────
export async function hasBeenAsked(userId) {
    try {
        if (redis.isOpen) {
            const val = await redis.get(`user:daily_notify_asked:${userId}`);
            return val === '1';
        }
    }
    catch (e) { }
    return false;
}
export async function markAsAsked(userId) {
    try {
        if (redis.isOpen) {
            // TTL of 400 days   effectively permanent but auto-cleans for long-inactive users
            await redis.set(`user:daily_notify_asked:${userId}`, '1', { EX: 60 * 60 * 24 * 400 });
        }
    }
    catch (e) { }
}
// ── Broadcast helpers ─────────────────────────────────────────────────────────
export async function getOptedInUserIds() {
    try {
        if (redis.isOpen) {
            const members = await redis.sMembers(OPTED_IN_SET);
            return members.map(Number).filter(Boolean);
        }
    }
    catch (e) { }
    return [];
}
