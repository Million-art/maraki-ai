import { InlineKeyboard } from 'grammy';
import { apiService } from '../services/api.service.js';
import { checkChannelMembership } from '../utils/channel-check.util.js';
/**
 * Centralized Authentication & Access Control Guard.
 * Validates user identity, auto-registers student user, and checks usage limits
 * before allowing access to lessons, quizzes, or chat/voice practice.
 */
export async function checkCentralAuthAndAccess(ctx, resource) {
    if (!ctx.from) {
        await ctx.reply("⚠️ Could not verify your Telegram ID.");
        return false;
    }
    const userId = ctx.from.id;
    // 0. Channel Membership Validation (Force Join)
    const isMember = await checkChannelMembership(ctx);
    if (!isMember) {
        return false; // Access denied until they join
    }
    // 1. Centralized Authentication & Profile Synchronization
    try {
        await apiService.registerStudent({
            telegramId: userId,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name,
            username: ctx.from.username,
        });
    }
    catch (err) {
        console.warn(`[CentralAuth] Profile sync failed for user ${userId}:`, err);
    }
    // Voice quota check
    if (resource === 'voice') {
        try {
            const voiceQuota = await apiService.getVoiceQuota(userId);
            if (!voiceQuota.allowed) {
                const keyboard = new InlineKeyboard()
                    .text("💳 1 Week Access (149 ETB)", "pay_weekly")
                    .row()
                    .text("🌟 1 Month VIP Access (550 ETB)", "pay_monthly")
                    .row()
                    .text("🔥 3 Months Pass (1,299 ETB)", "pay_quarterly");
                const isSubActive = !voiceQuota.isExpired && voiceQuota.tier !== 'FREE';
                const noticeText = isSubActive
                    ? `⏱️ *Voice AI Minute Limit Reached*\n\n` +
                        `You have used all your Voice AI practice minutes for this period.\n\n` +
                        `📚 *Your VIP Subscription is Still Active!*\n` +
                        `You still have **unlimited access to all quizzes, grammar lessons, and practice exams** through your expiration date! 🚀\n\n` +
                        `🎙️ Want to add more Voice AI minutes right now? Choose an option below to extend:`
                    : `⏱️ *Voice AI Access Limit Reached*\n\n` +
                        `Your free Voice AI practice minutes have ended. Upgrade to Maraki VIP to continue practicing voice conversations!\n\n` +
                        `✨ Get unlimited lessons, quizzes, and weekly Voice AI access!`;
                await ctx.reply(noticeText, { parse_mode: 'Markdown', reply_markup: keyboard });
                return false;
            }
        }
        catch (e) {
            console.warn(`[CentralAuth] Voice quota check error for ${userId}:`, e);
        }
    }
    // 2. Centralized Usage Quota & VIP Access Verification
    try {
        const usage = await apiService.getUsageStatus(userId);
        // VIP Users have unlimited access to all features
        if (usage && usage.isPremium) {
            return true;
        }
        const keyboard = new InlineKeyboard().text("💳 Upgrade to VIP  Unlimited Access", "pay");
        if (resource === 'lesson') {
            const lessonsUsed = usage?.weeklyLessonsUsed ?? 0;
            const lessonLimit = usage?.weeklyLessonLimit ?? 5;
            const remainingLessons = usage?.remainingLessons ?? (lessonLimit - lessonsUsed);
            if (remainingLessons <= 0) {
                let resetText = "7 days after your first usage";
                if (usage?.nextLessonReset) {
                    const resetDate = new Date(usage.nextLessonReset);
                    const now = new Date();
                    const diffMs = resetDate.getTime() - now.getTime();
                    if (diffMs > 0) {
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        if (diffDays > 0) {
                            resetText = `in **${diffDays} day(s) and ${diffHours} hour(s)**`;
                        }
                        else if (diffHours > 0) {
                            resetText = `in **${diffHours} hour(s)**`;
                        }
                        else {
                            resetText = `in less than an hour`;
                        }
                    }
                }
                await ctx.reply(`🚫 *Weekly Lesson Limit Reached!*\n\n` +
                    `You have used all *${lessonLimit} free lessons* for your current 7-day window.\n\n` +
                    `⏳ Your next free lesson unlocks ${resetText}.\n\n` +
                    `🔓 *Upgrade to VIP* for unlimited lessons, quizzes, and AI practice   550 ETB/month!`, { parse_mode: 'Markdown', reply_markup: keyboard });
                return false;
            }
        }
        else if (resource === 'quiz') {
            const quizzesUsed = usage?.weeklyQuizzesUsed ?? 0;
            const quizLimit = usage?.weeklyQuizLimit ?? 3;
            const remainingQuizzes = Math.max(0, quizLimit - quizzesUsed);
            if (remainingQuizzes <= 0) {
                let resetText = "7 days after your first usage";
                if (usage?.nextQuizReset) {
                    const resetDate = new Date(usage.nextQuizReset);
                    const now = new Date();
                    const diffMs = resetDate.getTime() - now.getTime();
                    if (diffMs > 0) {
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        if (diffDays > 0) {
                            resetText = `in **${diffDays} day(s) and ${diffHours} hour(s)**`;
                        }
                        else if (diffHours > 0) {
                            resetText = `in **${diffHours} hour(s)**`;
                        }
                        else {
                            resetText = `in less than an hour`;
                        }
                    }
                }
                await ctx.reply(`🚫 *Weekly Quiz Limit Reached!*\n\n` +
                    `You have used all *${quizLimit} free quizzes* for your current 7-day window.\n\n` +
                    `⏳ Your next free quiz unlocks ${resetText}.\n\n` +
                    `🔓 *Upgrade to VIP* for unlimited quizzes, lessons, and AI practice   550 ETB/month!`, { parse_mode: 'Markdown', reply_markup: keyboard });
                return false;
            }
        }
    }
    catch (error) {
        console.error(`[CentralAuth] Error checking usage status for ${userId}:`, error);
        // Strict Fail-Closed Security: if an error occurs while evaluating quiz limits, block access
        if (resource === 'quiz') {
            const keyboard = new InlineKeyboard().text("💳 Upgrade to VIP  Unlimited Access", "pay");
            await ctx.reply(`🚫 *Service Unavailable*\n\n` +
                `We couldn't verify your quota right now. Please try again shortly.\n\n` +
                `🔓 *Upgrade to VIP* for unlimited offline-ready access!`, { parse_mode: 'Markdown', reply_markup: keyboard });
            return false;
        }
    }
    return true;
}
