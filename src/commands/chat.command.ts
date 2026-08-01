import { Context, InlineKeyboard } from 'grammy';
import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
import { apiService } from '../services/api.service.js';
import { chatPrompt } from '../prompt/conversation.prompt.js';



export async function chatMode(ctx: Context) {
  const text = ctx.message?.text;

  // If the user sent normal text (not a command)
  await ctx.reply(
    `👋 I see you typed: "${text}".\n\n` +
    `To interact with me, use one of the following commands:\n` +
    `/start - Main Menu\n` +
    `/grammar - 🧹Correct your sentence\n` +
    `/lesson - ✨Learn from your previous mistakes\n` +
    `/chat_conversation - ⚡Practice chat conversation\n` +
    `/translation - 🌐Amharic to English translation\n` +
    `/referral_link - 🔗 Get your referral link\n` +
    `/level - 📊 Check your level\n` +
    `/usage - 📊 Check your daily usage limits\n` +
    `/help - ❓ Get help\n\n` +
    `Or just keep chatting and I'll help you practice English! 💬`

  );
}

export async function handleChatConversation(ctx: Context) {
  if (!ctx.from || !ctx.message?.text) return;

  const userId = ctx.from.id;
  const userMessage = ctx.message.text;

  try {
    // Get user level for personalized responses
    let userLevel = 'intermediate';
    try {
      const user = await apiService.getUserByTelegramId(userId);
      userLevel = user?.level || 'intermediate';
    } catch (apiError) {
      console.warn('API not available, using default user level:', (apiError as Error).message);
    }

    // Get conversation context (last 5 chat entries for memory)
    let context = '';
    try {
      const conversation = await apiService.getConversation(userId);
      if (conversation?.chatHistory && conversation.chatHistory.length > 0) {
        // Get last 5 chat entries for context
        const recentChats = conversation.chatHistory.slice(-5);
        context = recentChats
          .map((chat: any) => {
            const userMsg = chat.userMessage || 'No message';
            const aiMsg = chat.aiResponse || 'No response';

            // Smart truncation: take first 100 chars, but don't cut words
            const truncateSmart = (text: string, maxLength: number) => {
              if (text.length <= maxLength) return text;
              const truncated = text.substring(0, maxLength);
              const lastSpace = truncated.lastIndexOf(' ');
              return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
            };

            const truncatedUserMsg = truncateSmart(userMsg, 100);
            const truncatedAiMsg = truncateSmart(aiMsg, 100);

            return `User: ${truncatedUserMsg} | AI: ${truncatedAiMsg}`;
          })
          .join(' | ');
      }
    } catch (apiError) {
      console.warn('API not available, using empty context:', (apiError as Error).message);
    }

    // Generate chat response with context
    const fullPrompt = `${chatPrompt}

User Level: ${userLevel}
Previous Conversation Context: ${context}
Current User Message: "${userMessage}"

Respond naturally and engagingly to continue the conversation.`;

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
      await apiService.addChatMessage(userId, {
        userMessage: userMessage,
        aiResponse: cleanResponse,
        createdAt: new Date(),
      });
    } catch (apiError) {
      console.warn('API not available, skipping context save:', (apiError as Error).message);
    }

  } catch (error) {
    console.error('Chat conversation error:', error);
    const { notifyAdminOnError } = await import('../utils/admin-notify.util.js');
    await notifyAdminOnError(ctx, error, 'AI Practice Chat');
    await ctx.reply("❌ Sorry, I'm having trouble with our conversation right now. Let's try again later!");
  }
}

export async function startChatConversation(ctx: Context) {
  if (!ctx.from) return;

  const miniAppUrl = process.env.MINI_APP_URL || 'https://t.me/marakiai_bot/app';
  const keyboard = new InlineKeyboard();

  if (miniAppUrl.includes('t.me/')) {
    keyboard.url("🎙️ Launch Voice Practice Mini App", miniAppUrl);
  } else {
    keyboard.webApp("🎙️ Launch Voice Practice Mini App", miniAppUrl);
  }

  await ctx.reply(
    `🎙️ <b>AI Voice Conversation</b> 🎉\n\n` +
    `Practice real-time English speaking and listening inside our interactive <b>Telegram Mini App</b>!\n\n` +
    `👇 <b>Tap below to launch:</b>`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}
