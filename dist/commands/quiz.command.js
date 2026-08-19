import { InlineKeyboard } from "grammy";
import { setSession, getSession } from "../utils/redis.js";
import { apiService } from "../services/api.service.js";
import { callGeminiGenerateContent } from "../api/gemini/callGeminiGenerateContents.js";
import { getFallbackQuizQuestions, getFallbackMistakeQuestion } from "../config/fallbacks.config.js";
import { checkCentralAuthAndAccess } from "../middleware/authGuard.middleware.js";
export const quizCommand = async (ctx) => {
    if (!ctx.from)
        return;
    try {
        // Centralized authentication & access verification
        const allowed = await checkCentralAuthAndAccess(ctx, 'quiz');
        if (!allowed)
            return;
        // ── Atomic Quiz Start Lock ────────────────────────────────────────────────
        // Use Redis NX to guarantee only ONE quiz startup can run at a time per user.
        // This prevents the race condition where two calls read the session before
        // either has finished writing, causing duplicate quiz start messages.
        const { redis } = await import('../utils/redis.js');
        const quizStartLockKey = `quiz_starting:${ctx.from.id}`;
        if (redis.isOpen) {
            const acquired = await redis.set(quizStartLockKey, '1', { NX: true, EX: 30 });
            if (!acquired) {
                // Another call is already starting the quiz — silently ignore this one
                return;
            }
        }
        try {
            // Guard: If a quiz is already in progress (questions loaded), don't restart it
            const existingSession = await getSession(ctx.from.id);
            if (existingSession?.mode === 'quiz' && existingSession?.quizState?.questions?.length > 0 && existingSession?.quizState?.currentQuestion < 5) {
                await ctx.reply("You already have a quiz in progress! Please answer the current question.");
                await sendNextQuestion(ctx);
                return;
            }
            // Start fresh - preserve prefetchedQuizzes from previous bulk fetch!
            const prevSession = existingSession || {};
            await setSession(ctx.from.id, {
                ...prevSession,
                mode: 'quiz',
                timestamp: Date.now(),
                quizState: { currentQuestion: 0, answers: [], questions: [] }
            });
            await ctx.reply("🧠 Starting your English quiz! I'll ask you 5 questions based on your recent mistakes or your level.\n\nLet's begin!");
            await sendNextQuestion(ctx);
        }
        finally {
            // Always release the quiz start lock once we've sent the first question
            if (redis.isOpen) {
                await redis.del(quizStartLockKey);
            }
        }
    }
    catch (error) {
        console.error('Quiz command error:', error);
        const { notifyAdminOnError } = await import('../utils/admin-notify.util.js');
        await notifyAdminOnError(ctx, error, 'Quiz Command');
        await ctx.reply("❌ An error occurred while starting your quiz. Please try again in a moment.");
    }
};
const sendNextQuestion = async (ctx) => {
    if (!ctx.from)
        return;
    const session = await getSession(ctx.from.id);
    if (!session?.quizState)
        return;
    const { currentQuestion, questions } = session.quizState;
    if (currentQuestion >= 5) {
        await showQuizResults(ctx);
        return;
    }
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        // Generate questions if not already generated
        const generatedQuestions = await generateQuizQuestions(ctx.from.id);
        session.quizState.questions = generatedQuestions && generatedQuestions.length > 0 ? generatedQuestions : getFallbackQuizQuestions();
        await setSession(ctx.from.id, session);
    }
    const question = session.quizState.questions?.[currentQuestion];
    // Safeguard: If question or options is invalid, replace with fallback pool
    if (!question || !Array.isArray(question.options) || question.options.length === 0) {
        session.quizState.questions = getFallbackQuizQuestions();
        await setSession(ctx.from.id, session);
        const validQuestion = session.quizState.questions[currentQuestion] || session.quizState.questions[0];
        const keyboard = new InlineKeyboard();
        validQuestion.options.forEach((option, index) => {
            keyboard.text(option, `quiz_answer_${index}`).row();
        });
        try {
            await ctx.reply(`Question ${currentQuestion + 1}/5:\n\n${validQuestion.question}`, { reply_markup: keyboard });
        }
        catch (error) {
            console.error('Failed to send fallback question (network error):', error);
        }
        return;
    }
    const keyboard = new InlineKeyboard();
    question.options.forEach((option, index) => {
        keyboard.text(option, `quiz_answer_${index}`).row();
    });
    try {
        await ctx.reply(`Question ${currentQuestion + 1}/5:\n\n${question.question}`, { reply_markup: keyboard });
    }
    catch (error) {
        console.error('Failed to send question (network error):', error);
    }
};
const generateQuizQuestions = async (userId) => {
    try {
        // Get user level
        const user = await apiService.getUserByTelegramId(userId);
        const userLevel = user?.level || 'intermediate';
        // 1. Anti-Repeat DB Check: Try to fetch a fully structured zero-cost quiz from the database first
        const structuredQuiz = await apiService.getStructuredQuiz(userId, userLevel);
        if (structuredQuiz && structuredQuiz.length > 0) {
            return structuredQuiz; // Successfully fetched from DB! Zero Gemini cost.
        }
        // 2. Fallback to Gemini AI Generation
        // Get recent grammar mistakes (last 10)
        const conversation = await apiService.getConversation(userId);
        const recentMistakes = conversation?.grammarMistakes?.slice(-10) || [];
        let questions = [];
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
            const extraQuestions = await generateGeneralQuestions(userLevel, remainingCount, recentMistakes, userId);
            questions = [...questions, ...extraQuestions];
        }
        return questions;
    }
    catch (error) {
        console.error('Error generating quiz questions:', error);
        return await generateGeneralQuestions('intermediate', 5, [], userId);
    }
};
const generateQuestionFromMistake = async (mistake, userLevel) => {
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
        const response = await callGeminiGenerateContent(prompt, 'basic', true);
        const parsed = JSON.parse(response.replace(/```json\s*|\s*```/g, ''));
        return {
            question: parsed.question,
            options: parsed.options,
            correctAnswer: parsed.correctAnswer,
            explanation: parsed.explanation,
            type: 'mistake'
        };
    }
    catch (error) {
        console.error('Error generating question from mistake:', error);
        return getFallbackMistakeQuestion(mistake.mistake, mistake.correction);
    }
};
const generateGeneralQuestions = async (userLevel, count = 5, userMistakes = [], userId) => {
    const topicsPool = [
        "Phrasal Verbs & Everyday Idioms",
        "Past Continuous vs Past Simple Tenses",
        "Prepositions of Time, Direction & Place",
        "Essential Vocabulary for Travel & Socializing",
        "Conditionals & Hypotheses (If clauses)",
        "Business, Career & Office English",
        "Articles (a, an, the) & Quantifiers",
        "Commonly Confused Words (their/there/they're, lie/lay)",
        "Present Perfect vs Past Simple Tenses",
        "Modal Verbs (can, should, must, might, could)",
        "Relative Clauses (who, which, that, whose)",
        "Reported Speech & Indirect Questions",
        "Passive Voice & Causative Verbs",
        "Advanced Collocations & Academic Vocabulary"
    ];
    // Pick 3 random topics to force question variety
    const selectedTopics = [...topicsPool].sort(() => 0.5 - Math.random()).slice(0, 3).join(", ");
    const randomSeed = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    let recentQuestionHistoryStr = "";
    if (userId) {
        try {
            const session = await getSession(userId);
            const history = session?.askedQuestionsHistory || [];
            if (history.length > 0) {
                recentQuestionHistoryStr = `\nCRITICAL ANTI-REPEAT INSTRUCTION: DO NOT repeat or generate questions similar to these recently asked questions:\n- ${history.slice(-15).join('\n- ')}\n`;
            }
        }
        catch (e) {
            console.warn('Failed to load question history from session:', e.message);
        }
    }
    const mistakeContext = userMistakes.length > 0
        ? `User's past mistake history: ${JSON.stringify(userMistakes.map(m => m.mistake || m.correction))}. Focus questions on similar weak areas.`
        : `Focus on typical grammar and vocabulary mistakes made by ${userLevel} level English learners.`;
    const prompt = `Generate ${count} COMPLETELY UNIQUE, FRESH multiple-choice questions for an English learner at ${userLevel} level.
${mistakeContext}
Focus Topics: ${selectedTopics} (Seed: ${randomSeed}).${recentQuestionHistoryStr}
Ensure each of the ${count} questions tests a DIFFERENT grammar rule or vocabulary word. DO NOT use standard template questions like "Seldom...", "It is crucial...", or "Had we arrived...".

Return a JSON array of ${count} objects, each with:
{
  "question": "The question text",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correctAnswer": 0 (index of correct option: 0, 1, 2, or 3),
  "explanation": "Brief explanation"
}`;
    try {
        const response = await callGeminiGenerateContent(prompt, 'basic', true);
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        const jsonString = jsonMatch ? jsonMatch[0] : response.replace(/```json\s*|\s*```/g, '');
        const questions = JSON.parse(jsonString);
        if (Array.isArray(questions) && questions.length > 0) {
            const validQuestions = questions.filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2);
            if (validQuestions.length > 0) {
                // Save new question titles to session history to prevent future repetition
                if (userId) {
                    try {
                        const session = await getSession(userId) || {};
                        const history = session.askedQuestionsHistory || [];
                        const newTitles = validQuestions.map((q) => q.question.substring(0, 50));
                        const updatedHistory = [...history, ...newTitles].slice(-30);
                        await setSession(userId, { ...session, askedQuestionsHistory: updatedHistory });
                    }
                    catch (e) { }
                }
                return validQuestions.map((q) => {
                    const optionsWithFlag = q.options.map((optText, idx) => ({
                        text: optText.replace(/^[A-D]\)\s*/, ''),
                        isCorrect: idx === q.correctAnswer
                    }));
                    for (let i = optionsWithFlag.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [optionsWithFlag[i], optionsWithFlag[j]] = [optionsWithFlag[j], optionsWithFlag[i]];
                    }
                    const shuffledTexts = optionsWithFlag.map((o) => o.text);
                    const newCorrectIndex = optionsWithFlag.findIndex((o) => o.isCorrect);
                    return {
                        ...q,
                        options: shuffledTexts,
                        correctAnswer: newCorrectIndex >= 0 ? newCorrectIndex : 0,
                        type: 'general'
                    };
                });
            }
        }
    }
    catch (error) {
        console.error('Error generating general questions:', error);
    }
    return getFallbackQuizQuestions();
};
export const handleQuizAnswer = async (ctx, answerIndex) => {
    if (!ctx.from)
        return;
    const session = await getSession(ctx.from.id);
    if (!session?.quizState)
        return;
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
        }
        catch (e) { }
    }
    session.quizState.currentQuestion = currentQuestion + 1;
    await setSession(ctx.from.id, session);
    // Show feedback
    const feedback = isCorrect ? "✅ Correct!" : "❌ Incorrect.";
    try {
        await ctx.reply(`${feedback}\n\n${currentQ.explanation}`);
    }
    catch (e) {
        console.error('Failed to send answer feedback:', e);
    }
    // Use await with a proper delay instead of setTimeout to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, 1500));
    await sendNextQuestion(ctx);
};
const showQuizResults = async (ctx) => {
    if (!ctx.from)
        return;
    const session = await getSession(ctx.from.id);
    if (!session?.quizState)
        return;
    const { answers, questions } = session.quizState;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctAnswers / 5) * 100);
    let resultMessage = `🎉 Quiz Complete!\n\n`;
    resultMessage += `📊 Your Score: ${correctAnswers}/5 (${score}%)\n\n`;
    if (score >= 80) {
        resultMessage += `🏆 Excellent! You're doing great!`;
    }
    else if (score >= 60) {
        resultMessage += `👍 Good job! Keep practicing!`;
    }
    else {
        resultMessage += `💪 Keep learning! Practice makes perfect!`;
    }
    // Save quiz result locally & to database
    try {
        const { recordQuizCompletion } = await import('../utils/quiz-stats.util.js');
        await recordQuizCompletion(ctx.from.id, correctAnswers, 5);
    }
    catch (e) { }
    try {
        const completedQuizId = questions?.[0]?.quizId;
        await apiService.saveQuizResult(ctx.from.id, {
            quizId: completedQuizId,
            score,
            totalQuestions: 5,
            correctAnswers,
            questions: questions.map((q, i) => ({
                question: q.question,
                userAnswer: answers[i]?.selectedAnswer,
                correctAnswer: q.correctAnswer,
                isCorrect: answers[i]?.isCorrect || false
            }))
        });
    }
    catch (error) {
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
    }
    else {
        keyboard.webApp("🎙️ Talk with Maraki", miniAppUrl);
    }
    keyboard
        .text("🔗 Referral Link", "referral_link")
        .row()
        .text("💳 Upgrade to VIP", "pay");
    await ctx.reply(resultMessage, { reply_markup: keyboard });
    // Clear quiz session while preserving session history, asked question texts, and prefetched quizzes
    const currentSession = (await getSession(ctx.from.id)) || {};
    const previousAskedTexts = currentSession.askedQuestionTexts || [];
    const newQuestionTexts = (questions || []).map((q) => q.question).filter(Boolean);
    const updatedAskedTexts = Array.from(new Set([...previousAskedTexts, ...newQuestionTexts])).slice(-100);
    delete currentSession.quizState;
    await setSession(ctx.from.id, {
        ...currentSession,
        askedQuestionTexts: updatedAskedTexts,
        mode: null,
        timestamp: Date.now(),
    });
};
