import { Context, InlineKeyboard } from "grammy";
import { help_msg } from "../messages/help.message.js";

export const helpCommand = async (ctx: Context) => {
  const keyboard = new InlineKeyboard()
    .text("✨ Learn Lesson", "lesson")
    .text("🧠 Take Quiz", "quiz").row()
    .text("⚡ Practice Chat", "chat_conversation")
    .text("🌐 Translation", "translation").row()
    .text("🔗 Referral Link", "referral_link")
    .text("💳 Upgrade VIP", "pay");

  return ctx.reply(help_msg, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
};
