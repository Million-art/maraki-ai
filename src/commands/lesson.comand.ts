import { Context, InlineKeyboard } from "grammy";
import { getSession, setSession } from "../utils/redis.js";

export const lessonCommand = async(ctx: Context) => {
  if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  const session = await getSession(ctx.from.id);
  await setSession(ctx.from.id, { mode: 'lesson_menu', timestamp: Date.now() });

  try {
    // Create keyboard with full lesson option
    const keyboard = new InlineKeyboard()
      .text("📚 Full Lesson", "lesson_full_app")
      .row()
      .text("❌ Close", "close");

    await ctx.reply(
      `📚 **English Learning Lessons**\n\n` +
      `Access comprehensive English lessons through our mini app:\n\n`,
      { reply_markup: keyboard, parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Lesson command error:', error);
    await ctx.reply("❌ An error occurred while loading the lesson menu. Please try again later.");
  }
}






