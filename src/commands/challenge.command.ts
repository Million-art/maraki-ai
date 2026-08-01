import { Context, InlineKeyboard } from 'grammy';
import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
import { updateDailyStreak } from '../utils/streak.util.js';
import { apiService } from '../services/api.service.js';

export async function challengeCommand(ctx: Context) {
  if (!ctx.from) return;

  const userId = ctx.from.id;
  const { streak, isNewDay } = await updateDailyStreak(userId);

  // If user already completed/viewed today's challenge, ask them to come back tomorrow!
  if (!isNewDay) {
    const keyboard = new InlineKeyboard()
      .text("🧠 Full Quiz (5 Questions)", "quiz")
      .text("📚 Lessons", "lesson");

    await ctx.reply(
      `🎉 <b>You've already completed today's Daily Challenge!</b>\n\n` +
      `🔥 <b>Current Streak: ${streak} ${streak === 1 ? 'Day' : 'Days'} Active</b>\n\n` +
      `⏰ <b>Come back tomorrow for your next Daily Challenge!</b>\n\n` +
      `<i>In the meantime, keep practicing your English skills below:</i>`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
    return;
  }

  // Send initial typing status
  if (ctx.chat?.id) {
    try { await ctx.api.sendChatAction(ctx.chat.id, 'typing'); } catch (e) {}
  }

  // Get user level if available
  let userLevel = 'intermediate';
  try {
    const user = await apiService.getUserByTelegramId(userId);
    userLevel = user?.level || 'intermediate';
  } catch (e) {}

  const prompt = `Generate a Daily English Challenge for an English learner at ${userLevel} level.
Return JSON format with:
{
  "wordOfTheDay": {
    "word": "Word",
    "partOfSpeech": "noun/verb/adj",
    "definition": "Clear simple definition",
    "example": "Sample sentence showing usage"
  },
  "idiomOfTheDay": {
    "idiom": "Idiom phrase",
    "meaning": "Simple explanation",
    "example": "Sample sentence using the idiom"
  },
  "miniQuiz": {
    "question": "A quick 1-sentence fill-in-the-blank or grammar question",
    "options": ["A) option1", "B) option2", "C) option3"],
    "correctIndex": 0,
    "explanation": "Short explanation"
  }
}`;

  try {
    const aiRaw = await callGeminiGenerateContent(prompt);
    const data = JSON.parse(aiRaw.replace(/```json\s*|\s*```/g, ''));

    const streakHeader = isNewDay && streak > 1 
      ? `🔥 <b>${streak}-Day Streak Active!</b> Keep it up!` 
      : `🔥 <b>Current Streak: ${streak} ${streak === 1 ? 'Day' : 'Days'}</b>`;

    const messageText =
      `🎯 <b>MARAKI AI DAILY CHALLENGE</b> 🌟\n` +
      `${streakHeader}\n\n` +
      `💡 <b>WORD OF THE DAY</b>\n` +
      `• <b>${data.wordOfTheDay.word}</b> (<i>${data.wordOfTheDay.partOfSpeech}</i>)\n` +
      `📖 <i>${data.wordOfTheDay.definition}</i>\n` +
      `💬 <code>"${data.wordOfTheDay.example}"</code>\n\n` +
      `🗣️ <b>IDIOM OF THE DAY</b>\n` +
      `• <b>${data.idiomOfTheDay.idiom}</b>\n` +
      `🎯 <i>${data.idiomOfTheDay.meaning}</i>\n` +
      `💬 <code>"${data.idiomOfTheDay.example}"</code>\n\n` +
      `❓ <b>MINI DAILY QUIZ</b>\n` +
      `${data.miniQuiz.question}\n\n` +
      `<i>Tap an option below to test your knowledge!</i>`;

    const keyboard = new InlineKeyboard();
    data.miniQuiz.options.forEach((opt: string, idx: number) => {
      const isCorrect = idx === data.miniQuiz.correctIndex;
      const callbackData = isCorrect 
        ? `challenge_ans_correct_${idx}` 
        : `challenge_ans_wrong_${idx}`;
      keyboard.text(opt, callbackData).row();
    });

    keyboard.text("🧠 Full Quiz (5 Questions)", "quiz").text("📚 Lessons", "lesson");

    await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch (err) {
    console.error('Challenge command error:', err);
    // Fallback static challenge if AI fails
    const fallbackText =
      `🔥 <b>MARAKI AI DAILY CHALLENGE</b>\n` +
      `🔥 <b>Current Streak: ${streak} Days</b>\n\n` +
      `💡 <b>WORD OF THE DAY: Resilient (adj)</b>\n` +
      `📖 <i>Able to recover quickly from difficult conditions.</i>\n` +
      `💬 <code>"She is resilient and never gives up on learning."</code>\n\n` +
      `🗣️ <b>IDIOM: Break the ice</b>\n` +
      `🎯 <i>Make people feel more comfortable in a social setting.</i>\n` +
      `💬 <code>"A friendly smile helps break the ice."</code>`;

    const keyboard = new InlineKeyboard()
      .text("🧠 Start Quiz", "quiz")
      .text("📚 Start Lesson", "lesson");

    await ctx.reply(fallbackText, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}
