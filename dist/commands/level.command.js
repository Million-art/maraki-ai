import { InlineKeyboard } from "grammy";
import { getCurrentLevel } from "../services/user.service.js";
import { getDailyStreak } from "../utils/streak.util.js";
import { apiService } from "../services/api.service.js";
import { getLocalQuizStats } from '../utils/quiz-stats.util.js';
export const levelCommand = async (ctx) => {
    if (!ctx.from) {
        return ctx.reply("⚠️ Could not get your Telegram ID.");
    }
    const userId = ctx.from.id;
    const currentLevel = await getCurrentLevel(ctx.from);
    const streak = await getDailyStreak(userId);
    let totalQuizzes = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;
    let accuracy = 0; // Default initial accuracy percentage is 0%
    try {
        const localStats = await getLocalQuizStats(userId);
        totalQuizzes = localStats.totalQuizzesCompleted;
        totalQuestions = localStats.totalQuestions;
        totalCorrect = localStats.totalCorrect;
        const user = await apiService.getUserByTelegramId(userId);
        if (user) {
            const apiQuizzes = user.totalQuizzesCompleted || 0;
            if (apiQuizzes > totalQuizzes) {
                totalQuizzes = apiQuizzes;
            }
            if (user.quizAttempts && Array.isArray(user.quizAttempts) && user.quizAttempts.length > 0) {
                const apiQuestions = user.quizAttempts.reduce((acc, q) => acc + (q.totalQuestions || 5), 0);
                const apiCorrect = user.quizAttempts.reduce((acc, q) => acc + (q.correctAnswers || 0), 0);
                if (apiQuestions > totalQuestions) {
                    totalQuestions = apiQuestions;
                    totalCorrect = apiCorrect;
                }
            }
        }
        if (totalQuestions > 0) {
            accuracy = Math.round((totalCorrect / totalQuestions) * 100);
        }
    }
    catch (e) { }
    const levelName = (currentLevel.level || 'Intermediate').toUpperCase();
    const progressCard = `📈 <b>YOUR LEARNING PROGRESS DASHBOARD</b> 📊\n\n` +
        `⭐ <b>Current Level:</b> ${levelName}\n` +
        `🔥 <b>Daily Streak:</b> ${streak} ${streak === 1 ? 'Day' : 'Days'} Active\n` +
        `📊 <b>Quiz Accuracy:</b> ${accuracy}% Overall\n` +
        `🧠 <b>Quizzes Completed:</b> ${totalQuizzes}\n\n` +
        `⚙️ <i>Want to change your English difficulty level? Select below:</i>`;
    const normLevel = (currentLevel.level || 'intermediate').toLowerCase();
    // Build the inline keyboard with active level indicator
    const keyboard = new InlineKeyboard()
        .text(normLevel === 'beginner' ? "✅ Beginner" : "🟢 Beginner", "beginner")
        .text(normLevel === 'intermediate' ? "✅ Intermediate" : "🟡 Intermediate", "intermediate")
        .row()
        .text(normLevel === 'advanced' ? "✅ Advanced" : "🔴 Advanced", "advanced")
        .row()
        .text("🔥 Daily Challenge", "daily_challenge")
        .text("🧠 Practice Quiz", "quiz");
    await ctx.reply(progressCard, { parse_mode: "HTML", reply_markup: keyboard });
};
