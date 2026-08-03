import { Context, InlineKeyboard } from 'grammy';
import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
import { updateDailyStreak } from '../utils/streak.util.js';
import { apiService } from '../services/api.service.js';
import { redis } from '../utils/redis.js';

// In-memory fallback for when Redis is offline
const memoryDailyChallengeStore = new Map<string, string>();

function getTodayString(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Addis_Ababa' });
}

async function getCachedChallenge(userId: number): Promise<string | null> {
  const key = `user:daily_challenge:${userId}`;
  try {
    if (redis.isOpen) {
      const raw = await redis.get(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === getTodayString()) return parsed.content;
      }
    }
  } catch (e) {}
  // In-memory fallback
  const mem = memoryDailyChallengeStore.get(key);
  if (mem) {
    const parsed = JSON.parse(mem);
    if (parsed.date === getTodayString()) return parsed.content;
  }
  return null;
}

async function setCachedChallenge(userId: number, content: string): Promise<void> {
  const key = `user:daily_challenge:${userId}`;
  const value = JSON.stringify({ date: getTodayString(), content });
  try {
    if (redis.isOpen) {
      // Store with 26-hour TTL to cover timezone edge-cases. Key is replaced each new day.
      await redis.set(key, value, { EX: 60 * 60 * 26 });
    }
  } catch (e) {}
  memoryDailyChallengeStore.set(key, value);
}

export async function challengeCommand(ctx: Context) {
  if (!ctx.from) return;

  const userId = ctx.from.id;
  const { streak, isNewDay } = await updateDailyStreak(userId);

  if (ctx.chat?.id) {
    try { await ctx.api.sendChatAction(ctx.chat.id, 'typing'); } catch (e) {}
  }

  const streakHeader = isNewDay && streak > 1
    ? `🔥 <b>${streak}-Day Streak Active!</b> Keep it up!`
    : `🔥 <b>Current Streak: ${streak} ${streak === 1 ? 'Day' : 'Days'}</b>`;

  const keyboard = new InlineKeyboard()
    .text("🧠 Full Quiz (5 Questions)", "quiz")
    .text("📚 Lessons", "lesson");

  // ── 1. Serve from cache if already generated today ──────────────────────────
  const cached = await getCachedChallenge(userId);
  if (cached) {
    const messageText =
      `🎯 <b>MARAKI AI DAILY CHALLENGE</b> 🌟\n` +
      `${streakHeader}\n\n` +
      cached;
    await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: keyboard });
    return;
  }

  // ── 2. Generate a fresh challenge for today ──────────────────────────────────
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
  }
}`;

  try {
    const aiRaw = await callGeminiGenerateContent(prompt, 'complex');
    const data = JSON.parse(aiRaw.replace(/```json\s*|\s*```/g, ''));

    const challengeContent =
      `💡 <b>WORD OF THE DAY</b>\n` +
      `• <b>${data.wordOfTheDay.word}</b> (<i>${data.wordOfTheDay.partOfSpeech}</i>)\n` +
      `📖 <i>${data.wordOfTheDay.definition}</i>\n` +
      `💬 <i>"${data.wordOfTheDay.example}"</i>\n\n` +
      `🗣️ <b>IDIOM OF THE DAY</b>\n` +
      `• <b>${data.idiomOfTheDay.idiom}</b>\n` +
      `🎯 <i>${data.idiomOfTheDay.meaning}</i>\n` +
      `💬 <i>"${data.idiomOfTheDay.example}"</i>`;

    // Save to cache (replaces any previous day's entry for this user)
    await setCachedChallenge(userId, challengeContent);

    const messageText =
      `🎯 <b>MARAKI AI DAILY CHALLENGE</b> 🌟\n` +
      `${streakHeader}\n\n` +
      challengeContent;

    await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: keyboard });

  } catch (err) {
    console.error('Challenge command error:', err);
    await ctx.reply(
      `🎯 <b>MARAKI AI DAILY CHALLENGE</b> 🌟\n` +
      `${streakHeader}\n\n` +
      `⚠️ Could not load today's challenge. Please try again in a moment.`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  }
}


