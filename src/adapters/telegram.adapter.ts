import dotenv from 'dotenv';
import { Bot } from 'grammy';
import { startCommand } from '../commands/start.command.js';
import { grammarCommand, handleGrammarCorrection } from '../commands/grammar.command.js';
import { lessonCommand } from '../commands/lesson.comand.js';
import { chatMode, handleChatConversation, startChatConversation } from '../commands/chat.command.js';
import { levelCommand } from '../commands/level.command.js';
import { referralCommand } from '../commands/referral.command.js';
import { helpCommand } from '../commands/help.command.js';
import { translationCommand, handleTranslation, startTranslation } from '../commands/translation.command.js';
import { usageCommand } from '../commands/usage.command.js';
import { quizCommand, handleQuizAnswer } from '../commands/quiz.command.js';
import { adminStatusCommand } from '../commands/admin.command.js';
import { handlePaymentCommand, handleReceiptVerification } from '../commands/payment.command.js';
import { updateUserLevel } from '../services/user.service.js';
import { setSession, getSession } from '../utils/redis.js';

dotenv.config();

const bot_token = process.env.TKN;
if (!bot_token) {
  throw new Error('TKN is not defined in .env');
}
export const bot = new Bot(bot_token);

// Global middleware for continuous typing indicator
bot.use(async (ctx, next) => {
  if (ctx.chat?.id) {
    const chatId = ctx.chat.id;
    // Send typing action immediately
    try {
      await ctx.api.sendChatAction(chatId, 'typing');
    } catch (e) {}

    // Continuously refresh typing status every 4 seconds while handler is running
    const interval = setInterval(async () => {
      try {
        await ctx.api.sendChatAction(chatId, 'typing');
      } catch (e) {}
    }, 4000);

    try {
      await next();
    } finally {
      clearInterval(interval);
    }
  } else {
    await next();
  }
});

// COMMANDS
bot.command('start', startCommand);
bot.command('grammar', grammarCommand);
bot.command('lesson', lessonCommand);
bot.command('level', levelCommand);
bot.command('referral_link', referralCommand);
bot.command('referral', referralCommand);
bot.command('hack', referralCommand);
bot.command('hack_bot', referralCommand);
bot.command('translation', translationCommand);
bot.command('help', helpCommand);
bot.command('usage', usageCommand);
bot.command('quiz', quizCommand);
bot.command('pay', handlePaymentCommand);
bot.command('subscribe', handlePaymentCommand);

// Hidden admin command
bot.command('admin_status', adminStatusCommand);

// Catch all text messages
bot.on('message:text', async (ctx) => {
  if (!ctx.from) return;

  const text = ctx.message.text;

  // Auto-detect bank receipt links or tokens (e.g. mbreciept.cbe.com.et/v2-XXXXXX or dashensuperapp.com)
  if (
    text.includes('mbreciept.cbe.com.et') ||
    text.includes('receipt.dashensuperapp.com') ||
    (text.startsWith('v2-') && text.length > 8)
  ) {
    await handleReceiptVerification(ctx, text);
    return;
  }

  const session = await getSession(ctx.from.id);

  // Handle session modes
  if (session?.mode === 'grammar') {
    await handleGrammarCorrection(ctx);
  } else if (session?.mode === 'lesson') {
    const { handleLessonResponse } = await import('../commands/lesson.comand.js');
    await handleLessonResponse(ctx);
  } else if (session?.mode === 'lesson_followup') {
    const { handleLessonFollowup } = await import('../commands/lesson.comand.js');
    await handleLessonFollowup(ctx);
  } else if (session?.mode === 'chat_conversation') {
    await handleChatConversation(ctx);
  } else if (session?.mode === 'translation') {
    await handleTranslation(ctx);
  } else {
    if (text?.startsWith('/')) {
      await ctx.reply(
        `❓ Unknown command: "${text}"\n\n` +
        `Here are the available commands:\n` +
        `/start - Main Menu\n` +
        `/pay - 💳 Subscription & Bank Transfer\n` +
        `/grammar - 🧹 Correct your sentence\n` +
        `/lesson - ✨ Learn English\n` +
        `/quiz - 🧠 Take a quiz\n` +
        `/chat_conversation - ⚡ Practice chat conversation\n` +
        `/translation - 🌐 Amharic to English translation\n` +
        `/referral_link - 🔗 Get your referral link\n` +
        `/level - 📊 Check your level\n` +
        `/usage - 📊 Check usage limits\n` +
        `/help - ❓ Get help\n\n` +
        `Or paste your CBE/Dashen receipt link here to activate Maraki VIP! 🚀`
      );
    } else {
      await chatMode(ctx);
    }
  }
});

// Callback query handler for buttons
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (!ctx.from) {
    return ctx.answerCallbackQuery('⚠️ Could not get your Telegram ID.');
  }

  if (['beginner', 'intermediate', 'advanced'].includes(data)) {
    let newLevel = 'beginner';
    switch (data) {
      case 'beginner':
        newLevel = 'beginner';
        break;
      case 'intermediate':
        newLevel = 'intermediate';
        break;
      case 'advanced':
        newLevel = 'advanced';
        break;
    }
    try {
      await updateUserLevel(ctx.from.id, newLevel);
      await ctx.answerCallbackQuery(`✅ Level updated to ${newLevel}`);
    } catch (error) {
      await ctx.answerCallbackQuery('❌ Failed to update level.');
    }
  } else {
    switch (data) {
      case 'pay':
      case 'subscribe':
        await handlePaymentCommand(ctx);
        break;
      case 'grammar':
        await setSession(ctx.from.id, { menu: data, timestamp: Date.now(), userId: ctx.from.id });
        await grammarCommand(ctx);
        break;
      case 'lesson':
      case 'lesson_back_to_parts':
        await setSession(ctx.from.id, { mode: 'lesson', timestamp: Date.now(), userId: ctx.from.id });
        await lessonCommand(ctx);
        break;
      case 'lesson_followup_ask':
        await setSession(ctx.from.id, { mode: 'lesson_followup', timestamp: Date.now(), userId: ctx.from.id });
        await ctx.reply('❓ *Ask a Question about this Lesson*\n\nPlease type your question below and I will explain it for you! 😊', { parse_mode: 'Markdown' });
        break;
      case 'chat_conversation':
        await setSession(ctx.from.id, { mode: data, timestamp: Date.now(), userId: ctx.from.id });
        await startChatConversation(ctx);
        break;
      case 'translation':
        await setSession(ctx.from.id, { mode: data, timestamp: Date.now(), userId: ctx.from.id });
        await startTranslation(ctx);
        break;
      case 'quiz':
        await setSession(ctx.from.id, { mode: 'quiz', timestamp: Date.now(), userId: ctx.from.id });
        await quizCommand(ctx);
        break;
      case 'referral':
      case 'referral_link':
      case 'hack':
      case 'hack_bot':
        await referralCommand(ctx);
        break;
      case 'close':
        return ctx.deleteMessage();
      default:
        if (data.startsWith('quiz_answer_')) {
          const answerIndex = parseInt(data.replace('quiz_answer_', ''), 10);
          if (!isNaN(answerIndex)) {
            await handleQuizAnswer(ctx, answerIndex);
            return;
          }
        }
        return ctx.answerCallbackQuery('❓ Unknown action.');
    }
    await ctx.answerCallbackQuery();
  }
});

// Admin Notification for User Errors
export const ADMIN_TELEGRAM_ID = 386095768;

export const notifyAdminOnError = async (ctx: any, error: any) => {
  try {
    const user = ctx?.from;
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Unknown User';
    const username = user?.username ? `@${user.username}` : 'No username';
    const userId = user?.id || 'N/A';
    const errorMessage = error?.message || String(error);

    const alertMessage =
      `⚠️ <b>Bot User Error Alert!</b>\n\n` +
      `👤 <b>User:</b> ${name} (${username})\n` +
      `🆔 <b>User ID:</b> <code>${userId}</code>\n` +
      `❌ <b>Error:</b> <code>${errorMessage.slice(0, 500)}</code>`;

    if (ctx?.api) {
      await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, alertMessage, { parse_mode: 'HTML' });
    }
  } catch (notifyErr) {
    console.error('Failed to send error notification to admin:', notifyErr);
  }
};

// Global error handler for all bot operations
bot.catch(async (err) => {
  console.error(`Error while handling update ${err.ctx.update?.update_id}:`, err.error);
  await notifyAdminOnError(err.ctx, err.error);
});
