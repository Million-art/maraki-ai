import { Context, InlineKeyboard } from "grammy";
import { setSession, getSession } from "../utils/redis.js";
import { apiService } from "../services/api.service.js";
import { callGeminiGenerateContent } from "../api/gemini/callGeminiGenerateContents.js";
import { getFallbackQuizQuestions, getFallbackMistakeQuestion } from "../config/fallbacks.config.js";

export const quizCommand = async (ctx: Context) => {
  if (!ctx.from) return;

  try {
    // ─── USAGE GATE ──────────────────────────────────────────────────
    // Check before starting the quiz — blocks all entry paths:
    // /quiz command, CTA button, callback query
    const usage = await apiService.getUsageStatus(ctx.from.id);

    if (!usage.isPremium) {
      const quizzesUsed = usage.weeklyQuizzesUsed ?? 0;
      const quizLimit = usage.weeklyQuizLimit ?? 3;
      const remaining = quizLimit - quizzesUsed;

      if (remaining <= 0) {
        const keyboard = new InlineKeyboard().text("💳 Upgrade to VIP — Unlimited Access", "pay");
        await ctx.reply(
          `🚫 <b>Weekly Quiz Limit Reached!</b>\n\n` +
          `You have used all <b>${quizLimit} free quizzes</b> this week.\n\n` +
          `⏳ Your quota resets every <b>Monday</b>.\n\n` +
          `🔓 <b>Upgrade to VIP</b> for unlimited quizzes, lessons, and AI chat — 299 ETB/month!`,
          { parse_mode: 'HTML', reply_markup: keyboard }
        );
        return;
      }
    }
    // ─────────────────────────────────────────────────────────────────

    await setSession(ctx.from.id, { mode: 'quiz', timestamp: Date.now(), quizState: { currentQuestion: 0, answers: [], questions: [] } });
    await ctx.reply("🧠 Starting your English quiz! I'll ask you 5 questions based on your recent mistakes or your level.\n\nLet's begin!");
    await sendNextQuestion(ctx);
  } catch (error) {
    console.error('Quiz command error:', error);
    const { notifyAdminOnError } = await import('../utils/admin-notify.util.js');
    await notifyAdminOnError(ctx, error, 'Quiz Command');
    await ctx.reply("❌ An error occurred while starting your quiz. Please try again in a moment.");
  }
};

const sendNextQuestion = async (ctx: Context) => {
  if (!ctx.from) return;

  const session = await getSession(ctx.from.id);
  if (!session?.quizState) return;

  const { currentQuestion, questions } = session.quizState;

  if (currentQuestion >= 5) {
    await showQuizResults(ctx);
    return;
  }

  if (questions.length === 0) {
    // Generate questions if not already generated
    const generatedQuestions = await generateQuizQuestions(ctx.from.id);
    session.quizState.questions = generatedQuestions;
    await setSession(ctx.from.id, session);
  }

  const question = session.quizState.questions[currentQuestion];
  const keyboard = new InlineKeyboard();

  question.options.forEach((option: string, index: number) => {
    keyboard.text(option, `quiz_answer_${index}`).row();
  });

  await ctx.reply(`Question ${currentQuestion + 1}/5:\n\n${question.question}`, { reply_markup: keyboard });
};

const generateQuizQuestions = async (userId: number) => {
  try {
    // Get user level
    const user = await apiService.getUserByTelegramId(userId);
    const userLevel = user?.level || 'intermediate';

    // Get recent grammar mistakes (last 10)
    const conversation = await apiService.getConversation(userId);
    const recentMistakes = conversation?.grammarMistakes?.slice(-10) || [];

    let questions: any[] = [];

    if (recentMistakes.length > 0) {
      // Prioritize questions generated directly from user's past mistakes
      const selectedMistakes = recentMistakes.slice(-5);
      for (const mistake of selectedMistakes) {
        const question = await generateQuestionFromMistake(mistake, userLevel);
        questions.push(question);
      }
    }

    // Fill remaining slots up to 5 with questions tailored to user level and weak areas
    if (questions.length < 5) {
      const remainingCount = 5 - questions.length;
      const extraQuestions = await generateGeneralQuestions(userLevel, remainingCount, recentMistakes);
      questions = [...questions, ...extraQuestions];
    }

    return questions;
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    return await generateGeneralQuestions('intermediate', 5);
  }
};

const generateQuestionFromMistake = async (mistake: any, userLevel: string) => {
  const prompt = `Create a multiple-choice question about the grammar rule "${mistake.grammarType || 'grammar'}" based on this user mistake:

Original Mistake: "${mistake.mistake}"
Correct Explanation: "${mistake.correction}"

User level: ${userLevel}

Return a JSON object with:
{
  "question": "The question text",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correctAnswer": 0 (index of correct option),
  "explanation": "Brief explanation"
}`;

  try {
    const response = await callGeminiGenerateContent(prompt);
    const parsed = JSON.parse(response.replace(/```json\s*|\s*```/g, ''));
    return {
      question: parsed.question,
      options: parsed.options,
      correctAnswer: parsed.correctAnswer,
      explanation: parsed.explanation,
      type: 'mistake'
    };
  } catch (error) {
    console.error('Error generating question from mistake:', error);
    return getFallbackMistakeQuestion(mistake.mistake, mistake.correction);
  }
};

const generateGeneralQuestions = async (userLevel: string, count: number = 5, userMistakes: any[] = []) => {
  const topics = [
    "Phrasal Verbs & Everyday Idioms",
    "Past Continuous vs Past Simple Tenses",
    "Prepositions of Time, Direction & Place",
    "Essential Vocabulary for Travel & Socializing",
    "Conditionals & Hypotheses (If clauses)",
    "Business, Career & Office English",
    "Articles (a, an, the) & Quantifiers",
    "Commonly Confused Words (their/there/they're, lie/lay)",
    "Present Perfect vs Past Simple Tenses",
    "Modal Verbs (can, should, must, might, could)"
  ];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  const randomSeed = Math.floor(Math.random() * 1000000);

  const mistakeContext = userMistakes.length > 0
    ? `User's past mistake history: ${JSON.stringify(userMistakes.map(m => m.mistake || m.correction))}. Focus questions on similar weak areas.`
    : `Focus on typical grammar and vocabulary mistakes made by ${userLevel} level English learners.`;

  const prompt = `Generate ${count} UNIQUE, FRESH multiple-choice questions for an English learner at ${userLevel} level.
${mistakeContext}
Primary Focus Topic: ${randomTopic} (Random Seed: ${randomSeed}).
Ensure questions are completely unique and test different grammar rules or vocabulary.

Return a JSON array of ${count} objects, each with:
{
  "question": "The question text",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correctAnswer": 0 (index of correct option: 0, 1, 2, or 3),
  "explanation": "Brief explanation"
}`;

  try {
    const response = await callGeminiGenerateContent(prompt);
    const questions = JSON.parse(response.replace(/```json\s*|\s*```/g, ''));
    return questions.map((q: any) => ({ ...q, type: 'general' }));
  } catch (error) {
    console.error('Error generating general questions:', error);
    return getFallbackQuizQuestions();
  }
};

export const handleQuizAnswer = async (ctx: Context, answerIndex: number) => {
  if (!ctx.from) return;

  const session = await getSession(ctx.from.id);
  if (!session?.quizState) return;

  const { currentQuestion, answers, questions } = session.quizState;
  const currentQ = questions[currentQuestion];

  const isCorrect = answerIndex === currentQ.correctAnswer;
  answers.push({
    questionIndex: currentQuestion,
    selectedAnswer: answerIndex,
    isCorrect,
    explanation: currentQ.explanation
  });

  // If user made a mistake, automatically record it so future quizzes personalize questions around it!
  if (!isCorrect) {
    try {
      await apiService.addGrammarMistake(ctx.from.id, {
        mistake: currentQ.question,
        correction: currentQ.explanation,
        grammarType: 'Quiz Mistake',
        createdAt: new Date()
      });
    } catch (e) { }
  }

  session.quizState.currentQuestion = currentQuestion + 1;
  await setSession(ctx.from.id, session);

  // Show feedback
  const feedback = isCorrect ? "✅ Correct!" : "❌ Incorrect.";
  await ctx.reply(`${feedback}\n\n${currentQ.explanation}`);

  // Send next question after a short delay
  setTimeout(() => sendNextQuestion(ctx), 2000);
};

const showQuizResults = async (ctx: Context) => {
  if (!ctx.from) return;

  const session = await getSession(ctx.from.id);
  if (!session?.quizState) return;

  const { answers, questions } = session.quizState;
  const correctAnswers = answers.filter((a: any) => a.isCorrect).length;
  const score = Math.round((correctAnswers / 5) * 100);

  let resultMessage = `🎉 Quiz Complete!\n\n`;
  resultMessage += `📊 Your Score: ${correctAnswers}/5 (${score}%)\n\n`;

  if (score >= 80) {
    resultMessage += `🏆 Excellent! You're doing great!`;
  } else if (score >= 60) {
    resultMessage += `👍 Good job! Keep practicing!`;
  } else {
    resultMessage += `💪 Keep learning! Practice makes perfect!`;
  }

  // Save quiz result locally & to database
  try {
    const { recordQuizCompletion } = await import('../utils/quiz-stats.util.js');
    await recordQuizCompletion(ctx.from.id, correctAnswers, 5);
  } catch (e) { }

  try {
    await apiService.saveQuizResult(ctx.from.id, {
      score,
      totalQuestions: 5,
      correctAnswers,
      questions: questions.map((q: any, i: number) => ({
        question: q.question,
        userAnswer: answers[i]?.selectedAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: answers[i]?.isCorrect || false
      }))
    });
  } catch (error) {
    console.error('Error saving quiz result:', error);
  }

  resultMessage += `\n\nWhat would you like to do next? 🚀`;

  // Attach Call-to-Action inline keyboard with direct Talk with Maraki Mini App button
  const miniAppUrl = process.env.MINI_APP_URL || 'https://maraki-mini-app.vercel.app';
  const keyboard = new InlineKeyboard()
    .text("🧠 Take Another Quiz", "quiz")
    .text("📖 Learn a Lesson", "lesson")
    .row();

  if (miniAppUrl.includes('t.me/')) {
    keyboard.url("🎙️ Talk with Maraki", miniAppUrl);
  } else {
    keyboard.webApp("🎙️ Talk with Maraki", miniAppUrl);
  }

  keyboard
    .text("🔗 Referral Link", "referral_link")
    .row()
    .text("💳 Upgrade to VIP", "pay");

  await ctx.reply(resultMessage, { reply_markup: keyboard });

  // Clear quiz session
  await setSession(ctx.from.id, { mode: null, timestamp: Date.now() });
};
