import { Context } from 'grammy';
import { apiService } from '../services/api.service.js';

export async function handlePaymentCommand(ctx: Context) {
  if (!ctx.from) return;

  // Track user upgrade click & notify admin for follow-up
  try {
    const { trackUpgradeIntent } = await import('../utils/analytics.util.js');
    await trackUpgradeIntent(ctx);
  } catch (e) {}

  const paymentText =
    `💳 *Maraki VIP Subscription & Bank Transfer*\n\n` +
    `Unlock unlimited Maraki AI chat, real-time tutoring, full bank aptitude & Grade 12 exam modules!\n\n` +
    `📌 *Pricing Tiers:*\n` +
    `• ⚡ *Weekly Pass*: 99 ETB / week\n` +
    `• 🌟 *Monthly VIP*: 299 ETB / month (Best Value 🔥)\n` +
    `• 🚀 *Yearly Pass*: 2,499 ETB / year (Save 30%)\n\n` +
    `🏦 *Direct Bank Transfer Accounts:*\n` +
    `• *Commercial Bank of Ethiopia (CBE)*:\n` +
    `  \`1000342472501\` (Account: *Million Mulugeta*)\n` +
    `• *Dashen Bank*:\n` +
    `  \`5427280818011\` (Account: *Million Mulugeta*)\n\n` +
    `✅ *How to Activate Instantly:*\n` +
    `1. Transfer the exact amount for your chosen tier (99 ETB, 299 ETB, or 2,499 ETB).\n` +
    `2. Copy the receipt link from CBE Mobile/Dashen SuperApp (e.g., \`https://mbreciept.cbe.com.et/v2-XXXXXX\`) or reference ID.\n` +
    `3. Simply paste the link or reference directly in this chat!\n\n` +
    `⚡ Our automated system will verify your receipt with the bank and upgrade your account in seconds!`;

  await ctx.reply(paymentText, { parse_mode: 'Markdown' });
}

export async function handleReceiptVerification(ctx: Context, referenceText: string) {
  if (!ctx.from) return;

  const telegramId = ctx.from.id;
  await ctx.reply(`🔄 *Verifying your bank receipt with the bank network... Please wait...*`, {
    parse_mode: 'Markdown',
  });

  try {
    const result = await apiService.verifyBankPayment(telegramId, referenceText);

    // Track payment attempt and notify admin
    try {
      const { trackPaymentAttempt } = await import('../utils/analytics.util.js');
      await trackPaymentAttempt(ctx, referenceText, result);
    } catch (e) {}

    if (result.success) {
      await ctx.reply(
        `🎉 *PAYMENT VERIFIED SUCCESSFULLY!*\n\n` +
        `Bank: *${result.result?.bankName || 'CBE'}*\n` +
        `Amount: *${result.result?.amount || 299} ETB*\n` +
        `Reference: \`${result.result?.referenceNumber || referenceText}\`\n\n` +
        `🌟 Your *Maraki Premium* status is now ACTIVE! You have unlimited access to Maraki AI practice and exam modules.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      const { InlineKeyboard } = await import('grammy');
      const keyboard = new InlineKeyboard().url("💬 Contact Admin (@miilla021)", "https://t.me/miilla021");

      await ctx.reply(
        `❌ *Payment Verification Failed*\n\n` +
        `Reason: ${result.message || 'Transaction could not be verified'}.\n\n` +
        `📌 *Under-Payment or Transfer Issue?*\n` +
        `If you transferred a partial amount (e.g. 50 ETB) or need manual assistance, please contact our Admin directly:\n` +
        `👉 *@miilla021*\n\n` +
        `Our team will verify your transfer and assist you immediately!`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
      );
    }
  } catch (error: any) {
    console.error('Receipt verification error:', error);
    await ctx.reply(
      `⚠️ *Verification Error*: Unable to connect to the bank network right now. Please try again in a few moments.`
    );
  }
}
