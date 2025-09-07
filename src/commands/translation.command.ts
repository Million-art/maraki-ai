import { Context } from 'grammy';
import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
import { UserRepository } from '../repository/userRepository.js';
import { Conversation } from '../database/models/conversation.js';
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
      const user = await UserRepository.findByTelegramId(userId);
      userLevel = user?.level || 'intermediate';
    } catch (dbError) {
      console.warn('Database not available, using default user level:', (dbError as Error).message);
    }

    // Get conversation context
    let context = '';
    try {
      const user = await UserRepository.findByTelegramId(userId);
      if (user) {
        const conversations = await Conversation.find({ user: user._id })
          .sort({ createdAt: -1 })
          .limit(5);
        context = conversations
          .reverse()
          .map(conv => conv.context)
          .join(' | ');
      }
    } catch (dbError) {
      console.warn('Database not available, using empty context:', (dbError as Error).message);
    }

    // Generate translation response with context
    const fullPrompt = `${translationPrompt}

User Level: ${userLevel}
Previous Conversation Context: ${context}
Current User Message: "${userMessage}"

Provide accurate Amharic to English translation with explanations and cultural context.`;

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
        // Save combined context of user message and AI response
        const conversationContext = `Amharic-User: ${userMessage.substring(0, 50)}... | Translation-AI: ${cleanResponse.substring(0, 50)}...`;
        await Conversation.findOneAndUpdate(
          { user: user._id },
          { context: conversationContext },
          { upsert: true, new: true }
        );
      }
    } catch (dbError) {
      console.warn('Database not available, skipping context save:', (dbError as Error).message);
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
    const user = await UserRepository.findByTelegramId(ctx.from.id);
    if (user) {
      await Conversation.deleteMany({ user: user._id });
    }
  } catch (error) {
    console.warn('Could not clear conversation context:', error);
  }

  await ctx.reply(
    `Send me your amaric text 🇪🇹`
  );
}
