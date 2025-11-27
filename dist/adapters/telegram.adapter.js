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
import { updateUserLevel } from '../services/user.service.js';
// Level enum moved to backend API
import { setSession, getSession } from '../utils/redis.js';
dotenv.config();
const bot_token = process.env.TOKEN;
if (!bot_token) {
    throw new Error('TOKEN is not defined in .env');
}
export const bot = new Bot(bot_token);
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
bot.command('translation', translationCommand);
bot.command('help', helpCommand);
bot.command('usage', usageCommand);
bot.command('quiz', quizCommand);
// Hidden admin command - not listed in help
bot.command('admin_status', adminStatusCommand);
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
    else if (session?.mode === 'lesson_followup') {
        // Handle lesson follow-up questions
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
        // Global text handler for unknown commands or regular text
        if (text?.startsWith('/')) {
            // Handle unknown commands
            await ctx.reply(`❓ Unknown command: "${text}"\n\n` +
                `Here are the available commands:\n` +
                `/start - Main Menu\n` +
                `/grammar - 🧹Correct your sentence\n` +
                `/lesson - ✨Learn English\n` +
                `/quiz - 🧠Take a quiz\n` +
                `/chat_conversation - ⚡Practice chat conversation\n` +
                `/translation - 🌐Amharic to English translation\n` +
                `/referral_link - 🔗 Get your referral link\n` +
                `/level - 📊 Check your level\n` +
                `/speech_conversation - 🗣️ Practice speech conversation (Coming Soon!)\n` +
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
        let newLevel = 'beginner'; // default
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
        }
        catch (error) {
            await ctx.answerCallbackQuery("❌ Failed to update level.");
        }
    }
    else {
        // Handle other commands
        switch (data) {
            case 'grammar':
                console.log('Handling grammar callback');
                await setSession(ctx.from.id, { menu: data, timestamp: Date.now(), userId: ctx.from.id });
                await grammarCommand(ctx);
                break;
            case 'lesson':
                console.log('Handling lesson callback');
                await setSession(ctx.from.id, { mode: 'lesson', timestamp: Date.now(), userId: ctx.from.id });
                await lessonCommand(ctx);
                break;
            // case 'lesson_full_app':
            //   console.log('Handling full lesson mini app callback');
            //   await ctx.reply("📚 You can access the full lesson mini app here: [Mini App Link](https://mini-app-seven-gray.vercel.app/)", { parse_mode: 'Markdown' });
            //   break;
            case 'chat_conversation':
                console.log('Handling chat_conversation callback');
                await setSession(ctx.from.id, { mode: data, timestamp: Date.now(), userId: ctx.from.id });
                await startChatConversation(ctx);
                break;
            case 'translation':
                console.log('Handling translation callback');
                await setSession(ctx.from.id, { mode: data, timestamp: Date.now(), userId: ctx.from.id });
                await startTranslation(ctx);
                break;
            case 'speech_conversation':
                console.log('Handling speech_conversation callback');
                await ctx.answerCallbackQuery("🗣️ Speech conversation feature is coming soon! Stay tuned for pronunciation practice.");
                break;
            case 'lesson_back_to_parts':
                console.log('Handling back to lesson parts callback');
                await setSession(ctx.from.id, { mode: 'lesson', timestamp: Date.now(), userId: ctx.from.id });
                await lessonCommand(ctx);
                break;
            case 'lesson_followup_ask':
                console.log('Handling lesson follow-up ask callback');
                await setSession(ctx.from.id, { mode: 'lesson_followup', timestamp: Date.now(), userId: ctx.from.id });
                await ctx.reply("❓ Ask me any question about the lesson above! I'll help clarify anything you're confused about.");
                break;
            case 'quiz':
                console.log('Handling quiz callback');
                await setSession(ctx.from.id, { mode: 'quiz', timestamp: Date.now(), userId: ctx.from.id });
                await quizCommand(ctx);
                break;
            case 'close':
                console.log('Handling close callback');
                return ctx.deleteMessage();
            default:
                // Handle quiz answer callbacks
                if (data.startsWith('quiz_answer_')) {
                    const answerIndex = parseInt(data.replace('quiz_answer_', ''));
                    if (!isNaN(answerIndex)) {
                        console.log('Handling quiz answer callback:', answerIndex);
                        await handleQuizAnswer(ctx, answerIndex);
                        return; // Don't call answerCallbackQuery here as it's handled in handleQuizAnswer
                    }
                }
                console.log('Unknown callback data:', data);
                return ctx.answerCallbackQuery("❓ Unknown action.");
        }
        await ctx.answerCallbackQuery();
    }
});
