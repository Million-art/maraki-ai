import { Context } from "grammy";
import { setSession } from "../utils/redis.js";
import grammarPrompt from "../prompt/grammar.prompt.js";
 import { UserRepository } from "../repository/userRepository.js";
import { Conversation } from "../database/models/conversation.js";
import { callGeminiGenerateContent } from "../api/gemini/callGeminiGenerateContents.js";

export const grammarCommand = async(ctx:Context)=>{
     if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

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

    // Construct full prompt  
    const fullPrompt = `${grammarPrompt}

          User Level: ${userLevel}
          Sentence to correct: "${sentence}"`;

    // Call Gemini API
    const response = await callGeminiGenerateContent(fullPrompt);

    // Parse JSON response
    let parsedResponse;
    try {
      // Extract JSON from markdown code blocks if present
      let jsonString = response;
      if (response.includes('```json')) {
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonString = jsonMatch[1].trim();
        }
      }
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', response);
      await ctx.reply("❌ Sorry, I couldn't process your sentence. Please try again.");
      return;
    }

    // Format and send response
    const { correctedText, explanation, grammarType } = parsedResponse;
    // Remove any asterisks from the correctedText and explanation
    const cleanCorrectedText = correctedText.replace(/\*/g, '');
    const cleanExplanation = explanation.replace(/\*/g, '');
    let reply = `<b> Corrected Sentence:</b>\n${cleanCorrectedText}\n\n`;
    reply += `<b> Explanation:</b> ${cleanExplanation}\n\n`;
    reply += `<b>🏷️ Grammar Type:</b> ${grammarType}`;

    await ctx.reply(reply, { parse_mode: 'HTML' });

    // Update conversation context
    try {
      // Find user by telegramId first to get ObjectId
      const user = await UserRepository.findByTelegramId(userId);
      if (user) {
        // Add new grammar mistake to grammarMistakes array
        await Conversation.findOneAndUpdate(
          { user: user._id },
          {
            $push: {
              grammarMistakes: {
                mistake: sentence,
                correction: correctedText,
                grammarType: grammarType,
                createdAt: new Date(),
              },
            },
          },
          { upsert: true, new: true }
        );
      }
    } catch (dbError) {
      console.warn('Database not available, skipping context update:', (dbError as Error).message);
    }

  } catch (error) {
    console.error('Grammar correction error:', error);
    await ctx.reply("❌ An error occurred while correcting your sentence. Please try again later.");
  }

}
