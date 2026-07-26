import { Context, InlineKeyboard } from "grammy";
import { start_msg } from "../messages/start.message.js";
import { registerOrUpdate } from "../services/user.service.js";
import { getSession, setSession } from "../utils/redis.js";

export async function startCommand(ctx: Context) {
  if (!ctx.from) return;

  try {
    // Extract valid numerical referrerId from start payload (ignoring self-referrals)
    let referrerId: number | undefined = undefined;
    if (ctx.match) {
      const parsed = parseInt(String(ctx.match).trim(), 10);
      if (!isNaN(parsed) && parsed !== ctx.from.id) {
        referrerId = parsed;
      }
    }

    // Check session for user data
    const session = await getSession(ctx.from.id);

    if (referrerId) {
      try {
        const { trackReferralJoin } = await import("../utils/analytics.util.js");
        await trackReferralJoin(referrerId, ctx.from.id);
      } catch (e) {}
    }

    // Always register or update user via service layer to record referrer
    const user = await registerOrUpdate(ctx.from, referrerId);

    // Notify Admin of new user registration if new
    if (!session || !session.user) {
      const { trackNewUser } = await import("../utils/analytics.util.js");
      await trackNewUser(ctx);
    }

    // Clear any active session mode when starting fresh
    await setSession(ctx.from.id, { mode: null, timestamp: Date.now() });

    // Send welcome message
    const keyboard = new InlineKeyboard()
      .text("🧹 Correct sentence", "grammar")
      .text("🧠 Quiz", "quiz")
      .row()
      .text("📚 Lesson", "lesson")
      .text("⚡ Chat Conversation", "chat_conversation")
      .row()
      .text("🌐 Amharic → English", "translation")
      .row()
      .text("🔓 Hack the Bot (Free Premium)", "hack_bot");

    await ctx.reply(`👋 Hello ${ctx.from.first_name || "there"}.\n${start_msg}`, { reply_markup: keyboard });
  } catch (error) {
    console.error("Error in /start command:", error);
    await ctx.reply("⚠️ Something went wrong while starting the bot.");
  }
}
