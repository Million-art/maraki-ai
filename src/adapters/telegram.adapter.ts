import dotenv from 'dotenv';
import { Bot } from 'grammy';
import { startCommand } from '../commands/start.command.js';
import { grammarCommand, handleGrammarCorrection } from '../commands/grammar.command.js';
import { lessonCommand } from '../commands/lesson.comand.js';
import { chatMode, handleChatConversation, startChatConversation } from '../commands/chat.command.js';
import { speechCommand } from '../commands/speach.command.js';
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

const bot_token = process.env.TOKEN;
if (!bot_token) {
  throw new Error('TOKEN is not defined in .env');
}
export const bot = new Bot(bot_token);

// Middleware for typing indicator
bot.use(async (ctx, next) => {
  if (ctx.chat?.id) {
    await ctx.api.sendChatAction(ctx.chat.id, 'typing');
  }
  return next();
});

// COMMANDS
bot.command('start', startCommand);
bot.command('grammar', grammarCommand);
bot.command('lesson', lessonCommand);
bot.command('level', levelCommand);
bot.command('referral_link', referralCommand);
bot.command('speech_conversation', speechCommand);
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
        await setSession(ctx.from.id, { mode: 'lesson', timestamp: Date.now(), userId: ctx.from.id });
        await lessonCommand(ctx);
        break;
      case 'chat_conversation':
        await setSession(ctx.from.id, { mode: data, timestamp: Date.now(), userId: ctx.from.id });
        await startChatConversation(ctx);
        break;
      case 'translation':
        await setSession(ctx.from.id, { mode: data, timestamp: Date.now(), userId: ctx.from.id });
        await startTranslation(ctx);
        break;
      case 'speech_conversation':
        await ctx.answerCallbackQuery('🗣️ Speech conversation feature is coming soon!');
        break;
      case 'quiz':
        await setSession(ctx.from.id, { mode: 'quiz', timestamp: Date.now(), userId: ctx.from.id });
        await quizCommand(ctx);
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
