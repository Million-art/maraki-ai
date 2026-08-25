import { Context, InlineKeyboard } from 'grammy';
import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
import { updateDailyStreak } from '../utils/streak.util.js';
import { apiService } from '../services/api.service.js';
import { redis } from '../utils/redis.js';
import { hasBeenAsked, markAsAsked, getNotifyPreference } from '../utils/daily-notify.util.js';

// In-memory fallback for when Redis is offline
export const memoryDailyChallengeStore = new Map<string, string>();

export function clearDailyChallengeCache(userId?: number) {
  if (userId) {
    memoryDailyChallengeStore.delete(`user:daily_challenge:${userId}`);
  } else {
    memoryDailyChallengeStore.clear();
  }
}

function getTodayString(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Addis_Ababa' });
}

// Send opt-in prompt ONLY if the user has never been asked before
async function maybeAskForOptIn(ctx: Context, userId: number): Promise<void> {
  const asked = await hasBeenAsked(userId);
  if (asked) return;

  const pref = await getNotifyPreference(userId);
  if (pref !== null) return; // already decided

  await markAsAsked(userId);

  const optInKeyboard = new InlineKeyboard()
    .text('✅ Yes, send me daily!', 'daily_notify_yes')
    .text('❌ No thanks', 'daily_notify_no');

  await ctx.reply(
    `📬 <b>Liked today's challenge?</b> Get it delivered every morning — for free!`,
    { parse_mode: 'HTML', reply_markup: optInKeyboard }
  );
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

function buildShareKeyboard(word: string, idiom: string, userId: number): InlineKeyboard {
  const botUsername = process.env.BOT_USERNAME || 'marakiai_bot';
  const shareText = encodeURIComponent(
    `🎯 MARAKI AI Daily English Challenge!\n\n💡 Word of the Day: ${word}\n🗣️ Idiom of the Day: ${idiom}\n\nJoin the challenge → t.me/${botUsername}?start=${userId}`
  );
  const shareUrl = `https://t.me/share/url?url=t.me%2F${botUsername}&text=${shareText}`;
  return new InlineKeyboard()
    .url("📤 Share Challenge", shareUrl)
    .text("📚 Lessons", "lesson");
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

  // ── 1. Serve from cache if already generated today ──────────────────────────
  const cached = await getCachedChallenge(userId);
  if (cached) {
    // Extract word and idiom from cached HTML for the share URL
    const wordMatch = cached.match(/• <b>(.+?)<\/b>/);
    const idiomMatch = cached.match(/🗣️.*?\n• <b>(.+?)<\/b>/);
    const cachedWord = wordMatch?.[1] ?? 'Word of the Day';
    const cachedIdiom = idiomMatch?.[1] ?? 'Idiom of the Day';
    const keyboard = buildShareKeyboard(cachedWord, cachedIdiom, userId);

    const messageText =
      `🎯 <b>MARAKI AI DAILY CHALLENGE</b> 🌟\n` +
      `${streakHeader}\n\n` +
      cached;
    await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: keyboard });
    await maybeAskForOptIn(ctx, userId);
    return;
  }

  // ── 2. Fetch from DB (Fast) or Generate via Gemini (Fallback) ─────────────
  let userLevel = 'intermediate';
  try {
    const user = await apiService.getUserByTelegramId(userId);
    userLevel = user?.level || 'intermediate';
  } catch (e) {}

  try {
    // Attempt to fetch from DB first
    let data: any = null;
    const dbChallenge = await apiService.getDailyChallenge(userLevel);
    
    if (dbChallenge) {
      data = {
        wordOfTheDay: {
          word: dbChallenge.word,
          partOfSpeech: dbChallenge.wordPartOfSpeech,
          definition: dbChallenge.wordDefinition,
          example: dbChallenge.wordExample
        },
        idiomOfTheDay: {
          idiom: dbChallenge.idiom,
          meaning: dbChallenge.idiomMeaning,
          example: dbChallenge.idiomExample
        }
      };
      console.log(`[Challenge] Fetched DB challenge for level ${userLevel} (Day ${dbChallenge.dayNumber})`);
    } else {
      // Fallback to Gemini if DB is empty or fails
      console.log(`[Challenge] DB fetch failed/empty. Falling back to Gemini for ${userLevel}...`);
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
      const aiRaw = await callGeminiGenerateContent(prompt, 'complex');
      data = JSON.parse(aiRaw.replace(/```json\s*|\s*```/g, ''));
    }

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

    const keyboard = buildShareKeyboard(data.wordOfTheDay.word, data.idiomOfTheDay.idiom, userId);

    const messageText =
      `🎯 <b>MARAKI AI DAILY CHALLENGE</b> 🌟\n` +
      `${streakHeader}\n\n` +
      challengeContent;

    await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: keyboard });
    await maybeAskForOptIn(ctx, userId);

  } catch (err) {
    console.error('Challenge command error:', err);
    const fallbackKeyboard = new InlineKeyboard().text("📚 Lessons", "lesson");
    await ctx.reply(
      `🎯 <b>MARAKI AI DAILY CHALLENGE</b> 🌟\n` +
      `${streakHeader}\n\n` +
      `⚠️ Could not load today's challenge. Please try again in a moment.`,
      { parse_mode: 'HTML', reply_markup: fallbackKeyboard }
    );
  }
}

// ── Exported builder for the broadcast endpoint ───────────────────────────────
// Returns the message text + keyboard so the broadcast can send directly via bot.api
export async function buildDailyChallengeMessage(userId: number): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const { streak } = await import('../utils/streak.util.js').then(m => m.updateDailyStreak(userId));

  const botUsername = process.env.BOT_USERNAME || 'marakiai_bot';
  const shareText = encodeURIComponent(`🎯 I'm doing the MARAKI AI Daily English Challenge!\nJoin me and improve your English every day 🚀\n\nt.me/${botUsername}?start=challenge`);
  const shareUrl = `https://t.me/share/url?url=t.me%2F${botUsername}&text=${shareText}`;

  const keyboard = new InlineKeyboard()
    .url("📤 Share Challenge", shareUrl)
    .text("📚 Lessons", "lesson");

  // Serve from cache if already generated today
  const cached = await getCachedChallenge(userId);
  if (cached) {
    return {
      text: `🎯 <b>MARAKI AI DAILY CHALLENGE</b> 🌟\n🔥 <b>Streak: ${streak} ${streak === 1 ? 'Day' : 'Days'}</b>\n\n` + cached,
      keyboard,
    };
  }

  // Fetch from DB first (same as challengeCommand), or fallback to Gemini
  let data: any = null;
  let userLevel = 'intermediate';
  try {
    const user = await apiService.getUserByTelegramId(userId);
    userLevel = user?.level || 'intermediate';
  } catch (e) {}

  try {
    const dbChallenge = await apiService.getDailyChallenge(userLevel);
    if (dbChallenge) {
      data = {
        wordOfTheDay: {
          word: dbChallenge.word,
          partOfSpeech: dbChallenge.wordPartOfSpeech,
          definition: dbChallenge.wordDefinition,
          example: dbChallenge.wordExample,
        },
        idiomOfTheDay: {
          idiom: dbChallenge.idiom,
          meaning: dbChallenge.idiomMeaning,
          example: dbChallenge.idiomExample,
        },
      };
    }
  } catch (e) {
    console.error(`[Broadcast Challenge] Failed DB fetch for ${userId}:`, e);
  }

  if (!data) {
    try {
      const prompt = `Generate a unique Daily English Challenge for an English learner at ${userLevel} level.
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
      const aiRaw = await callGeminiGenerateContent(prompt, 'complex');
      data = JSON.parse(aiRaw.replace(/```json\s*|\s*```/g, ''));
    } catch (e) {
      console.error(`[Broadcast Challenge] Failed Gemini fallback for ${userId}:`, e);
      throw e;
    }
  }

  const challengeContent =
    `💡 <b>WORD OF THE DAY</b>\n` +
    `• <b>${data.wordOfTheDay.word}</b> (<i>${data.wordOfTheDay.partOfSpeech}</i>)\n` +
    `📖 <i>${data.wordOfTheDay.definition}</i>\n` +
    `💬 <i>"${data.wordOfTheDay.example}"</i>\n\n` +
    `🗣️ <b>IDIOM OF THE DAY</b>\n` +
    `• <b>${data.idiomOfTheDay.idiom}</b>\n` +
    `🎯 <i>${data.idiomOfTheDay.meaning}</i>\n` +
    `💬 <i>"${data.idiomOfTheDay.example}"</i>`;

  await setCachedChallenge(userId, challengeContent);

  return {
    text: `🎯 <b>MARAKI AI DAILY CHALLENGE</b> 🌟\n🔥 <b>Streak: ${streak} ${streak === 1 ? 'Day' : 'Days'}</b>\n\n` + challengeContent,
    keyboard,
  };
}
