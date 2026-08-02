import { Context, InlineKeyboard } from 'grammy';
import { apiService } from '../services/api.service.js';

export async function usageCommand(ctx: Context) {
  if (!ctx.from) return;

  try {
    const usageStatus = await apiService.getUsageStatus(ctx.from.id);
    
    if (!usageStatus) {
      await ctx.reply("❌ Could not fetch your usage status. Please try again later.");
      return;
    }

    const isPremium = usageStatus.isPremium || false;
    const tier = isPremium ? 'MARAKI PREMIUM' : 'FREE TIER';
    
    let weeklyQuizzesUsed = usageStatus.weeklyQuizzesUsed || 0;
    try {
      const { getLocalQuizStats } = await import('../utils/quiz-stats.util.js');
      const local = await getLocalQuizStats(ctx.from.id);
      if (local.totalQuizzesCompleted > weeklyQuizzesUsed) {
        weeklyQuizzesUsed = Math.min(local.totalQuizzesCompleted, 3);
      }
    } catch (e) {}

    const weeklyQuizLimit = usageStatus.weeklyQuizLimit || 3;
    const remainingQuizzes = usageStatus.remaining !== undefined && usageStatus.remaining >= 0 ? Math.max(0, weeklyQuizLimit - weeklyQuizzesUsed) : (isPremium ? 'Unlimited' : Math.max(0, weeklyQuizLimit - weeklyQuizzesUsed));

    let weeklyLessonsUsed = usageStatus.weeklyLessonsUsed || 0;
    const weeklyLessonLimit = usageStatus.weeklyLessonLimit || 5;
    const remainingLessons = usageStatus.remainingLessons !== undefined && usageStatus.remainingLessons >= 0 ? usageStatus.remainingLessons : (isPremium ? 'Unlimited' : Math.max(0, weeklyLessonLimit - weeklyLessonsUsed));

    let message = `📊 <b>Your Usage & Allowance Status</b>\n\n`;
    message += `🎯 <b>Plan:</b> ${tier}\n\n`;

    const keyboard = new InlineKeyboard();

    if (isPremium) {
      message += `✨ <b>Premium Benefits Active:</b>\n`;
      message += `• ♾️ Unlimited Quizzes\n`;
      message += `• ♾️ Unlimited Lessons & Materials\n`;
      message += `• 🤖 Maraki AI Real-time Tutoring\n`;
    } else {
      // Quiz usage
      message += `📝 <b>Weekly Quizzes:</b>\n`;
      const quizBar = createProgressBar(weeklyQuizzesUsed, weeklyQuizLimit);
      message += `${quizBar}\n`;
      message += `${weeklyQuizzesUsed}/${weeklyQuizLimit} Quizzes Used (${remainingQuizzes} Left)\n\n`;

      // Lesson usage
      message += `📚 <b>Weekly Lessons:</b>\n`;
      const lessonBar = createProgressBar(weeklyLessonsUsed, weeklyLessonLimit);
      message += `${lessonBar}\n`;
      message += `${weeklyLessonsUsed}/${weeklyLessonLimit} Lessons Used (${remainingLessons} Left)\n\n`;

      // Upgrade CTA
      message += `💡 <b>Want Unlimited AI Quizzes & Real-time Tutoring?</b>\n`;
      message += `Upgrade to <b>Maraki Premium</b> for unlimited learning!\n`;

      keyboard.text("⚡ Upgrade to Maraki Premium", "pay").row();
    }

    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });

  } catch (error) {
    console.error('Usage command error:', error);
    await ctx.reply("❌ An error occurred while fetching your usage status. Please try again later.");
  }
}

function createProgressBar(current: number, limit: number): string {
  if (limit <= 0) return '██████████ 100%';
  const percentage = Math.min((current / limit) * 100, 100);
  const filled = Math.floor(percentage / 10);
  const empty = 10 - filled;
  
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(percentage)}%`;
}
