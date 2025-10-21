import { Context } from 'grammy';
import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
import { apiService } from '../services/api.service.js';
import { translationPrompt } from '../prompt/translation.prompt.js';

export async function translationCommand(ctx: Context) {
  if (!ctx.from) return;

  await ctx.reply(
    `🌐 Please send me the Amharic sentence you want to translate.`
  );
}

export async function handleTranslation(ctx: Context) {
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

    // Get conversation context from chat history
    let context = '';
    try {
      const conversation = await apiService.getConversation(userId);
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
    } catch (apiError) {
      console.warn('API not available, using empty context:', (apiError as Error).message);
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
      await apiService.addChatMessage(userId, {
        userMessage: userMessage,
        aiResponse: cleanResponse,
        createdAt: new Date(),
      });
    } catch (apiError) {
      console.warn('API not available, skipping context save:', (apiError as Error).message);
    }

  } catch (error) {
    console.error('Translation error:', error);
    await ctx.reply("❌ Sorry, I'm having trouble with the translation right now. Let's try again later!");
  }
}

export async function startTranslation(ctx: Context) {
  if (!ctx.from) return;

  try {
    // Clear any existing conversation context for this mode
    // Note: Direct deletion not available via API, conversation will be managed by backend
    console.log('Translation mode started - conversation context will be managed by backend');
  } catch (error) {
    console.warn('Could not clear conversation context:', error);
  }

  await ctx.reply(
    `Send me your amaric text 🇪🇹`
  );
}
