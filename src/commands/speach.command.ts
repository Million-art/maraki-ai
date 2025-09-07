import { Context } from 'grammy';
import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
import { UserRepository } from '../repository/userRepository.js';
import { Conversation } from '../database/models/conversation.js';

const speechPrompt = `
You are Maraki AI, a speech and pronunciation coach. Help users practice spoken English through text-based conversation.

**Guidelines:**
- Focus on pronunciation tips and spoken English patterns
- Use phonetic spelling when helpful (e.g., "tomato" = /təˈmeɪtoʊ/)
- Suggest intonation and stress patterns
- Keep it conversational and encouraging
- Ask them to practice saying phrases out loud
- Provide common spoken English expressions
- Point out pronunciation issues and suggest improvements

**Response Style:**
- Give pronunciation guidance
- Suggest practice exercises
- Ask them to repeat or practice phrases
- Keep it fun and encouraging
- Include gentle corrections for pronunciation mistakes

Remember: Focus on how words sound, not just how they're spelled!
`;

export async function speechCommand(ctx: Context) {
  if (!ctx.from) return;

  await ctx.reply(
    `🗣️ **Speech Conversation Feature Coming Soon!**\n\n` +
    `We're working on an amazing speech conversation feature that will help you practice pronunciation and spoken English! 🎤\n\n` +
    `Stay tuned for:\n` +
    `• Pronunciation tips and guidance\n` +
    `• Stress and intonation practice\n` +
    `• Common spoken expressions\n` +
    `• Sound pattern exercises\n\n` +
    `In the meantime, try our chat conversation feature to practice your English! 💬`
  );
}

export async function handleSpeechConversation(ctx: Context) {
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

    // Generate speech response with context
    const fullPrompt = `${speechPrompt}

User Level: ${userLevel}
Previous Conversation Context: ${context}
Current User Message: "${userMessage}"

Provide pronunciation guidance and spoken English practice with context awareness.`;

    const aiResponse = await callGeminiGenerateContent(fullPrompt);

    // Clean up response
    let cleanResponse = aiResponse;
    if (aiResponse.includes('```')) {
      cleanResponse = aiResponse.replace(/```/g, '').trim();
    }
    cleanResponse = cleanResponse.replace(/\*/g, '');

    await ctx.reply(`🗣️ ${cleanResponse}`, { parse_mode: 'HTML' });

    // Save conversation context
    try {
      const user = await UserRepository.findByTelegramId(userId);
      if (user) {
        // Save combined context of user message and AI response
        const conversationContext = `Speech-User: ${userMessage.substring(0, 50)}... | Speech-AI: ${cleanResponse.substring(0, 50)}...`;
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
    console.error('Speech conversation error:', error);
    await ctx.reply("❌ Sorry, I'm having trouble with our speech practice right now. Let's try again later!");
  }
}

export async function startSpeechConversation(ctx: Context) {
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
    `🗣️ **Speech Conversation Mode Started!**\n\n` +
    `Let's practice spoken English! 🎤\n\n` +
    `I'll help you with:\n` +
    `• Pronunciation tips\n` +
    `• Stress and intonation\n` +
    `• Common spoken expressions\n` +
    `• Sound patterns\n\n` +
    `Try saying your message out loud as you type it. I'll remember our conversation and help improve your pronunciation! What would you like to practice? 🎵`
  );
}
