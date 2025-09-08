import { getSession, setSession } from "../utils/redis.js";
import lessonPrompt from "../prompt/lesson.prompt.js";
import { UserRepository } from "../repository/userRepository.js";
import { Conversation } from "../database/models/conversation.js";
import { callGeminiGenerateContent } from "../api/gemini/callGeminiGenerateContents.js";
export const lessonCommand = async (ctx) => {
    if (!ctx.from) {
        return ctx.reply("⚠️ Could not get your Telegram ID.");
    }
    const session = await getSession(ctx.from.id);
    await setSession(ctx.from.id, { mode: 'lesson', timestamp: Date.now() });
    // Analyze user conversation data to select focus topic
    try {
        let conversationContext = '';
        let suggestedTopic = 'general grammar';
        // Get user level from database, no default assignment
        let userLevel;
        try {
            const user = await UserRepository.findByTelegramId(ctx.from.id);
            userLevel = user?.level;
        }
        catch (dbError) {
            console.warn('Database not available, user level not assigned:', dbError.message);
        }
        // Get conversation context to analyze patterns with AI
        try {
            const user = await UserRepository.findByTelegramId(ctx.from.id);
            if (user) {
                const conversation = await Conversation.findOne({ user: user._id });
                // Build context from grammar mistakes and lessons
                let contextParts = [];
                if (conversation?.grammarMistakes && conversation.grammarMistakes.length > 0) {
                    const recentMistakes = conversation.grammarMistakes.slice(-5);
                    contextParts.push(...recentMistakes.map(m => `Grammar mistake: ${m.grammarType} - "${m.mistake}" → "${m.correction}"`));
                }
                if (conversation?.lessons && conversation.lessons.length > 0) {
                    const recentLessons = conversation.lessons.slice(-3);
                    contextParts.push(...recentLessons.map(l => `Lesson topic: ${l.topic}`));
                }
                conversationContext = contextParts.join(' | ');
                // Use AI to analyze conversation and suggest topic
                if (conversationContext.trim()) {
                    const analysisPrompt = `Analyze this user's learning history and suggest the most appropriate English grammar topic they should focus on for their next lesson. Consider their grammar mistakes, previous lesson topics, and areas they've been working on.

User's learning history:
${conversationContext}

Please suggest ONE specific grammar topic (e.g., "verb tenses", "prepositions", "sentence structure", "adjectives and adverbs", etc.) that would be most beneficial for them to learn next.

Respond with just the topic name, nothing else.`;
                    try {
                        const aiSuggestedTopic = await callGeminiGenerateContent(analysisPrompt);
                        suggestedTopic = aiSuggestedTopic.trim().toLowerCase();
                    }
                    catch (aiError) {
                        console.warn('AI topic suggestion failed, using default:', aiError.message);
                        suggestedTopic = 'general grammar';
                    }
                }
            }
        }
        catch (dbError) {
            console.warn('Database not available, using default topic:', dbError.message);
        }
        // Check if user has any learning history
        const hasHistory = conversationContext.trim().length > 0;
        if (hasHistory) {
            await ctx.reply(`Based on your recent history, I suggest we focus on: ${suggestedTopic}\n\n` +
                `Your current level: ${userLevel}\n\n` +
                `Reply with:\n` +
                `• "yes"  to start this lesson\n` +
                `• "no" or suggest another topic (e.g., "verbs", "grammar", "vocabulary")\n\n` +
                `What would you like to do?`);
        }
        else {
            await ctx.reply(`Welcome to your first lesson! 🎉\n\n` +
                `I suggest we begin with: **${suggestedTopic}**\n\n` +
                `Reply with:\n` +
                `• "yes"  to start this lesson\n` +
                `• "no" or suggest another topic (e.g., "verbs", "grammar", "vocabulary")\n\n` +
                `What would you like to learn about?`);
        }
    }
    catch (error) {
        console.error('Lesson command error:', error);
        await ctx.reply("❌ An error occurred while starting the lesson. Please try again later.");
    }
};
export const handleLessonResponse = async (ctx) => {
    if (!ctx.from || !ctx.message?.text)
        return;
    const userId = ctx.from.id;
    const userResponse = ctx.message.text.toLowerCase();
    try {
        // Get user level from database, no default assignment
        let userLevel;
        try {
            const user = await UserRepository.findByTelegramId(userId);
            userLevel = user?.level;
        }
        catch (dbError) {
            console.warn('Database not available, user level not assigned:', dbError.message);
        }
        let selectedTopic = '';
        // Determine the topic based on user response
        if (userResponse.includes('yes') || userResponse.includes('agree') || userResponse.includes('ok')) {
            // Use AI to suggest topic based on learning history
            try {
                const user = await UserRepository.findByTelegramId(userId);
                if (user) {
                    const conversation = await Conversation.findOne({ user: user._id });
                    // Build context from grammar mistakes and lessons
                    let contextParts = [];
                    if (conversation?.grammarMistakes && conversation.grammarMistakes.length > 0) {
                        const recentMistakes = conversation.grammarMistakes.slice(-5);
                        contextParts.push(...recentMistakes.map(m => `Grammar mistake: ${m.grammarType} - "${m.mistake}" → "${m.correction}"`));
                    }
                    if (conversation?.lessons && conversation.lessons.length > 0) {
                        const recentLessons = conversation.lessons.slice(-3);
                        contextParts.push(...recentLessons.map(l => `Lesson topic: ${l.topic}`));
                    }
                    const conversationContext = contextParts.join(' | ');
                    if (conversationContext.trim()) {
                        const analysisPrompt = `Analyze this user's learning history and suggest the most appropriate English grammar topic they should focus on for their next lesson. Consider their grammar mistakes, previous lesson topics, and areas they've been working on.

User's learning history:
${conversationContext}

Please suggest ONE specific grammar topic (e.g., "verb tenses", "prepositions", "sentence structure", "adjectives and adverbs", etc.) that would be most beneficial for them to learn next.

Respond with just the topic name, nothing else.`;
                        try {
                            const aiSuggestedTopic = await callGeminiGenerateContent(analysisPrompt);
                            selectedTopic = aiSuggestedTopic.trim().toLowerCase();
                        }
                        catch (aiError) {
                            console.warn('AI topic suggestion failed, using default:', aiError.message);
                            selectedTopic = 'general grammar';
                        }
                    }
                    else {
                        selectedTopic = 'general grammar';
                    }
                }
            }
            catch (dbError) {
                selectedTopic = 'general grammar';
            }
        }
        else {
            // User suggested a different topic
            selectedTopic = userResponse.trim();
        }
        // Generate lesson using Gemini
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
        // Remove asterisks from the lesson content
        formattedLesson = formattedLesson.replace(/\*/g, '');
        await ctx.reply(`📖 Lesson: ${selectedTopic.toUpperCase()}\n\n${formattedLesson}`, { parse_mode: 'HTML' });
        // Update conversation context
        try {
            const user = await UserRepository.findByTelegramId(userId);
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
        console.error('Lesson response error:', error);
        await ctx.reply("❌ An error occurred while generating your lesson. Please try again later.");
    }
};
