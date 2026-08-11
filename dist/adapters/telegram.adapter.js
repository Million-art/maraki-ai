import dotenv from 'dotenv';
import { Bot } from 'grammy';
import { startCommand } from '../commands/start.command.js';
import { grammarCommand } from '../commands/grammar.command.js';
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
import { challengeCommand } from '../commands/challenge.command.js';
import { updateUserLevel } from '../services/user.service.js';
import { setSession, getSession } from '../utils/redis.js';
import { redis } from '../utils/redis.js';
import { notifyAdminOnError, ADMIN_TELEGRAM_ID } from '../utils/admin-notify.util.js';
import { setNotifyPreference } from '../utils/daily-notify.util.js';
dotenv.config();
const bot_token = process.env.TOKEN || process.env.TKN || process.env.BOT_TOKEN;
if (!bot_token) {
    throw new Error('TOKEN is not defined in .env (Set TOKEN, TKN, or BOT_TOKEN)');
}
export const bot = new Bot(bot_token);
// Global per-user deduplication lock map for single-instance
const userActionLocks = new Set();
// Global middleware for continuous typing indicator & duplicate request suppression
bot.use(async (ctx, next) => {
    if (!ctx.from) {
        return next();
    }
    // Answer callback queries immediately to prevent Telegram from auto-retrying unacknowledged requests
    if (ctx.callbackQuery) {
        try {
            await ctx.answerCallbackQuery();
        }
        catch (e) { }
    }
    const userId = ctx.from.id;
    const actionName = ctx.callbackQuery?.data
        ? ctx.callbackQuery.data
        : (ctx.message?.text && ctx.message.text.startsWith('/'))
            ? ctx.message.text.split(' ')[0]
            : null;
    const updateKey = actionName ? `action_${userId}_${actionName}` : null;
    // 1. Atomic Redis Distributed Lock (15s cooldown prevents duplicate execution & retries)
    if (actionName) {
        try {
            if (redis.isOpen) {
                const redisLockKey = `lock:user_action:${userId}:${actionName}`;
                const acquired = await redis.set(redisLockKey, 'locked', { NX: true, EX: 15 });
                if (!acquired) {
                    return; // Suppress duplicate execution from concurrent processes or retries
                }
            }
        }
        catch (e) { }
    }
    // 2. In-Memory Fallback Lock
    if (updateKey && userActionLocks.has(updateKey)) {
        if (ctx.callbackQuery) {
            try {
                await ctx.answerCallbackQuery();
            }
            catch (e) { }
        }
        return;
    }
    if (updateKey) {
        userActionLocks.add(updateKey);
    }
    if (ctx.chat?.id) {
        const chatId = ctx.chat.id;
        try {
            await ctx.api.sendChatAction(chatId, 'typing');
        }
        catch (e) { }
        const interval = setInterval(async () => {
            try {
                await ctx.api.sendChatAction(chatId, 'typing');
            }
            catch (e) { }
        }, 4000);
        try {
            await next();
        }
        finally {
            clearInterval(interval);
            if (updateKey) {
                userActionLocks.delete(updateKey);
            }
        }
    }
    else {
        try {
            await next();
        }
        finally {
            if (updateKey) {
                userActionLocks.delete(updateKey);
            }
        }
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
bot.command('challenge', challengeCommand);
bot.command('daily_challenge', challengeCommand);
bot.command('pay', handlePaymentCommand);
bot.command('subscribe', handlePaymentCommand);
bot.command('admin_status', adminStatusCommand);
// Stop daily challenge notifications
bot.command('stop_daily', async (ctx) => {
    if (!ctx.from)
        return;
    await setNotifyPreference(ctx.from.id, 'no');
    await ctx.reply(`🔕 <b>Daily challenge notifications stopped.</b>\n\nYou can always re-enable them by clicking <b>🔥 Daily Challenge</b> and opting in again.`, { parse_mode: 'HTML' });
});
// Catch all text messages
bot.on('message:text', async (ctx) => {
    if (!ctx.from)
        return;
    const text = ctx.message.text;
    // Auto-detect bank receipt links or tokens (e.g. mbreciept.cbe.com.et, receipts.dashenbanksc.com, or receipt.dashensuperapp.com)
    if (text.includes('mbreciept.cbe.com.et') ||
        text.includes('receipt.dashensuperapp.com') ||
        text.includes('dashenbanksc.com') ||
        text.includes('dashensuperapp.com') ||
        text.toLowerCase().includes('dashen') ||
        (text.startsWith('v2-') && text.length > 8)) {
        await handleReceiptVerification(ctx, text);
        return;
    }
    const session = await getSession(ctx.from.id);
    // Handle session modes
    if (session?.mode === 'awaiting_receipt') {
        await setSession(ctx.from.id, { ...session, mode: undefined });
        await handleReceiptVerification(ctx, text);
        return;
    }
    else if (session?.mode === 'lesson') {
        const { handleLessonResponse } = await import('../commands/lesson.comand.js');
        await handleLessonResponse(ctx);
    }
    else if (session?.mode === 'lesson_followup') {
        const { handleLessonFollowup } = await import('../commands/lesson.comand.js');
        await handleLessonFollowup(ctx);
    }
    else if (session?.mode === 'chat_conversation') {
        await handleChatConversation(ctx);
    }
    else if (session?.mode === 'translation') {
        await handleTranslation(ctx);
    }
    else {
        if (text?.startsWith('/')) {
            await ctx.reply(`❓ Unknown command: "${text}"\n\n` +
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
                `Or paste your CBE/Dashen receipt link here to activate Maraki VIP! 🚀`);
        }
        else {
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
    try {
        await ctx.answerCallbackQuery();
    }
    catch (e) { }
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
            const formattedLevel = newLevel.toUpperCase();
            await ctx.reply(`🎯 <b>English Level Updated!</b>\n\n` +
                `Your level is now set to <b>${formattedLevel}</b>. All future AI quizzes, lessons, and daily challenges will adapt to your new difficulty! 🚀`, { parse_mode: 'HTML' });
            // Re-render level progress dashboard to visually reflect the change
            await levelCommand(ctx);
        }
        catch (error) {
            await ctx.reply('❌ Failed to update level. Please try again.');
        }
    }
    else {
        switch (data) {
            case 'subscribe':
            case 'pay':
                await handlePaymentCommand(ctx);
                break;
            case 'pay_monthly':
            case 'pay_quarterly':
            case 'pay_yearly':
                const { handlePaymentSelection } = await import('../commands/payment.command.js');
                await handlePaymentSelection(ctx, data);
                break;
            case 'submit_receipt_prompt':
                await setSession(ctx.from.id, { mode: 'awaiting_receipt', timestamp: Date.now(), userId: ctx.from.id });
                await ctx.reply(`🧾 *Submit Your Payment Receipt*\n\n` +
                    `Please paste your **CBE or Dashen receipt link** (or transaction reference number) directly in this chat below:\n\n` +
                    `*Supported Link Examples:*\n` +
                    `• \`https://receipts.dashenbanksc.com/receipt/XXXXX\`\n` +
                    `• \`https://mbreciept.cbe.com.et/v2-XXXXXX\`\n` +
                    `• Transaction Reference: \`XXXXX\`\n\n` +
                    `⚡ Our automated system will verify your receipt with the bank network instantly!`, { parse_mode: 'Markdown' });
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
            case 'lesson_followup_ask': {
                const existingSession = await getSession(ctx.from.id) || {};
                await setSession(ctx.from.id, { ...existingSession, mode: 'lesson_followup', timestamp: Date.now(), userId: ctx.from.id });
                await ctx.reply('❓ *Ask a Question about this Lesson*\n\nPlease type your question below and I will explain it for you! 😊', { parse_mode: 'Markdown' });
                break;
            }
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
            case 'level':
                await levelCommand(ctx);
                break;
            case 'referral':
            case 'referral_link':
                await referralCommand(ctx);
                break;
            case 'daily_challenge':
            case 'challenge':
                await challengeCommand(ctx);
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
                if (data.startsWith('challenge_ans_')) {
                    const isCorrect = data.startsWith('challenge_ans_correct_');
                    await ctx.reply(isCorrect ? "✅ Correct! Great job! 🎉" : "❌ Incorrect! Keep trying!");
                    return;
                }
                if (data === 'daily_notify_yes') {
                    await setNotifyPreference(ctx.from.id, 'yes');
                    await ctx.reply(`✅ <b>You're all set!</b> Your Daily Challenge will be delivered every morning.\n\nTo stop anytime, use /stop_daily.`, { parse_mode: 'HTML' });
                    return;
                }
                if (data === 'daily_notify_no') {
                    await setNotifyPreference(ctx.from.id, 'no');
                    await ctx.reply(`No problem! You can always come back and tap <b>🔥 Daily Challenge</b> anytime. 😊`, { parse_mode: 'HTML' });
                    return;
                }
                return ctx.answerCallbackQuery('❓ Unknown action.');
        }
        await ctx.answerCallbackQuery();
    }
});
export { notifyAdminOnError, ADMIN_TELEGRAM_ID };
// Global error handler for all bot operations
bot.catch(async (err) => {
    console.error(`Error while handling update ${err.ctx.update?.update_id}:`, err.error);
    await notifyAdminOnError(err.ctx, err.error, `Global Handler (Update ${err.ctx.update?.update_id})`);
});
