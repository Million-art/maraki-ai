import { Bot } from 'grammy';
import { startCommand } from '../commands/start.command.js';
import { grammarCommand, handleGrammarCorrection } from '../commands/grammar.command.js';
import { lessonCommand } from '../commands/lesson.comand.js';
import { chatMode, handleChatConversation, startChatConversation } from '../commands/chat.command.js';
import { speechCommand } from '../commands/speach.command.js';
import { levelCommand } from '../commands/level.command.js';
import { referralCommand } from '../commands/referral.command.js';
import { helpCommand } from '../commands/help.command.js';
import { updateUserLevel } from '../services/userService.js';
import { Level } from '../types/User.js';
import { setSession, getSession } from '../utils/redis.js';
const bot_token = process.env.TOKEN;
if (!bot_token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env');
}
const bot = new Bot(bot_token);
////////     MIDDLEWARE for typing... /////////
// Removed for faster response
bot.use(async (ctx, next) => {
    if (ctx.chat?.id) {
        await ctx.api.sendChatAction(ctx.chat.id, "typing");
    }
    return next();
});
////////     COMMANDS /////////////
////////     COMMANDS /////////////
bot.command('start', startCommand);
bot.command('grammar', grammarCommand);
bot.command('lesson', lessonCommand);
bot.command('level', levelCommand);
bot.command('referral_link', referralCommand);
bot.command('speech_conversation', speechCommand);
bot.command('help', helpCommand);
// Catch all other messages
bot.on('message:text', async (ctx) => {
    if (!ctx.from)
        return;
    const text = ctx.message.text;
    const session = await getSession(ctx.from.id);
    // Handle different session modes
    if (session?.mode === 'grammar') {
        await handleGrammarCorrection(ctx);
    }
    else if (session?.mode === 'lesson') {
        // Handle lesson mode responses
        const { handleLessonResponse } = await import('../commands/lesson.comand.js');
        await handleLessonResponse(ctx);
    }
    else if (session?.mode === 'chat_conversation') {
        await handleChatConversation(ctx);
    }
    else {
        // Global text handler for unknown commands or regular text
        if (text?.startsWith('/')) {
            // Handle unknown commands
            await ctx.reply(`❓ Unknown command: "${text}"\n\n` +
                `Here are the available commands:\n` +
                `/start - Main Menu\n` +
                `/grammar - 🧹Correct your sentence\n` +
                `/lesson - ✨Learn from your previous mistakes\n` +
                `/chat_conversation - ⚡Practice chat conversation\n` +
                `/referral_link - 🔗 Get your referral link\n` +
                `/level - 📊 Check your level\n` +
                `/help - ❓ Get help\n\n` +
                `Or just send me any message and I'll help you practice English! 💬`);
        }
        else {
            // Handle regular text messages
            await chatMode(ctx);
        }
    }
});
// Callback query handler for buttons
bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    console.log('Callback data:', data);
    if (!ctx.from) {
        return ctx.answerCallbackQuery("⚠️ Could not get your Telegram ID.");
    }
    // Handle level selection
    if (['beginner', 'intermediate', 'advanced'].includes(data)) {
        let newLevel = Level.Beginner; // default
        switch (data) {
            case 'beginner':
                newLevel = Level.Beginner;
                break;
            case 'intermediate':
                newLevel = Level.Intermediate;
                break;
            case 'advanced':
                newLevel = Level.Advanced;
                break;
        }
        try {
            await updateUserLevel(ctx.from.id, newLevel);
            await ctx.answerCallbackQuery(`✅ Level updated to ${newLevel}`);
        }
        catch (error) {
            await ctx.answerCallbackQuery("❌ Failed to update level.");
        }
    }
    else {
        // Handle other commands
        switch (data) {
            case 'grammar':
                await setSession(ctx.from.id, { menu: data, timestamp: Date.now(), userId: ctx.from.id });
                await grammarCommand(ctx);
                break;
            case 'lesson':
                await setSession(ctx.from.id, { menu: data, timestamp: Date.now(), userId: ctx.from.id });
                await lessonCommand(ctx);
                break;
            case 'level':
                await setSession(ctx.from.id, { menu: data, timestamp: Date.now(), userId: ctx.from.id });
                await levelCommand(ctx);
                break;
            case 'referral_link':
                await setSession(ctx.from.id, { menu: data, timestamp: Date.now(), userId: ctx.from.id });
                await referralCommand(ctx);
                break;
            case 'chat_conversation':
                await setSession(ctx.from.id, { mode: data, timestamp: Date.now(), userId: ctx.from.id });
                await startChatConversation(ctx);
                break;
            case 'speech_conversation':
                await ctx.answerCallbackQuery("🗣️ Speech conversation feature is coming soon! Stay tuned for pronunciation practice.");
                break;
            case 'close':
                return ctx.deleteMessage();
            default:
                return ctx.answerCallbackQuery("❓ Unknown action.");
        }
        await ctx.answerCallbackQuery();
    }
});
bot.start();
console.log('Telegram bot is running...');
