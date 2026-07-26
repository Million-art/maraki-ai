import { Context } from "grammy";
import { referralCount } from "../services/user.service.js";

const BOT_USERNAME = process.env.BOT_USERNAME || "marakiai_bot";

export const referralCommand = async (ctx: Context) => {
  if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  const { referralCount: count } = await referralCount(ctx.from);
  const referralLink = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;

  const message = `
✨ Here’s your personal referral link:
🔗 ${referralLink}

📊 You have referred: ${count} ${count === 1 ? "person" : "people"} 🎉

Thank you for helping our community grow! 🌟
`;

  await ctx.reply(message);
};
