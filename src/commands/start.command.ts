import { Context, InlineKeyboard } from "grammy";
import { start_msg } from "../messages/start.message.js";
import { registerOrUpdate } from "../services/userService.js";
 
export async function startCommand(ctx: Context) {
  if (!ctx.from) return;

  try {
    // Extract referrerId from the start payload
    const referrerId = ctx.match ? Number(ctx.match) : undefined;

    // Register or update user via service layer
    await registerOrUpdate(ctx.from, referrerId);

    // Send welcome message
    const keyboard = new InlineKeyboard()
      .text("🧹 Correct sentence", "grammar")
      .row()
      .text("✨ Learn from your mistake", "lesson")
      .row()
      .text("⚡ Chat Conversation", "chat_conversation")
      .text("🗣️ Speech Conversation", "speech_conversation")
      .row()
      .text("📊 Level", "level")
      .text("🔗 Referral Link", "referral_link");

    await ctx.reply(`👋 Hello ${ctx.from.first_name || "there"}.\n${start_msg}`, { reply_markup: keyboard });
  } catch (error) {
    console.error("Error in /start command:", error);
    await ctx.reply("⚠️ Something went wrong while starting the bot.");
  }
}
