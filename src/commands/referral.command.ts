import { Context } from "grammy";

const BOT_USERNAME = process.env.BOT_USERNAME || "MarakiBot";

export const referralCommand = async (ctx: Context) => {
  if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  const referralLink = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;

  const message = `
👋 Welcome to Maraki AI!

📚 Learn quickly from your mistakes.
📝 Improve your grammar and conversation skills.

🔗 Share this referral link with your friends to help them learn too:
${referralLink}

Thank you for spreading knowledge! 🌟
`;

  await ctx.reply(message);
};
