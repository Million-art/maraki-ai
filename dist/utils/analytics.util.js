import { redis } from './redis.js';
export const ADMIN_TELEGRAM_ID = 386095768;
// Map to track pending automated 15-minute follow-up timers
const activeFollowupTimers = new Map();
// In-memory counter store fallback
const statsStore = {
    newUsers: 0,
    upgradeClicks: 0,
    paymentFailures: 0,
    paymentSuccesses: 0,
};
// Track and Notify New User Join
export async function trackNewUser(ctx) {
    if (!ctx.from)
        return;
    // Prevent admin self-notifications
    if (ctx.from.id === ADMIN_TELEGRAM_ID)
        return;
    statsStore.newUsers++;
    try {
        if (redis.isOpen) {
            await redis.incr('analytics:new_users');
        }
    }
    catch (e) { }
    const user = ctx.from;
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
    const username = user.username ? `@${user.username}` : 'No username';
    const alertMsg = `🆕 <b>New User Joined Maraki AI!</b>\n\n` +
        `👤 <b>Name:</b> ${name}\n` +
        `💬 <b>Username:</b> ${username}\n` +
        `🆔 <b>User ID:</b> <code>${user.id}</code>\n` +
        `📅 <b>Joined:</b> ${new Date().toLocaleString()}`;
    try {
        await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, alertMsg, { parse_mode: 'HTML' });
    }
    catch (err) {
        console.error('Failed to notify admin of new user:', err);
    }
}
// Track and Notify Upgrade/Payment Click with 1-Click Admin Follow-up & Scheduled Auto Nudge
export async function trackUpgradeIntent(ctx) {
    if (!ctx.from)
        return;
    // Prevent admin self-notifications
    if (ctx.from.id === ADMIN_TELEGRAM_ID)
        return;
    statsStore.upgradeClicks++;
    try {
        if (redis.isOpen) {
            await redis.incr('analytics:upgrade_clicks');
        }
    }
    catch (e) { }
    const user = ctx.from;
    const userId = user.id;
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
    const firstName = user.first_name || 'there';
    const username = user.username ? `@${user.username}` : 'No username';
    const { InlineKeyboard } = await import('grammy');
    const keyboard = new InlineKeyboard()
        .text("💬 Send Follow-up via Bot", `admin_followup_${userId}`)
        .text("🎁 Send Special Discount", `admin_discount_${userId}`);
    const alertMsg = `💳 <b>User Clicked Upgrade / VIP!</b>\n\n` +
        `👤 <b>Name:</b> ${name}\n` +
        `💬 <b>Username:</b> ${username}\n` +
        `🆔 <b>User ID:</b> <code>${userId}</code>\n\n` +
        `💡 <i>Click below to send an automated follow-up message to this user directly via Maraki Bot!</i>`;
    try {
        await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, alertMsg, { parse_mode: 'HTML', reply_markup: keyboard });
    }
    catch (err) {
        console.error('Failed to notify admin of upgrade click:', err);
    }
    // Store follow-up intent in Redis with 15-minute TTL for zero server memory overhead & persistence
    try {
        if (redis.isOpen) {
            await redis.set(`followup:intent:${userId}`, JSON.stringify({ userId, firstName, timestamp: Date.now() }), { EX: 900 });
        }
    }
    catch (e) { }
    // Clear existing timer if any
    if (activeFollowupTimers.has(userId)) {
        clearTimeout(activeFollowupTimers.get(userId));
    }
    // Schedule automated 15-minute follow-up nudge (if user doesn't complete payment)
    const timer = setTimeout(async () => {
        activeFollowupTimers.delete(userId);
        try {
            // Verify if Redis key was cleared (indicating payment completed elsewhere)
            if (redis.isOpen) {
                const pendingKey = await redis.get(`followup:intent:${userId}`);
                if (!pendingKey)
                    return; // Payment completed or canceled!
                await redis.del(`followup:intent:${userId}`);
            }
            const { apiService } = await import('../services/api.service.js');
            const latestUser = await apiService.getUserByTelegramId(userId).catch(() => null);
            if (latestUser && (latestUser.isMarakiPremium || latestUser.isPremium)) {
                return; // User already upgraded, skip nudge!
            }
            const followupKeyboard = new InlineKeyboard()
                .text("💳 View Plans & Bank Details", "pay")
                .row()
                .text("💬 Chat with Support", "contact_support");
            await ctx.api.sendMessage(userId, `👋 *Hi ${firstName}!*\n\n` +
                `We noticed you were checking out Maraki VIP subscription options earlier.\n\n` +
                `❓ *Need any assistance?*\n` +
                `Our bank verification works automatically with **CBE (1000342472501)** & **Dashen (5427280818011)** in < 5 seconds!\n\n` +
                `Click below if you have any questions or would like help activating your account:`, { parse_mode: 'Markdown', reply_markup: followupKeyboard });
        }
        catch (e) {
            console.error(`Failed to send 15-min auto follow-up to user ${userId}:`, e);
        }
    }, 15 * 60 * 1000); // 15 minutes
    activeFollowupTimers.set(userId, timer);
}
// Track and Notify Payment Verification Attempt (Success / Failure)
export async function trackPaymentAttempt(ctx, referenceText, result) {
    if (!ctx.from)
        return;
    const user = ctx.from;
    const userId = user.id;
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
    const username = user.username ? `@${user.username}` : 'No username';
    if (result.success) {
        // Instantly delete Redis key & in-memory timer on successful payment
        try {
            if (redis.isOpen) {
                await redis.del(`followup:intent:${userId}`);
            }
        }
        catch (e) { }
        if (activeFollowupTimers.has(userId)) {
            clearTimeout(activeFollowupTimers.get(userId));
            activeFollowupTimers.delete(userId);
        }
        statsStore.paymentSuccesses++;
        try {
            if (redis.isOpen) {
                await redis.incr('analytics:payment_successes');
            }
        }
        catch (e) { }
        const alertMsg = `🎉 <b>Payment Verified & VIP Activated!</b>\n\n` +
            `👤 <b>Name:</b> ${name} (${username})\n` +
            `🆔 <b>ID:</b> <code>${user.id}</code>\n` +
            `🏦 <b>Bank:</b> ${result.result?.bankName || 'CBE'}\n` +
            `💰 <b>Amount:</b> ${result.result?.amount || 299} ETB\n` +
            `🧾 <b>Reference:</b> <code>${referenceText}</code>`;
        try {
            await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, alertMsg, { parse_mode: 'HTML' });
        }
        catch (err) { }
    }
    else {
        statsStore.paymentFailures++;
        try {
            if (redis.isOpen) {
                await redis.incr('analytics:payment_failures');
            }
        }
        catch (e) { }
        const { InlineKeyboard } = await import('grammy');
        const keyboard = new InlineKeyboard()
            .text("💬 Contact User via Bot", `admin_followup_${userId}`)
            .row()
            .text("⚡ Approve 1 Month VIP", `admin_approve_${userId}_monthly`)
            .text("⚡ Approve 1 Week VIP", `admin_approve_${userId}_weekly`);
        const alertMsg = `🚨 <b>Payment Verification Failed Alert</b>\n\n` +
            `👤 <b>Student:</b> ${name}\n` +
            `💬 <b>Username:</b> ${username}\n` +
            `🆔 <b>User ID:</b> <code>${user.id}</code>\n` +
            `🧾 <b>Submitted Input:</b> <code>${referenceText.slice(0, 200)}</code>\n` +
            `❌ <b>Error Reason:</b> <code>${result.message || 'Transaction could not be verified'}</code>\n` +
            `⏰ <b>Timestamp:</b> ${new Date().toLocaleString()}\n\n` +
            `💡 <i>You can click "Approve" below to instantly grant VIP access to this user directly via Telegram!</i>`;
        try {
            await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, alertMsg, { parse_mode: 'HTML', reply_markup: keyboard });
        }
        catch (err) { }
    }
}
// Dedicated helper to alert Admin on uncaught payment system/network exceptions
export async function notifyAdminPaymentError(ctx, referenceText, error) {
    if (!ctx.from)
        return;
    const user = ctx.from;
    const userId = user.id;
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
    const username = user.username ? `@${user.username}` : 'No username';
    const errorDetails = error?.response?.data?.message || error?.message || String(error);
    const { InlineKeyboard } = await import('grammy');
    const keyboard = new InlineKeyboard()
        .text("💬 Contact User via Bot", `admin_followup_${userId}`)
        .row()
        .text("⚡ Approve 1 Month VIP", `admin_approve_${userId}_monthly`)
        .text("⚡ Approve 1 Week VIP", `admin_approve_${userId}_weekly`);
    const alertMsg = `🔥 <b>Payment System Exception Alert!</b>\n\n` +
        `👤 <b>Student:</b> ${name}\n` +
        `💬 <b>Username:</b> ${username}\n` +
        `🆔 <b>User ID:</b> <code>${userId}</code>\n` +
        `🧾 <b>Submitted Input:</b> <code>${referenceText.slice(0, 200)}</code>\n` +
        `⚠️ <b>Exception:</b> <code>${errorDetails}</code>\n` +
        `⏰ <b>Timestamp:</b> ${new Date().toLocaleString()}\n\n` +
        `💡 <i>Click "Approve" below to manually grant VIP access to this student without checking Docker logs!</i>`;
    try {
        await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, alertMsg, { parse_mode: 'HTML', reply_markup: keyboard });
    }
    catch (err) {
        console.error('Failed to send admin payment exception alert:', err);
    }
}
// Helper function to handle Admin 1-click follow-up & approval buttons from alerts
export async function handleAdminFollowupAction(ctx, actionData) {
    if (!ctx.from || ctx.from.id !== ADMIN_TELEGRAM_ID)
        return;
    const { InlineKeyboard } = await import('grammy');
    if (actionData.startsWith('admin_approve_')) {
        // Format: admin_approve_<userId>_<tier>
        const parts = actionData.replace('admin_approve_', '').split('_');
        const targetUserId = parseInt(parts[0], 10);
        const tier = parts[1] || 'monthly';
        if (!targetUserId)
            return;
        try {
            const { apiService } = await import('../services/api.service.js');
            const overrideRef = `ADMIN_OVERRIDE_${Date.now()}_${targetUserId}`;
            const res = await apiService.verifyBankPayment(targetUserId, overrideRef, tier);
            if (res?.success) {
                const tierTitle = tier === 'weekly' ? '1 WEEK VIP' : '1 MONTH VIP';
                const userMsg = `🎉 *የVIP አባልነትዎ ተፈቅዷል!*\n\n` +
                    `🎁 *እንኳን ደስ አሎት!* አሁን የ **${tierTitle}** Maraki Premium አባልነት አግኝተዋል።\n` +
                    `🌟 አሁን ያለገደብ የMaraki AI የድምጽ ውይይት፣ የልምምድ ሞጁሎች እና ፈተናዎችን መጠቀም ይችላሉ።`;
                await ctx.api.sendMessage(targetUserId, userMsg, { parse_mode: 'Markdown' });
                await ctx.answerCallbackQuery(`✅ ${tierTitle} Granted to user ${targetUserId}!`);
                await ctx.reply(`✅ *Granted ${tierTitle} access to student \`${targetUserId}\` successfully!*`, { parse_mode: 'Markdown' });
            }
            else {
                await ctx.answerCallbackQuery('❌ Manual approval failed');
                await ctx.reply(`❌ Failed to grant VIP: ${res?.message || 'Unknown error'}`);
            }
        }
        catch (err) {
            await ctx.answerCallbackQuery('❌ Approval failed');
            await ctx.reply(`❌ Error executing manual approval: ${err.message}`);
        }
    }
    else if (actionData.startsWith('admin_followup_')) {
        const targetUserId = parseInt(actionData.replace('admin_followup_', ''), 10);
        if (!targetUserId)
            return;
        try {
            const followupMsg = `👋 *Hi there!*\n\n` +
                `We noticed you were checking out Maraki VIP options.\n` +
                `If you have any questions about CBE / Dashen bank transfer or need assistance with activation, feel free to reply directly to this message! 🚀`;
            const keyboard = new InlineKeyboard()
                .text("💳 View Pricing & Accounts", "pay")
                .row()
                .text("💬 Reply to Support", "contact_support");
            await ctx.api.sendMessage(targetUserId, followupMsg, { parse_mode: 'Markdown', reply_markup: keyboard });
            await ctx.answerCallbackQuery('✅ Follow-up sent to user via Bot!');
            await ctx.reply(`✅ *Follow-up message delivered to user \`${targetUserId}\` via Bot!*`, { parse_mode: 'Markdown' });
        }
        catch (err) {
            await ctx.answerCallbackQuery('❌ Delivery failed');
            await ctx.reply(`❌ Failed to send follow-up: ${err.message}`);
        }
    }
    else if (actionData.startsWith('admin_discount_')) {
        const targetUserId = parseInt(actionData.replace('admin_discount_', ''), 10);
        if (!targetUserId)
            return;
        try {
            const discountMsg = `🎁 *SPECIAL MARAKI VIP DISCOUNT OFFER!*\n\n` +
                `Get 1 Month of Maraki VIP for **only 199 ETB** (Save 100 ETB)!\n\n` +
                `🏦 *Transfer 199 ETB to:*\n` +
                `• **CBE**: \`1000342472501\` (Million Mulugeta)\n` +
                `• **Dashen**: \`5427280818011\` (Million Mulugeta)\n\n` +
                `Paste your receipt link here to activate your discount instantly! 🚀`;
            const keyboard = new InlineKeyboard().text("✅ Verify Payment", "submit_receipt_prompt");
            await ctx.api.sendMessage(targetUserId, discountMsg, { parse_mode: 'Markdown', reply_markup: keyboard });
            await ctx.answerCallbackQuery('🎁 Discount offer sent to user!');
            await ctx.reply(`🎁 *Discount offer delivered to user \`${targetUserId}\` via Bot!*`, { parse_mode: 'Markdown' });
        }
        catch (err) {
            await ctx.answerCallbackQuery('❌ Delivery failed');
            await ctx.reply(`❌ Failed to send discount: ${err.message}`);
        }
    }
}
// Get Analytics Stats for /admin_status
export async function getAnalyticsStats() {
    let newUsers = statsStore.newUsers;
    let upgradeClicks = statsStore.upgradeClicks;
    let paymentFailures = statsStore.paymentFailures;
    let paymentSuccesses = statsStore.paymentSuccesses;
    try {
        if (redis.isOpen) {
            const nu = await redis.get('analytics:new_users');
            const uc = await redis.get('analytics:upgrade_clicks');
            const pf = await redis.get('analytics:payment_failures');
            const ps = await redis.get('analytics:payment_successes');
            if (nu)
                newUsers = parseInt(nu, 10);
            if (uc)
                upgradeClicks = parseInt(uc, 10);
            if (pf)
                paymentFailures = parseInt(pf, 10);
            if (ps)
                paymentSuccesses = parseInt(ps, 10);
        }
    }
    catch (e) { }
    return {
        newUsers,
        upgradeClicks,
        paymentFailures,
        paymentSuccesses,
    };
}
// Track referral join in local store / Redis
const localReferralMap = new Map();
export async function trackReferralJoin(referrerId, newUserId) {
    if (!referrerId || referrerId === newUserId)
        return;
    if (!localReferralMap.has(referrerId)) {
        localReferralMap.set(referrerId, new Set());
    }
    localReferralMap.get(referrerId).add(newUserId);
    try {
        if (redis.isOpen) {
            await redis.sAdd(`referrals:${referrerId}`, String(newUserId));
        }
    }
    catch (e) { }
}
export async function getLocalReferralCount(referrerId) {
    let count = 0;
    if (localReferralMap.has(referrerId)) {
        count = localReferralMap.get(referrerId).size;
    }
    try {
        if (redis.isOpen) {
            const redisCount = await redis.sCard(`referrals:${referrerId}`);
            if (redisCount > count)
                count = redisCount;
        }
    }
    catch (e) { }
    return count;
}
