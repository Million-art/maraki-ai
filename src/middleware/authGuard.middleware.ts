import { Context, InlineKeyboard } from 'grammy';
import { apiService } from '../services/api.service.js';

export type ProtectedResource = 'lesson' | 'quiz' | 'chat';

/**
 * Centralized Authentication & Access Control Guard.
 * Validates user identity, auto-registers student user, and checks usage limits 
 * before allowing access to lessons, quizzes, or chat practice.
 */
export async function checkCentralAuthAndAccess(
  ctx: Context,
  resource: ProtectedResource
): Promise<boolean> {
  if (!ctx.from) {
    await ctx.reply("⚠️ Could not verify your Telegram ID.");
    return false;
  }

  const userId = ctx.from.id;

  // 1. Centralized Authentication & Profile Synchronization
  try {
    await apiService.registerStudent({
      telegramId: userId,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      username: ctx.from.username,
    });
  } catch (err) {
    console.warn(`[CentralAuth] Profile sync failed for user ${userId}:`, err);
  }

  // 2. Centralized Usage Quota & VIP Access Verification
  try {
    const usage = await apiService.getUsageStatus(userId);

    // VIP Users have unlimited access to all features
    if (usage.isPremium) {
      return true;
    }

    const keyboard = new InlineKeyboard().text("💳 Upgrade to VIP — Unlimited Access", "pay");

    if (resource === 'lesson') {
      const lessonsUsed = usage.weeklyLessonsUsed ?? 0;
      const lessonLimit = usage.weeklyLessonLimit ?? 5;
      const remainingLessons = usage.remainingLessons ?? (lessonLimit - lessonsUsed);

      if (remainingLessons <= 0) {
        await ctx.reply(
          `🚫 <b>Weekly Lesson Limit Reached!</b>\n\n` +
          `You have used all <b>${lessonLimit} free lessons</b> this week.\n\n` +
          `⏳ Your quota resets every <b>Monday</b>.\n\n` +
          `🔓 <b>Upgrade to VIP</b> for unlimited lessons, quizzes, and AI practice — 299 ETB/month!`,
          { parse_mode: 'HTML', reply_markup: keyboard }
        );
        return false;
      }
    } else if (resource === 'quiz') {
      const quizzesUsed = usage.weeklyQuizzesUsed ?? 0;
      const quizLimit = usage.weeklyQuizLimit ?? 3;
      const remainingQuizzes = usage.remaining ?? (quizLimit - quizzesUsed);

      if (remainingQuizzes <= 0) {
        await ctx.reply(
          `🚫 <b>Weekly Quiz Limit Reached!</b>\n\n` +
          `You have used all <b>${quizLimit} free quizzes</b> this week.\n\n` +
          `⏳ Your quota resets every <b>Monday</b>.\n\n` +
          `🔓 <b>Upgrade to VIP</b> for unlimited quizzes, lessons, and AI practice — 299 ETB/month!`,
          { parse_mode: 'HTML', reply_markup: keyboard }
        );
        return false;
      }
    }
  } catch (error) {
    console.error(`[CentralAuth] Error checking usage status for ${userId}:`, error);
  }

  return true;
}
