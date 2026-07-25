import { Context, InlineKeyboard } from "grammy";
import { getSession, setSession } from "../utils/redis.js";
import lessonPrompt from "../prompt/lesson.prompt.js";
import { apiService } from "../services/api.service.js";
import { callGeminiGenerateContent } from "../api/gemini/callGeminiGenerateContents.js";
import { lessonFollowupPrompt } from "../prompt/lesson.prompt.js";

export const lessonCommand = async(ctx: Context) => {
  if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  const session = await getSession(ctx.from.id);
  await setSession(ctx.from.id, { mode: 'lesson', timestamp: Date.now() });

  try {
    // Directly start lesson recommendation instead of showing menu
    await startLessonRecommendation(ctx);

  } catch (error) {
    console.error('Lesson command error:', error);
    await ctx.reply("❌ An error occurred while starting the lesson. Please try again later.");
  }
}

export const startLessonRecommendation = async(ctx: Context) => {
  if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  const session = await getSession(ctx.from.id);
  await setSession(ctx.from.id, { mode: 'lesson', timestamp: Date.now() });

  // Analyze user conversation data to select focus topic
  try {
    let conversationContext = '';
    let suggestedTopic = 'general grammar';

    // Get user level from API, no default assignment
    let userLevel;
    try {
      const user = await apiService.getUserByTelegramId(ctx.from.id);
      userLevel = user?.level;
    } catch (apiError) {
      console.warn('API not available, user level not assigned:', (apiError as Error).message);
    }

    // Get conversation context to analyze patterns with AI
    try {
      const conversation = await apiService.getConversation(ctx.from.id);
      if (conversation) {

        // Build context from grammar mistakes and lessons
        let contextParts = [];

        if (conversation?.grammarMistakes && conversation.grammarMistakes.length > 0) {
          const recentMistakes = conversation.grammarMistakes.slice(-5);
          contextParts.push(...recentMistakes.map((m: any) => `Grammar mistake: ${m.grammarType} - "${m.mistake}" → "${m.correction}"`));
        }

        if (conversation?.lessons && conversation.lessons.length > 0) {
          const recentLessons = conversation.lessons.slice(-3);
          contextParts.push(...recentLessons.map((l: any) => `Lesson topic: ${l.topic}`));
        }

        conversationContext = contextParts.join(' | ');

        // Use AI to analyze conversation and suggest topic
        if (conversationContext.trim()) {
          const analysisPrompt = `Analyze this user's learning history and suggest the most appropriate English grammar topic they should focus on for their next lesson. Consider their grammar mistakes, previous lesson topics, and areas they've been working on.

User's learning history:
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

    // Check if user has any learning history
    const hasHistory = conversationContext.trim().length > 0;

    if (hasHistory) {
      await ctx.reply(
        `Based on your recent history, I suggest we focus on: ${suggestedTopic}\n\n` +
        `Your current level: ${userLevel}\n\n` +
        `Reply with:\n` +
        `• "yes"  to start this lesson\n` +
        `• "no" or suggest another topic (e.g., "verbs", "grammar", "vocabulary")\n\n` +
        `What would you like to do?`
      );
    } else {
      await ctx.reply(
        `Welcome to your first lesson! 🎉\n\n` +
        `I suggest we begin with: **${suggestedTopic}**\n\n` +
        `Reply with:\n` +
        `• "yes"  to start this lesson\n` +
        `• "no" or suggest another topic (e.g., "verbs", "grammar", "vocabulary")\n\n` +
        `What would you like to learn about?`
      );
    }

  } catch (error) {
    console.error('Lesson recommendation error:', error);
    await ctx.reply("❌ An error occurred while starting the lesson. Please try again later.");
  }
}

export const handleLessonResponse = async(ctx: Context) => {
  if (!ctx.from || !ctx.message?.text) return;

  const userId = ctx.from.id;
  const userResponse = ctx.message.text.toLowerCase();

  try {
    // Get user level from API, no default assignment
    let userLevel;
    try {
      const user = await apiService.getUserByTelegramId(userId);
      userLevel = user?.level;
    } catch (apiError) {
      console.warn('API not available, user level not assigned:', (apiError as Error).message);
    }

    let selectedTopic = '';

    // Determine the topic based on user response
    if (userResponse.includes('yes') || userResponse.includes('agree') || userResponse.includes('ok')) {
      // Use AI to suggest topic based on learning history
      try {
        const conversation = await apiService.getConversation(userId);
        if (conversation) {

          // Build context from grammar mistakes and lessons
          let contextParts = [];

          if (conversation?.grammarMistakes && conversation.grammarMistakes.length > 0) {
            const recentMistakes = conversation.grammarMistakes.slice(-5);
            contextParts.push(...recentMistakes.map((m: any) => `Grammar mistake: ${m.grammarType} - "${m.mistake}" → "${m.correction}"`));
          }

          if (conversation?.lessons && conversation.lessons.length > 0) {
            const recentLessons = conversation.lessons.slice(-3);
            contextParts.push(...recentLessons.map((l: any) => `Lesson topic: ${l.topic}`));
          }

          const conversationContext = contextParts.join(' | ');

          if (conversationContext.trim()) {
            const analysisPrompt = `Analyze this user's learning history and suggest the most appropriate English grammar topic they should focus on for their next lesson. Consider their grammar mistakes, previous lesson topics, and areas they've been working on.

User's learning history:
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

    // Send lesson with inline keyboard for follow-up options
    const { InlineKeyboard } = await import("grammy");
    const keyboard = new InlineKeyboard()
      .text("❓ Ask Question", "lesson_followup_ask")
      .text("📚 New Lesson", "lesson_back_to_parts")
      .text("❌ Exit", "close");

    await ctx.reply(`📖 Lesson: ${selectedTopic.toUpperCase()}\n\n${formattedLesson}`, { reply_markup: keyboard, parse_mode: 'HTML' });

    // Update conversation context
    try {
      await apiService.addLesson(userId, {
        topic: selectedTopic,
        details: formattedLesson,
        content: formattedLesson,
        createdAt: new Date(),
      });
    } catch (apiError) {
      console.warn('API not available, skipping context update:', (apiError as Error).message);
    }

  } catch (error) {
    console.error('Lesson response error:', error);
    await ctx.reply("❌ An error occurred while generating your lesson. Please try again later.");
  }
};

export const handleLessonFollowup = async(ctx: Context) => {
  if (!ctx.from || !ctx.message?.text) return;

  const userId = ctx.from.id;
  const userQuestion = ctx.message.text.trim();

  try {
    // Retrieve last lesson content from conversation history
    let lastLessonContent = '';
    try {
      const conversation = await apiService.getConversation(userId);
      if (conversation?.lessons && conversation.lessons.length > 0) {
        lastLessonContent = conversation.lessons[conversation.lessons.length - 1].content || '';
      }
    } catch (apiError) {
      console.warn('API not available, cannot retrieve lesson content:', (apiError as Error).message);
    }

    if (!lastLessonContent) {
      await ctx.reply("❌ Sorry, I don't have the lesson context to answer your question. Please start a new lesson.");
      return;
    }

    // Prepare prompt for follow-up question
    const prompt = lessonFollowupPrompt
      .replace('{lesson_content}', lastLessonContent)
      .replace('{user_question}', userQuestion);

    // Call AI to get answer
    const answer = await callGeminiGenerateContent(prompt);

    // Send answer with follow-up keyboard options
    const { InlineKeyboard } = await import("grammy");
    const keyboard = new InlineKeyboard()
      .text("❓ Ask Question", "lesson_followup_ask")
      .text("📚 New Lesson", "lesson_back_to_parts")
      .text("❌ Exit", "close");

    try {
      await ctx.reply(answer, { reply_markup: keyboard, parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(answer.replace(/<[^>]*>/g, ''), { reply_markup: keyboard });
    }

  } catch (error) {
    console.error('Lesson follow-up error:', error);
    await ctx.reply("❌ An error occurred while answering your question. Please try again later.");
  }
};
