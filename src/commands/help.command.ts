import { Context, InlineKeyboard } from "grammy";
import { help_msg } from "../messages/help.message.js";

export const helpCommand = async (ctx: Context) => {
  const miniAppUrl = process.env.MINI_APP_URL || 'https://t.me/marakiai_bot/app';
  const keyboard = new InlineKeyboard()
    .text("✨ Learn Lesson", "lesson")
    .text("🧠 Take Quiz", "quiz")
    .row();

  if (miniAppUrl.includes('t.me/')) {
    keyboard.url("🎙️ Talk with Maraki", miniAppUrl);
  } else {
    keyboard.webApp("🎙️ Talk with Maraki", miniAppUrl);
  }

  keyboard
    .text("🌐 Translation", "translation")
    .row()
    .text("🔗 Referral Link", "referral_link")
    .text("💳 Upgrade VIP", "pay");

  return ctx.reply(help_msg, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
};
