import { Context } from 'grammy';
import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
import { UserRepository } from '../repository/user.repository.js';
import { Conversation } from '../database/models/conversation.js';
import { speechPrompt } from '../prompt/speechPrompt.js';

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

    // Get conversation context from chat history
    let context = '';
    try {
      const user = await UserRepository.findByTelegramId(userId);
      if (user) {
        const conversation = await Conversation.findOne({ user: user._id });
        if (conversation?.chatHistory && conversation.chatHistory.length > 0) {
          // Get last 5 chat entries for speech context
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
        // Save speech conversation to chatHistory array
        await Conversation.findOneAndUpdate(
          { user: user._id },
          {
            $push: {
              chatHistory: {
                userMessage: userMessage,
                aiResponse: cleanResponse,
                createdAt: new Date(),
              },
            },
          },
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
    `Let's practice spoken English! 🎤\n\n` +
    `I'll help you with:\n` +
    `• Pronunciation tips\n` +
    `• Stress and intonation\n` +
    `• Common spoken expressions\n` +
    `• Sound patterns\n\n` +
    `Try saying your message out loud as you type it. What would you like to practice? 🎵`
  );
}
