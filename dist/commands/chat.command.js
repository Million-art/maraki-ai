import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
import { UserRepository } from '../repository/userRepository.js';
import { Conversation } from '../database/models/conversation.js';
import { chatPrompt } from '../prompt/conversation.prompt.js';
export async function chatMode(ctx) {
    const text = ctx.message?.text;
    // If the user sent normal text (not a command)
    await ctx.reply(`👋 I see you typed: "${text}".\n\n` +
        `To interact with me, use one of the following commands:\n` +
        `/start - Main Menu\n` +
        `/grammar - 🧹Correct your sentence\n` +
        `/lesson - ✨Learn from your previous mistakes\n` +
        `/chat_conversation - ⚡Practice chat conversation\n` +
        `/referral_link - 🔗 Get your referral link\n` +
        `/level - 📊 Check your level\n` +
        `/speech_conversation - 🗣️ Practice speech conversation (Coming Soon!)\n` +
        `/help - ❓ Get help\n\n` +
        `Or just keep chatting and I'll help you practice English! 💬`);
}
export async function handleChatConversation(ctx) {
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
        // Get conversation context (last 5 conversations for memory)
        let context = '';
        try {
            const user = await UserRepository.findByTelegramId(userId);
            if (user) {
                const conversations = await Conversation.find({ user: user._id })
                    .sort({ createdAt: -1 })
                    .limit(5);
                context = conversations
                    .reverse() // Put in chronological order
                    .map(conv => conv.context)
                    .join(' | ');
            }
        }
        catch (dbError) {
            console.warn('Database not available, using empty context:', dbError.message);
        }
        // Generate chat response with context
        const fullPrompt = `${chatPrompt}

User Level: ${userLevel}
Previous Conversation Context: ${context}
Current User Message: "${userMessage}"

Respond naturally and engagingly to continue the conversation. Include gentle grammar corrections if needed.`;
        const aiResponse = await callGeminiGenerateContent(fullPrompt);
        // Clean up response
        let cleanResponse = aiResponse;
        if (aiResponse.includes('```')) {
            cleanResponse = aiResponse.replace(/```/g, '').trim();
        }
        cleanResponse = cleanResponse.replace(/\*/g, '');
        await ctx.reply(`💬 ${cleanResponse}`, { parse_mode: 'HTML' });
        // Save conversation context
        try {
            const user = await UserRepository.findByTelegramId(userId);
            if (user) {
                // Save combined context of user message and AI response
                const conversationContext = `User: ${userMessage.substring(0, 50)}... | AI: ${cleanResponse.substring(0, 50)}...`;
                await Conversation.findOneAndUpdate({ user: user._id }, { context: conversationContext }, { upsert: true, new: true });
            }
        }
        catch (dbError) {
            console.warn('Database not available, skipping context save:', dbError.message);
        }
    }
    catch (error) {
        console.error('Chat conversation error:', error);
        await ctx.reply("❌ Sorry, I'm having trouble with our conversation right now. Let's try again later!");
    }
}
export async function startChatConversation(ctx) {
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
    await ctx.reply(`Let's have a friendly conversation to practice your English! 🎉\n\n` +
        `Feel free to talk about:\n` +
        `• Your hobbies and interests\n` +
        `• Your daily life\n` +
        `• Current events\n` +
        `• Travel experiences\n` +
        `• Or anything else you'd like!\n\n` +
        ` What would you like to talk about? 😊`);
}
