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
import { adminCommand, handleAdminCallback, handleBroadcastMessage } from '../commands/admin.command.js';
import { updateUserLevel } from '../services/user.service.js';
import { Level } from '../types/User.js';
import { setSession, getSession } from '../utils/redis.js';
const bot_token = process.env.TOKEN;
if (!bot_token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env');
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
bot.command('admin', adminCommand);
// Catch all other messages
bot.on('message:text', async (ctx) => {
    if (!ctx.from)
        return;
    const text = ctx.message.text;
    const session = await getSession(ctx.from.id);
    // Check if admin is sending broadcast message
    const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => Number(id)) : [];
    if (ADMIN_IDS.includes(ctx.from.id) && session?.mode === 'broadcast') {
        await handleBroadcastMessage(ctx);
        return;
    }
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
    // Handle admin callbacks
    const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => Number(id)) : [];
    if (ADMIN_IDS.includes(ctx.from.id) && ['broadcast', 'stats', 'dashboard'].includes(data)) {
        await handleAdminCallback(ctx);
        return;
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
                console.log('Handling grammar callback');
                await setSession(ctx.from.id, { menu: data, timestamp: Date.now(), userId: ctx.from.id });
                await grammarCommand(ctx);
                break;
            case 'lesson':
                console.log('Handling lesson callback');
                await setSession(ctx.from.id, { mode: 'lesson_menu', timestamp: Date.now(), userId: ctx.from.id });
                await lessonCommand(ctx);
                break;
            case 'lesson_part_0':
                console.log('Handling lesson part 0 callback');
                await setSession(ctx.from.id, { mode: 'lesson', timestamp: Date.now(), userId: ctx.from.id });
                {
                    const { startLessonRecommendation } = await import('../commands/lesson.comand.js');
                    await startLessonRecommendation(ctx);
                }
                break;
            case 'lesson_part_1':
                console.log('Handling lesson part 1 callback');
                await setSession(ctx.from.id, { mode: 'lesson_part_1', timestamp: Date.now(), userId: ctx.from.id });
                {
                    const { startLessonPart } = await import('../commands/lesson.comand.js');
                    await startLessonPart(ctx, 'foundations');
                }
                break;
            case 'lesson_part_2':
                console.log('Handling lesson part 2 callback');
                await setSession(ctx.from.id, { mode: 'lesson_part_2', timestamp: Date.now(), userId: ctx.from.id });
                {
                    const { startLessonPart } = await import('../commands/lesson.comand.js');
                    await startLessonPart(ctx, 'verbs_tenses');
                }
                break;
            case 'lesson_part_3':
                console.log('Handling lesson part 3 callback');
                await setSession(ctx.from.id, { mode: 'lesson_part_3', timestamp: Date.now(), userId: ctx.from.id });
                {
                    const { startLessonPart } = await import('../commands/lesson.comand.js');
                    await startLessonPart(ctx, 'building_sentences');
                }
                break;
            case 'lesson_part_4':
                console.log('Handling lesson part 4 callback');
                await setSession(ctx.from.id, { mode: 'lesson_part_4', timestamp: Date.now(), userId: ctx.from.id });
                {
                    const { startLessonPart } = await import('../commands/lesson.comand.js');
                    await startLessonPart(ctx, 'phrases_usage');
                }
                break;
            case 'lesson_part_5':
                console.log('Handling lesson part 5 callback');
                await setSession(ctx.from.id, { mode: 'lesson_part_5', timestamp: Date.now(), userId: ctx.from.id });
                {
                    const { startLessonPart } = await import('../commands/lesson.comand.js');
                    await startLessonPart(ctx, 'writing_speaking');
                }
                break;
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
                await setSession(ctx.from.id, { mode: 'lesson_menu', timestamp: Date.now(), userId: ctx.from.id });
                await lessonCommand(ctx);
                break;
            case 'lesson_followup_ask':
                console.log('Handling lesson follow-up ask callback');
                await setSession(ctx.from.id, { mode: 'lesson_followup', timestamp: Date.now(), userId: ctx.from.id });
                await ctx.reply("❓ Ask me any question about the lesson above! I'll help clarify anything you're confused about.");
                break;
            case 'close':
                console.log('Handling close callback');
                return ctx.deleteMessage();
            default:
                // Handle lesson topic selections
                if (data.startsWith('lesson_topic_')) {
                    console.log('Handling lesson topic callback:', data);
                    const parts = data.split('_');
                    if (parts.length >= 4) {
                        const partName = parts[2]; // foundations, verbs_tenses, etc.
                        const topicIndex = parseInt(parts[3]);
                        // Get topics for this part
                        let topics = [];
                        switch (partName) {
                            case 'foundations':
                                topics = [
                                    'The Alphabet & Pronunciation',
                                    'Parts of Speech Overview',
                                    'Nouns',
                                    'Pronouns',
                                    'Verbs',
                                    'Adjectives',
                                    'Adverbs',
                                    'Prepositions',
                                    'Conjunctions',
                                    'Interjections',
                                    'Basic Sentence Structure (Subject + Verb + Object)'
                                ];
                                break;
                            case 'verbs_tenses':
                                topics = [
                                    'Present Simple',
                                    'Present Continuous',
                                    'Past Simple',
                                    'Past Continuous',
                                    'Future Simple ("will")',
                                    'Future "going to"',
                                    'Present Perfect',
                                    'Present Perfect Continuous',
                                    'Past Perfect',
                                    'Past Perfect Continuous',
                                    'Future Perfect & Continuous',
                                    'Passive Voice (all main tenses)'
                                ];
                                break;
                            case 'building_sentences':
                                topics = [
                                    'Questions & Question Words (who, what, where, when, why, how)',
                                    'Negatives (not, never, nothing)',
                                    'Modal Verbs (can, could, should, must, may, might, will, would)',
                                    'Conditionals (Zero, First, Second, Third, Mixed)',
                                    'Reported Speech (statements, questions, commands)'
                                ];
                                break;
                            case 'phrases_usage':
                                topics = [
                                    'Common Phrases for Daily Life (greetings, asking for help, shopping, travel)',
                                    'Collocations (make/do, take/have, etc.)',
                                    'Idioms & Expressions (simple first, then advanced)',
                                    'Phrasal Verbs (get up, take off, put on, look after, etc.)'
                                ];
                                break;
                            case 'writing_speaking':
                                topics = [
                                    'Articles (a, an, the)',
                                    'Countable & Uncountable Nouns',
                                    'Comparatives & Superlatives',
                                    'Linking Words (and, but, because, although, however)',
                                    'Paragraph Writing Basics (topic sentence, supporting details)',
                                    'Formal vs. Informal English (emails, conversations)'
                                ];
                                break;
                        }
                        if (topicIndex >= 0 && topicIndex < topics.length) {
                            const selectedTopic = topics[topicIndex];
                            await setSession(ctx.from.id, { mode: 'lesson_topic', timestamp: Date.now(), userId: ctx.from.id });
                            // Generate lesson for selected topic
                            try {
                                const { UserRepository } = await import('../repository/user.repository.js');
                                const { Conversation } = await import('../database/models/conversation.js');
                                const { callGeminiGenerateContent } = await import('../api/gemini/callGeminiGenerateContents.js');
                                const lessonPrompt = (await import('../prompt/lesson.prompt.js')).default;
                                // Get user level
                                let userLevel;
                                try {
                                    const user = await UserRepository.findByTelegramId(ctx.from.id);
                                    userLevel = user?.level;
                                }
                                catch (dbError) {
                                    console.warn('Database not available, user level not assigned:', dbError.message);
                                }
                                const lessonRequest = `${lessonPrompt}

User Level: ${userLevel}
Selected Topic: ${selectedTopic}
User's Previous Focus Areas: Based on conversation history, focus on areas where the user has shown interest or made mistakes.`;
                                const lessonContent = await callGeminiGenerateContent(lessonRequest);
                                // Parse and format the lesson response
                                let formattedLesson = lessonContent;
                                if (lessonContent.includes('```')) {
                                    formattedLesson = lessonContent.replace(/```/g, '').trim();
                                }
                                formattedLesson = formattedLesson.replace(/\*/g, '');
                                await ctx.reply(`📖 Lesson: ${selectedTopic.toUpperCase()}\n\n${formattedLesson}`, { parse_mode: 'HTML' });
                                // Update conversation context
                                try {
                                    const user = await UserRepository.findByTelegramId(ctx.from.id);
                                    if (user) {
                                        await Conversation.findOneAndUpdate({ user: user._id }, {
                                            $push: {
                                                lessons: {
                                                    topic: selectedTopic,
                                                    details: `Lesson generated for topic: ${selectedTopic}`,
                                                    createdAt: new Date(),
                                                },
                                            },
                                        }, { upsert: true, new: true });
                                    }
                                }
                                catch (dbError) {
                                    console.warn('Database not available, skipping context update:', dbError.message);
                                }
                            }
                            catch (error) {
                                console.error('Lesson generation error:', error);
                                await ctx.reply("❌ An error occurred while generating your lesson. Please try again later.");
                            }
                        }
                        else {
                            await ctx.answerCallbackQuery("❌ Invalid topic selection.");
                        }
                    }
                    else {
                        await ctx.answerCallbackQuery("❌ Invalid topic callback format.");
                    }
                }
                else {
                    console.log('Unknown callback data:', data);
                    return ctx.answerCallbackQuery("❓ Unknown action.");
                }
        }
        await ctx.answerCallbackQuery();
    }
});
