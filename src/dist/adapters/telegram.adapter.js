import { Bot } from 'grammy';
import { startCommand } from '../commands/start.command.js';
import { grammarCommand, handleGrammarCorrection } from '../commands/grammar.command.js';
import { lessonCommand } from '../commands/lesson.comand.js';
import { chatMode } from '../commands/chat.command.js';
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
bot.command('help', helpCommand);
// Catch all other messages
bot.on('message:text', async (ctx) => {
    if (!ctx.from)
        return;
    const session = await getSession(ctx.from.id);
    if (session?.mode === 'grammar') {
        await handleGrammarCorrection(ctx);
    }
    else {
        await chatMode(ctx);
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
                await setSession(ctx.from.id, { menu: data, timestamp: Date.now(), userId: ctx.from.id });
                break;
            case 'speech_conversation':
                await setSession(ctx.from.id, { menu: data, timestamp: Date.now(), userId: ctx.from.id });
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
