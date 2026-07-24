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
    // Generate translation response with context
    const fullPrompt = `${translationPrompt}\n\nUser Input:\n"${userMessage}"`;

    const aiResponse = await callGeminiGenerateContent(fullPrompt);

    // Clean up response
    let cleanResponse = aiResponse;
    if (aiResponse.includes('```')) {
      cleanResponse = aiResponse.replace(/```/g, '').trim();
    }
    cleanResponse = cleanResponse.replace(/\*/g, '');

    const replyPrefix = cleanResponse.startsWith('⚠️') || cleanResponse.startsWith('🌐') ? '' : '🌐 ';
    await ctx.reply(`${replyPrefix}${cleanResponse}`);

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
    console.log('Translation mode started - conversation context will be managed by backend');
  } catch (error) {
    console.warn('Could not clear conversation context:', error);
  }

  await ctx.reply(
    `Send me your Amharic text 🇪🇹`
  );
}
