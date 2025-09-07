import { Context } from "grammy";
import { getSession, setSession } from "../utils/redis.js";
import lessonPrompt from "../prompt/lessonPrompt.js";
import { UserRepository } from "../repository/userRepository.js";
import { Conversation } from "../database/models/conversation.js";
import { callGeminiGenerateContent } from "../api/gemini/callGeminiGenerateContents.js";

export const lessonCommand = async(ctx: Context) => {
  if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  const session = await getSession(ctx.from.id);
  await setSession(ctx.from.id, { mode: 'lesson', timestamp: Date.now() });

  // Analyze user conversation data to select focus topic
  try {
    let conversationContext = '';
    let suggestedTopic = 'general grammar';

    // Get user level from database, no default assignment
    let userLevel;
    try {
      const user = await UserRepository.findByTelegramId(ctx.from.id);
      userLevel = user?.level;
    } catch (dbError) {
      console.warn('Database not available, user level not assigned:', (dbError as Error).message);
    }

    // Get conversation context to analyze patterns with AI
    try {
      const user = await UserRepository.findByTelegramId(ctx.from.id);
      if (user) {
        const conversations = await Conversation.find({ user: user._id }).sort({ createdAt: -1 }).limit(10);
        conversationContext = conversations.map(conv => conv.context).join(' ');

        // Use AI to analyze conversation and suggest topic
        if (conversationContext.trim()) {
          const analysisPrompt = `Analyze this user's conversation history and suggest the most appropriate English grammar topic they should focus on for their next lesson. Consider their mistakes, interests, and areas they've been working on.

User's conversation history:
${conversationContext}

Please suggest ONE specific grammar topic (e.g., "verb tenses", "prepositions", "sentence structure", "adjectives and adverbs", etc.) that would be most beneficial for them to learn next.

Respond with just the topic name, nothing else.`;

          try {
            const aiSuggestedTopic = await callGeminiGenerateContent(analysisPrompt);
            suggestedTopic = aiSuggestedTopic.trim().toLowerCase();
          } catch (aiError) {
            console.warn('AI topic suggestion failed, using default:', (aiError as Error).message);
            suggestedTopic = 'general grammar';
          }
        }
      }
    } catch (dbError) {
      console.warn('Database not available, using default topic:', (dbError as Error).message);
    }

    await ctx.reply(
      `Based on your conversation history, I suggest we focus on: ${suggestedTopic}\n\n` +
      `Your current level: ${userLevel}\n\n` +
      `Reply with:\n` +
      `• "yes"  to start this lesson\n` +
      `• "no" or suggest another topic (e.g., "verbs", "grammar", "vocabulary")\n\n` +
      `What would you like to do?`
    );

  } catch (error) {
    console.error('Lesson command error:', error);
    await ctx.reply("❌ An error occurred while starting the lesson. Please try again later.");
  }
}

export const handleLessonResponse = async(ctx: Context) => {
  if (!ctx.from || !ctx.message?.text) return;

  const userId = ctx.from.id;
  const userResponse = ctx.message.text.toLowerCase();

  try {
    // Get user level from database, no default assignment
    let userLevel;
    try {
      const user = await UserRepository.findByTelegramId(userId);
      userLevel = user?.level;
    } catch (dbError) {
      console.warn('Database not available, user level not assigned:', (dbError as Error).message);
    }

    let selectedTopic = '';

    // Determine the topic based on user response
    if (userResponse.includes('yes') || userResponse.includes('agree') || userResponse.includes('ok')) {
      // Use AI to suggest topic based on conversation history
      try {
        const user = await UserRepository.findByTelegramId(userId);
        if (user) {
          const conversations = await Conversation.find({ user: user._id }).sort({ createdAt: -1 }).limit(10);
          const conversationContext = conversations.map(conv => conv.context).join(' ');

          if (conversationContext.trim()) {
            const analysisPrompt = `Analyze this user's conversation history and suggest the most appropriate English grammar topic they should focus on for their next lesson. Consider their mistakes, interests, and areas they've been working on.

User's conversation history:
${conversationContext}

Please suggest ONE specific grammar topic (e.g., "verb tenses", "prepositions", "sentence structure", "adjectives and adverbs", etc.) that would be most beneficial for them to learn next.

Respond with just the topic name, nothing else.`;

            try {
              const aiSuggestedTopic = await callGeminiGenerateContent(analysisPrompt);
              selectedTopic = aiSuggestedTopic.trim().toLowerCase();
            } catch (aiError) {
              console.warn('AI topic suggestion failed, using default:', (aiError as Error).message);
              selectedTopic = 'general grammar';
            }
          } else {
            selectedTopic = 'general grammar';
          }
        }
      } catch (dbError) {
        selectedTopic = 'general grammar';
      }
    } else {
      // User suggested a different topic
      selectedTopic = userResponse.trim();
    }

    // Generate lesson using Gemini
    const lessonRequest = `${lessonPrompt}

User Level: ${userLevel}
Selected Topic: ${selectedTopic}
User's Previous Focus Areas: Based on conversation history, focus on areas where the user has shown interest or made mistakes.`;

    const lessonContent = await callGeminiGenerateContent(lessonRequest);

    // Parse and format the lesson response
    let formattedLesson = lessonContent;
    if (lessonContent.includes('```')) {
      formattedLesson = lessonContent.replace(/```/g, '').trim();
    }
    // Remove asterisks from the lesson content
    formattedLesson = formattedLesson.replace(/\*/g, '');

    await ctx.reply(`📖 Lesson: ${selectedTopic.toUpperCase()}\n\n${formattedLesson}`, { parse_mode: 'HTML' });

    // Update conversation context
    try {
      const user = await UserRepository.findByTelegramId(userId);
      if (user) {
        await Conversation.findOneAndUpdate(
          { user: user._id },
          { context: selectedTopic },
          { upsert: true, new: true }
        );
      }
    } catch (dbError) {
      console.warn('Database not available, skipping context update:', (dbError as Error).message);
    }

  } catch (error) {
    console.error('Lesson response error:', error);
    await ctx.reply("❌ An error occurred while generating your lesson. Please try again later.");
  }

 
}
