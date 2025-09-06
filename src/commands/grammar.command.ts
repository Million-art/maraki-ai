import { Context } from "grammy";
import { getSession, setSession } from "../utils/redis.js";
import grammarPrompt from "../prompt/grammarPrompt.js";
 import { UserRepository } from "../repository/userRepository.js";
import { Conversation } from "../database/models/conversation.js";
import { callGeminiGenerateContent } from "../api/gemini/callGeminiGenerateContents.js";

export const grammarCommand = async(ctx:Context)=>{
     if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  const session = await getSession(ctx.from.id);
  await setSession(ctx.from.id, { mode: 'grammar', timestamp: Date.now() });
  await ctx.reply("Ok, send me your sentence");

}

export const handleGrammarCorrection = async(ctx: Context) => {
  if (!ctx.from || !ctx.message?.text) return;

  const userId = ctx.from.id;
  const sentence = ctx.message.text;

  try {
    // Get user level
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
      const conversation = await Conversation.findOne({ user: userId }).sort({ createdAt: -1 });
      context = conversation?.context || '';
    } catch (dbError) {
      console.warn('Database not available, using empty context:', (dbError as Error).message);
    }

    // Construct full prompt
    const fullPrompt = `${grammarPrompt}

User Level: ${userLevel}
Conversation Context: ${context}
Sentence to correct: "${sentence}"`;

    // Call Gemini API
    const response = await callGeminiGenerateContent(fullPrompt);

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', response);
      await ctx.reply("❌ Sorry, I couldn't process your sentence. Please try again.");
      return;
    }

    // Format and send response
    const { correctedText, explanation, grammarType } = parsedResponse;
    let reply = `📝 **Corrected Sentence:**\n${correctedText}\n\n`;
    reply += `📖 **Explanation:** ${explanation}\n\n`;
    reply += `🏷️ **Grammar Type:** ${grammarType}`;

    await ctx.reply(reply, { parse_mode: 'HTML' });

    // Update conversation context
    try {
      await Conversation.findOneAndUpdate(
        { user: userId },
        { context: grammarType },
        { upsert: true, new: true }
      );
    } catch (dbError) {
      console.warn('Database not available, skipping context update:', (dbError as Error).message);
    }

  } catch (error) {
    console.error('Grammar correction error:', error);
    await ctx.reply("❌ An error occurred while correcting your sentence. Please try again later.");
  }

  // Clear session mode
  await setSession(userId, { mode: null, timestamp: Date.now() });
}
