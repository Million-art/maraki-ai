import { Context, InlineKeyboard } from "grammy";
import { referralCount } from "../services/user.service.js";

const BOT_USERNAME = process.env.BOT_USERNAME || "marakiai_bot";

export const referralCommand = async (ctx: Context) => {
  if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  const stats = await referralCount(ctx.from);
  const count = stats.referralCount || 0;
  const target = stats.target || 10;
  const remaining = stats.remaining !== undefined ? stats.remaining : Math.max(0, target - count);
  const referralLink = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;

  const progressBar = createProgressBar(count, target);

  const message =
    `🎁 <b>Maraki AI Referral & Reward Program</b> 🌟\n\n` +
    `Invite friends to practice English and unlock <b>1 Month FREE Maraki VIP</b>!\n\n` +
    `🔗 <b>Your Unique Referral Link:</b>\n` +
    `<code>${referralLink}</code>\n\n` +
    `📊 <b>Referral Progress:</b>\n` +
    `${progressBar}\n` +
    `• 👥 <b>Friends Referred:</b> ${count} / ${target}\n` +
    `• 🎯 <b>Remaining to VIP Reward:</b> ${remaining} ${remaining === 1 ? 'friend' : 'friends'}\n\n` +
    `💡 <i>Share this link in Telegram groups or with friends. When they tap Start, your count increases automatically!</i>`;

  const keyboard = new InlineKeyboard()
    .url("📢 Share on Telegram", `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Join me on Maraki AI to practice English & improve your skills for free! 🚀")}`)
    .row()
    .text("🧠 Take Quiz", "quiz")
    .text("📖 Learn Lesson", "lesson");

  await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
};

function createProgressBar(current: number, target: number): string {
  if (target <= 0) return '██████████ 100%';
  const percentage = Math.min((current / target) * 100, 100);
  const filled = Math.floor(percentage / 10);
  const empty = 10 - filled;

  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(percentage)}%`;
}
