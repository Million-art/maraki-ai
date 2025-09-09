import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
import { UserRepository } from '../repository/user.repository.js';
import { Conversation } from '../database/models/conversation.js';
import { translationPrompt } from '../prompt/translation.prompt.js';
export async function translationCommand(ctx) {
    if (!ctx.from)
        return;
    await ctx.reply(`🌐 Please send me the Amharic sentence you want to translate.`);
}
export async function handleTranslation(ctx) {
    if (!ctx.from || !ctx.message?.text)
        return;
    const userId = ctx.from.id;
    const userMessage = ctx.message.text;
    try {
        // Get user level for personalized responses
        let userLevel = 'intermediate';
        try {
            const user = await UserRepository.findByTelegramId(userId);
            userLevel = user?.level || 'intermediate';
        }
        catch (dbError) {
            console.warn('Database not available, using default user level:', dbError.message);
        }
        // Get conversation context from chat history
        let context = '';
        try {
            const user = await UserRepository.findByTelegramId(userId);
            if (user) {
                const conversation = await Conversation.findOne({ user: user._id });
                if (conversation?.chatHistory && conversation.chatHistory.length > 0) {
                    // Get last 5 chat entries for translation context
                    const recentChats = conversation.chatHistory.slice(-5);
                    context = recentChats
                        .map(chat => {
                        const userMsg = chat.userMessage || 'No message';
                        const aiMsg = chat.aiResponse || 'No response';
                        return `User: ${userMsg.substring(0, 50)}... | AI: ${aiMsg.substring(0, 50)}...`;
                    })
                        .join(' | ');
                }
            }
        }
        catch (dbError) {
            console.warn('Database not available, using empty context:', dbError.message);
        }
        // Generate translation response with context
        const fullPrompt = `${translationPrompt}

${userMessage}`;
        const aiResponse = await callGeminiGenerateContent(fullPrompt);
        // Clean up response
        let cleanResponse = aiResponse;
        if (aiResponse.includes('```')) {
            cleanResponse = aiResponse.replace(/```/g, '').trim();
        }
        cleanResponse = cleanResponse.replace(/\*/g, '');
        await ctx.reply(`🌐 ${cleanResponse}`, { parse_mode: 'HTML' });
        // Save conversation context
        try {
            const user = await UserRepository.findByTelegramId(userId);
            if (user) {
                // Save translation conversation to chatHistory array
                await Conversation.findOneAndUpdate({ user: user._id }, {
                    $push: {
                        chatHistory: {
                            userMessage: userMessage,
                            aiResponse: cleanResponse,
                            createdAt: new Date(),
                        },
                    },
                }, { upsert: true, new: true });
            }
        }
        catch (dbError) {
            console.warn('Database not available, skipping context save:', dbError.message);
        }
    }
    catch (error) {
        console.error('Translation error:', error);
        await ctx.reply("❌ Sorry, I'm having trouble with the translation right now. Let's try again later!");
    }
}
export async function startTranslation(ctx) {
    if (!ctx.from)
        return;
    try {
        // Clear any existing conversation context for this mode
        const user = await UserRepository.findByTelegramId(ctx.from.id);
        if (user) {
            await Conversation.deleteMany({ user: user._id });
        }
    }
    catch (error) {
        console.warn('Could not clear conversation context:', error);
    }
    await ctx.reply(`Send me your amaric text 🇪🇹`);
}
