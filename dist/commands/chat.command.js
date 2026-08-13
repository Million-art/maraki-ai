import { InlineKeyboard } from 'grammy';
import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
import { apiService } from '../services/api.service.js';
import { chatPrompt } from '../prompt/conversation.prompt.js';
export async function chatMode(ctx) {
    const text = ctx.message?.text;
    // If the user sent normal text (not a command)
    await ctx.reply(`👋 I see you typed: "${text}".\n\n` +
        `To interact with me, use one of the following commands:\n` +
        `/start - Main Menu\n` +
        `/grammar - 🧹Correct your sentence\n` +
        `/lesson - ✨Learn from your previous mistakes\n` +
        `/translation - 🌐Amharic to English translation\n` +
        `/referral_link - 🔗 Get your referral link\n` +
        `/level - 📊 Check your level\n` +
        `/usage - 📊 Check your daily usage limits\n` +
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
            const user = await apiService.getUserByTelegramId(userId);
            userLevel = user?.level || 'intermediate';
        }
        catch (apiError) {
            console.warn('API not available, using default user level:', apiError.message);
        }
        // Get conversation context and past grammar mistakes for memory
        let context = '';
        let mistakesContext = '';
        try {
            const conversation = await apiService.getConversation(userId);
            if (conversation) {
                if (conversation.grammarMistakes && conversation.grammarMistakes.length > 0) {
                    const recentMistakes = conversation.grammarMistakes.slice(-5);
                    mistakesContext = recentMistakes
                        .map((m) => `Mistake: "${m.mistake || m.question}" → Correction: "${m.correction || m.explanation}"`)
                        .join(' | ');
                }
                if (conversation.chatHistory && conversation.chatHistory.length > 0) {
                    const recentChats = conversation.chatHistory.slice(-5);
                    context = recentChats
                        .map((chat) => {
                            const userMsg = chat.userMessage || 'No message';
                            const aiMsg = chat.aiResponse || 'No response';
                            const truncateSmart = (text, maxLength) => {
                                if (text.length <= maxLength)
                                    return text;
                                const truncated = text.substring(0, maxLength);
                                const lastSpace = truncated.lastIndexOf(' ');
                                return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
                            };
                            return `User: ${truncateSmart(userMsg, 100)} | AI: ${truncateSmart(aiMsg, 100)}`;
                        })
                        .join(' | ');
                }
            }
        }
        catch (apiError) {
            console.warn('API not available, using empty context:', apiError.message);
        }
        // Generate chat response with context and mistake awareness
        const fullPrompt = `${chatPrompt}

User Level: ${userLevel}
User's Recorded Weak Areas & Past Mistakes: ${mistakesContext || 'None recorded yet'}
Previous Conversation Context: ${context}
Current User Message: "${userMessage}"

INSTRUCTIONS FOR AI TUTOR:
1. Act as a warm, supportive personalized English tutor.
2. If the user made a grammar or phrasing mistake in "${userMessage}", gently provide a friendly correction at the end of your message.
3. Keep their past weak areas in mind to encourage proper usage.
4. Respond naturally and engagingly to continue the conversation.`;
        const aiResponse = await callGeminiGenerateContent(fullPrompt, 'complex');
        // Clean up response
        let cleanResponse = aiResponse;
        if (aiResponse.includes('```')) {
            cleanResponse = aiResponse.replace(/```/g, '').trim();
        }
        cleanResponse = cleanResponse.replace(/\*/g, '');
        await ctx.reply(`💬 ${cleanResponse}`, { parse_mode: 'HTML' });
        // Save conversation context
        try {
            await apiService.addChatMessage(userId, {
                userMessage: userMessage,
                aiResponse: cleanResponse,
                createdAt: new Date(),
            });
        }
        catch (apiError) {
            console.warn('API not available, skipping context save:', apiError.message);
        }
    }
    catch (error) {
        console.error('Chat conversation error:', error);
        const { notifyAdminOnError } = await import('../utils/admin-notify.util.js');
        await notifyAdminOnError(ctx, error, 'AI Practice Chat');
        await ctx.reply("❌ Sorry, I'm having trouble with our conversation right now. Let's try again later!");
    }
}
export async function startChatConversation(ctx) {
    if (!ctx.from)
        return;
    const miniAppUrl = process.env.MINI_APP_URL || 'https://maraki-mini-app.vercel.app/';
    const keyboard = new InlineKeyboard();
    if (miniAppUrl.includes('t.me/')) {
        keyboard.url("Talk with Maraki", miniAppUrl);
    }
    else {
        keyboard.webApp("Talk with Maraki", miniAppUrl);
    }
    await ctx.reply(`🎙️ <b>Personalized Conversation</b> 🎉\n\n` +
        `Practice real-time English speaking and listening !\n\n` +
        `👇 <b>Tap below to launch:</b>`, { parse_mode: 'HTML', reply_markup: keyboard });
}
