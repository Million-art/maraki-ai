import { InlineKeyboard } from "grammy";
import { referralCount } from "../services/user.service.js";
const BOT_USERNAME = process.env.BOT_USERNAME || "marakiai_bot";
export const referralCommand = async (ctx) => {
    if (!ctx.from) {
        return ctx.reply("⚠️ Could not get your Telegram ID.");
    }
    const stats = await referralCount(ctx.from);
    const count = stats.referralCount || 0;
    const target = 10;
    const referralLink = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
    const progressBar = createProgressBar(count, target);
    const message = `🎁 <b>Maraki AI Invite & Earn Program</b> 🌟\n\n` +
        `Invite your friends to learn English and unlock <b>FREE Maraki VIP</b>!\n\n` +
        `🏆 <b>Reward:</b>\n` +
        `• Invite <b>10 friends</b> ➔ <b>1 Month VIP Free!</b>\n\n` +
        `🔗 <b>Your Exclusive Referral Link:</b>\n` +
        `<code>${referralLink}</code>\n\n` +
        `📊 <b>Your Progress:</b>\n` +
        `${progressBar}\n` +
        `• 👥 <b>Friends Referred:</b> ${count} / ${target}\n` +
        `• 🎯 <b>Status:</b> ${count >= 10 ? '🎉 Reward Unlocked (1 Month VIP Activated!)' : `${10 - count} more friend(s) needed`}\n\n` +
        `💡 <i>Share your link with friends or groups. When they click /start, your progress updates automatically!</i>`;
    const miniAppUrl = process.env.MINI_APP_URL || 'https://maraki-mini-app.vercel.app/';
    const keyboard = new InlineKeyboard();
    if (miniAppUrl.includes('t.me/')) {
        keyboard.url("🎙️ Speak with Maraki (Voice App)", miniAppUrl);
    }
    else {
        keyboard.webApp("🎙️ Speak with Maraki (Voice App)", miniAppUrl);
    }
    keyboard
        .row()
        .text("🔥 Daily Challenge", "daily_challenge")
        .row()
        .url("📢 Share on Telegram", `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Join me on Maraki AI to practice English & improve your skills for free! 🚀")}`);
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
};
function createProgressBar(current, target) {
    if (target <= 0)
        return '██████████ 100%';
    const percentage = Math.min((current / target) * 100, 100);
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(percentage)}%`;
}
