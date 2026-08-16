import { Context, InlineKeyboard } from "grammy";
import { getSession, setSession } from "../utils/redis.js";
import lessonPrompt from "../prompt/lesson.prompt.js";
import { apiService } from "../services/api.service.js";
import { callGeminiGenerateContent } from "../api/gemini/callGeminiGenerateContents.js";
import { FALLBACK_LESSON } from "../config/fallbacks.config.js";
import { lessonFollowupPrompt } from "../prompt/lesson.prompt.js";
import { checkCentralAuthAndAccess } from "../middleware/authGuard.middleware.js";

export const lessonCommand = async (ctx: Context) => {
  if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  // Centralized authentication & access verification
  const allowed = await checkCentralAuthAndAccess(ctx, 'lesson');
  if (!allowed) return;

  await setSession(ctx.from.id, { mode: 'lesson', timestamp: Date.now() });

  try {
    await startLessonRecommendation(ctx);
  } catch (error) {
    console.error('Lesson command error:', error);
    await ctx.reply("❌ An error occurred while starting the lesson. Please try again later.");
  }
};

export interface AIWeaknessAnalysis {
  identifiedWeakness: string;
  recommendedTopic: string;
  alternativeTopics: string[];
}

export const startLessonRecommendation = async (ctx: Context) => {
  if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  const userId = ctx.from.id;

  if (ctx.chat?.id) {
    try { await ctx.api.sendChatAction(ctx.chat.id, 'typing'); } catch (e) {}
  }

  // Get user level from API
  let userLevel = 'intermediate';
  try {
    const user = await apiService.getUserByTelegramId(userId);
    if (user?.level) userLevel = user.level;
  } catch (apiError) {
    console.warn('API not available, using default level:', (apiError as Error).message);
  }

  let conversationContext = '';
  let analysis: AIWeaknessAnalysis = {
    identifiedWeakness: 'Building strong fundamental sentence structures and active vocabulary.',
    recommendedTopic: 'Essential Verb Tenses & Usage',
    alternativeTopics: ['Prepositions & Sentence Structure', 'Common Conversational Idioms'],
  };

  try {
    const conversation = await apiService.getConversation(userId);
    if (conversation) {
      const contextParts: string[] = [];

      if (conversation?.grammarMistakes && conversation.grammarMistakes.length > 0) {
        const recentMistakes = conversation.grammarMistakes.slice(-5);
        contextParts.push(...recentMistakes.map((m: any) => `Mistake: "${m.mistake}" -> Correction: "${m.correction}" (${m.grammarType || 'Grammar'})`));
      }

      if (conversation?.lessons && conversation.lessons.length > 0) {
        const recentLessons = conversation.lessons.slice(-3);
        contextParts.push(...recentLessons.map((l: any) => `Previous Lesson: ${l.topic}`));
      }

      conversationContext = contextParts.join(' | ');

      if (conversationContext.trim()) {
        const analysisPrompt = `Analyze this English learner's recent mistakes and learning history to identify their primary weakness and recommend a single targeted lesson topic.

User Level: ${userLevel}
User Learning History & Mistakes:
${conversationContext}

Return JSON strictly in this exact format:
{
  "identifiedWeakness": "1 short encouraging sentence describing the specific weakness identified from their mistakes",
  "recommendedTopic": "Specific topic (2-4 words) that directly fixes this weakness"
}`;

        try {
          const aiRaw = await callGeminiGenerateContent(analysisPrompt, 'complex');
          const parsed = JSON.parse(aiRaw.replace(/```json\s*|\s*```/g, '').trim());
          if (parsed.identifiedWeakness && parsed.recommendedTopic) {
            analysis.identifiedWeakness = parsed.identifiedWeakness;
            analysis.recommendedTopic = parsed.recommendedTopic;
          }
        } catch (aiError) {
          console.warn('AI weakness analysis parsing failed, using fallback:', (aiError as Error).message);
        }
      }
    }
  } catch (dbError) {
    console.warn('Database not available for context, using default recommendations:', (dbError as Error).message);
  }

  // Save recommendation in user session so callback or text reply can use it
  await setSession(userId, {
    mode: 'lesson_awaiting_topic',
    timestamp: Date.now(),
    userLevel,
    conversationContext,
    recommendedTopic: analysis.recommendedTopic,
  });

  const keyboard = new InlineKeyboard()
    .text(`🎯 Start: ${analysis.recommendedTopic}`, `lesson_start_rec`)
    .row()
    .text(`✏️ Choose My Own Topic`, `lesson_custom_input`);

  const messageText =
    `🧠 <b>MARAKI AI WEAKNESS ANALYSIS</b> 🎯\n\n` +
    `📊 <b>Identified Focus Area:</b>\n` +
    `<i>"${analysis.identifiedWeakness}"</i>\n\n` +
    `🎯 <b>Recommended Lesson:</b> <b>${analysis.recommendedTopic}</b>\n` +
    `📈 <b>Your Level:</b> <code>${userLevel.toUpperCase()}</code>\n\n` +
    `Select how you'd like to start today:`;

  await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: keyboard });
};

export const generateAndSendLesson = async (ctx: Context, topic: string) => {
  if (!ctx.from) return;

  const userId = ctx.from.id;
  const session = await getSession(userId) || {};
  const userLevel = session.userLevel || 'intermediate';
  const conversationContext = session.conversationContext || '';

  if (ctx.chat?.id) {
    try { await ctx.api.sendChatAction(ctx.chat.id, 'typing'); } catch (e) {}
  }

  try {
    const lessonRequest = `${lessonPrompt}

User Level: ${userLevel}
Selected Topic: ${topic}
User's Past Mistakes & Weak Areas: ${conversationContext || 'No recorded mistakes yet.'}

IMPORTANT INSTRUCTIONS:
1. DO NOT include any greetings or intro chitchat. Start directly with 🎯 Goal.
2. Provide a clear, thorough explanation section (2-3 sentences + Amharic translation).
3. Include 2 comparison examples labeled with bold **Incorrect:** and **Correct:** (do NOT use ❌ or ✅ icons).
4. Keep line spacing clean with bullet points (NO TABLES).`;

    const lessonContent = await callGeminiGenerateContent(lessonRequest, 'complex');

    let formattedLesson = lessonContent
      .replace(/```[a-z]*/gi, '')
      .replace(/\|:?---*:?\|?/g, '')
      .replace(/\|/g, '\n• ')
      .replace(/\*/g, '')
      .replace(/Daily Example:/gi, 'Example:')
      .replace(/(?<!<b>)(Goal:)/gi, '<b>Goal:</b>')
      .replace(/(?<!<b>)(Explanation & Rule:)/gi, '<b>Explanation & Rule:</b>')
      .replace(/(?<!<b>)(Common Mistakes vs Correct Usage:)/gi, '<b>Common Mistakes vs Correct Usage:</b>')
      .replace(/(?<!<b>)(Incorrect:)/gi, '<b>Incorrect:</b>')
      .replace(/(?<!<b>)(Correct:)/gi, '<b>Correct:</b>')
      .replace(/(?<!<b>)(Example:)/gi, '<b>Example:</b>')
      .replace(/(?<!<b>)(Practice:)/gi, '<b>Practice:</b>')
      .replace(/(?<!<b>)(Answer Key:)/gi, '<b>Answer Key:</b>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const keyboard = new InlineKeyboard()
      .text("❓ Ask Question", "lesson_followup_ask")
      .text("📚 New Lesson", "lesson_back_to_parts")
      .text("❌ Exit", "close");

    await ctx.reply(`📖 <b>LESSON: ${topic.toUpperCase()}</b>\n\n${formattedLesson}`, { reply_markup: keyboard, parse_mode: 'HTML' });

    // Save lesson content to session for follow-up questions
    await setSession(userId, { 
      mode: 'lesson_followup', 
      timestamp: Date.now(), 
      lastLessonContent: formattedLesson, 
      lastLessonTopic: topic 
    });

    // Save lesson to database via API
    try {
      await apiService.addLesson(userId, {
        topic,
        details: formattedLesson,
        content: formattedLesson,
        createdAt: new Date(),
      });
    } catch (apiError) {
      console.warn('API not available, skipping context update:', (apiError as Error).message);
    }

  } catch (error) {
    console.error('Generate lesson error:', error);
    const keyboard = new InlineKeyboard()
      .text("❓ Ask Question", "lesson_followup_ask")
      .text("📚 New Lesson", "lesson_back_to_parts")
      .text("❌ Exit", "close");

    await ctx.reply(
      `📖 <b>LESSON: ${FALLBACK_LESSON.topic.toUpperCase()}</b>\n\n${FALLBACK_LESSON.content}`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  }
};

export const handleLessonResponse = async (ctx: Context) => {
  if (!ctx.from || !ctx.message?.text) return;

  const userId = ctx.from.id;
  const userResponse = ctx.message.text.trim();
  const session = await getSession(userId) || {};

  let topicToUse = session.recommendedTopic || 'General English Grammar';

  if (
    userResponse.toLowerCase().includes('yes') || 
    userResponse.toLowerCase().includes('agree') || 
    userResponse.toLowerCase().includes('ok') ||
    userResponse.toLowerCase().includes('start')
  ) {
    // Student agreed to recommended topic
    topicToUse = session.recommendedTopic || 'General English Grammar';
  } else {
    // Student typed their own custom topic
    topicToUse = userResponse;
  }

  await generateAndSendLesson(ctx, topicToUse);
};

export const handleLessonFollowup = async (ctx: Context) => {
  if (!ctx.from || !ctx.message?.text) return;

  const userId = ctx.from.id;
  const userQuestion = ctx.message.text.trim();

  try {
    const session = await getSession(userId);
    const lastLessonContent = session?.lastLessonContent || '';

    if (!lastLessonContent) {
      await ctx.reply("❌ Sorry, I don't have the lesson context to answer your question. Please start a new lesson.");
      return;
    }

    const prompt = lessonFollowupPrompt
      .replace('{lesson_content}', lastLessonContent)
      .replace('{user_question}', userQuestion);

    const answer = await callGeminiGenerateContent(prompt, 'complex');

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
    const { notifyAdminOnError } = await import('../utils/admin-notify.util.js');
    await notifyAdminOnError(ctx, error, 'Lesson Follow-up');
    await ctx.reply("❌ An error occurred while answering your question. Please try again later.");
  }
};
