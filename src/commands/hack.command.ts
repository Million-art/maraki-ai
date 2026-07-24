import { Context, InlineKeyboard } from "grammy";
import { apiService } from "../services/api.service.js";

export const hackCommand = async (ctx: Context) => {
  if (!ctx.from) return;

  const telegramId = ctx.from.id;
  const botUsername = ctx.me?.username || 'maraki_english_bot';

  try {
    const stats = await apiService.getReferralStats(telegramId);
    const totalReferred = stats.totalReferred || 0;
    const remaining = Math.max(0, 10 - totalReferred);
    const referralLink = `https://t.me/${botUsername}?start=${telegramId}`;

    // Create progress bar
    const filledBlocks = Math.min(10, totalReferred);
    const emptyBlocks = 10 - filledBlocks;
    const progressBar = '🟩'.repeat(filledBlocks) + '⬜'.repeat(emptyBlocks);

    let hackText =
      `🔓 <b>HACK MARAKI AI & GET 1 MONTH FREE PREMIUM!</b> 🎁\n\n` +
      `<i>Why pay 299 ETB when you can hack the system for FREE?</i> ⚡\n\n` +
      `Invite <b>10 friends</b> to Maraki English, and automatically unlock <b>1 Month of Maraki VIP Premium</b> (299 ETB Value) for <b>0 ETB</b>!\n\n` +
      `📊 <b>Your Referral Progress:</b>\n` +
      `${progressBar} <b>${totalReferred}/10 Friends Referred</b>\n\n`;

    if (stats.rewardClaimed) {
      hackText += `✅ <b>HACK REWARD CLAIMED!</b>\n` +
        `🌟 You have already redeemed your 1-Time Free Month VIP Premium reward for referring 10+ friends! 🚀\n\n`;
    } else if (totalReferred >= 10) {
      hackText += `🎉 <b>CONGRATULATIONS! HACK SUCCESSFUL!</b>\n` +
        `🌟 You unlocked <b>1 Month FREE Maraki VIP Premium</b>! Enjoy unlimited AI tutoring, quizzes, and lessons!\n\n`;
    } else {
      hackText += `🎯 <b>Status:</b> ${remaining} more friend${remaining === 1 ? '' : 's'} needed to unlock your FREE Premium Month!\n\n`;
    }

    hackText +=
      `🔗 <b>Your Exclusive Referral Link:</b>\n` +
      `<code>${referralLink}</code>\n\n` +
      `💡 <i>Share this link with your friends, classmates, or Telegram groups. When they click /start, your referral progress increases automatically!</i>`;

    const shareText = `🎁 Join me on Maraki English AI to practice English, take quizzes, and prepare for bank aptitude exams for FREE!`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;

    const keyboard = new InlineKeyboard()
      .url("🚀 Share Link with Friends", shareUrl)
      .row()
      .text("💳 Upgrade to VIP Now", "pay");

    await ctx.reply(hackText, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch (error) {
    console.error('Hack command error:', error);
    await ctx.reply("❌ Unable to load your referral hack status right now. Please try again in a moment.");
  }
};
