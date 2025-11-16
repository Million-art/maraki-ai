import { Context, InlineKeyboard } from "grammy";
import { setSession, getSession } from "../utils/redis.js";
import { apiService } from "../services/api.service.js";
import { callGeminiGenerateContent } from "../api/gemini/callGeminiGenerateContents.js";

export const quizCommand = async (ctx: Context) => {
  if (!ctx.from) return;

  await setSession(ctx.from.id, { mode: 'quiz', timestamp: Date.now(), quizState: { currentQuestion: 0, answers: [], questions: [] } });
  await ctx.reply("🧠 Starting your English quiz! I'll ask you 5 questions based on your recent mistakes or your level.\n\nLet's begin!");
  await sendNextQuestion(ctx);
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

    let questions = [];

    if (recentMistakes.length >= 3) {
      // Generate questions from mistakes
      const selectedMistakes = recentMistakes.slice(-5); // Use last 5 mistakes
      for (const mistake of selectedMistakes) {
        const question = await generateQuestionFromMistake(mistake, userLevel);
        questions.push(question);
      }
    } else {
      // Generate general questions based on level
      questions = await generateGeneralQuestions(userLevel);
    }

    return questions;
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    // Fallback to general questions
    return await generateGeneralQuestions('intermediate');
  }
};

const generateQuestionFromMistake = async (mistake: any, userLevel: string) => {
  const prompt = `Create a multiple-choice question about the grammar rule "${mistake.grammarType}" based on this mistake:

Original: "${mistake.mistake}"
Corrected: "${mistake.correction}"

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
    // Fallback question
    return {
      question: `Which of these is the correct version of: "${mistake.mistake}"?`,
      options: ["A) " + mistake.mistake, "B) " + mistake.correction, "C) Neither", "D) Both"],
      correctAnswer: 1,
      explanation: `The correct answer is: ${mistake.correction}`,
      type: 'mistake'
    };
  }
};

const generateGeneralQuestions = async (userLevel: string) => {
  const prompt = `Generate 5 multiple-choice questions for an English learner at ${userLevel} level. Focus on grammar, vocabulary, and sentence structure appropriate for this level.

Return a JSON array of 5 objects, each with:
{
  "question": "The question text",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correctAnswer": 0 (index of correct option),
  "explanation": "Brief explanation"
}`;

  try {
    const response = await callGeminiGenerateContent(prompt);
    const questions = JSON.parse(response.replace(/```json\s*|\s*```/g, ''));
    return questions.map((q: any) => ({ ...q, type: 'general' }));
  } catch (error) {
    console.error('Error generating general questions:', error);
    // Fallback questions
    return [
      {
        question: "Choose the correct form: 'She ___ to school every day.'",
        options: ["A) go", "B) goes", "C) going", "D) went"],
        correctAnswer: 1,
        explanation: "With 'she', we use 'goes' in present simple.",
        type: 'general'
      },
      {
        question: "What is the plural of 'child'?",
        options: ["A) childs", "B) children", "C) childes", "D) childrens"],
        correctAnswer: 1,
        explanation: "'Child' becomes 'children' in plural.",
        type: 'general'
      },
      {
        question: "Which word is a synonym of 'happy'?",
        options: ["A) sad", "B) joyful", "C) angry", "D) tired"],
        correctAnswer: 1,
        explanation: "'Joyful' means the same as 'happy'.",
        type: 'general'
      },
      {
        question: "Complete: 'I ___ a student.'",
        options: ["A) am", "B) is", "C) are", "D) be"],
        correctAnswer: 0,
        explanation: "With 'I', we use 'am' in present simple.",
        type: 'general'
      },
      {
        question: "What is the past tense of 'run'?",
        options: ["A) runned", "B) ran", "C) running", "D) runs"],
        correctAnswer: 1,
        explanation: "'Run' becomes 'ran' in past tense.",
        type: 'general'
      }
    ];
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

  // Save quiz result to database
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

  await ctx.reply(resultMessage);

  // Clear quiz session
  await setSession(ctx.from.id, { mode: null, timestamp: Date.now() });
};
