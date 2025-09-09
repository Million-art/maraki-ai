import { Context } from 'grammy';
import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
import { UserRepository } from '../repository/user.repository.js';
import { Conversation } from '../database/models/conversation.js';
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
    `/speech_conversation - 🗣️ Practice speech conversation (Coming Soon!)\n` +
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
      const user = await UserRepository.findByTelegramId(userId);
      userLevel = user?.level || 'intermediate';
    } catch (dbError) {
      console.warn('Database not available, using default user level:', (dbError as Error).message);
    }

    // Get conversation context (last 5 chat entries for memory)
    let context = '';
    try {
      const user = await UserRepository.findByTelegramId(userId);
      if (user) {
        const conversation = await Conversation.findOne({ user: user._id });
        if (conversation?.chatHistory && conversation.chatHistory.length > 0) {
          // Get last 5 chat entries for context
          const recentChats = conversation.chatHistory.slice(-5);
          context = recentChats
            .map(chat => {
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
      }
    } catch (dbError) {
      console.warn('Database not available, using empty context:', (dbError as Error).message);
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
        // Save chat history entry
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
    console.error('Chat conversation error:', error);
    await ctx.reply("❌ Sorry, I'm having trouble with our conversation right now. Let's try again later!");
  }
}

export async function startChatConversation(ctx: Context) {
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
    `Let's have a friendly conversation to practice your English! 🎉\n\n` +
    `Feel free to talk about:\n` +
    `• Your hobbies and interests\n` +
    `• Your daily life\n` +
    `• Current events\n` +
    `• Travel experiences\n` +
    `• Or anything else you'd like!\n\n` +
    ` What would you like to talk about? 😊`
  );
}
