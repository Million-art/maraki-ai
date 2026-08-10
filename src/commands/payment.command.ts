import { Context } from 'grammy';
import { apiService } from '../services/api.service.js';

export async function handlePaymentCommand(ctx: Context) {
  if (!ctx.from) return;

  // Track user upgrade click & notify admin for follow-up
  try {
    const { trackUpgradeIntent } = await import('../utils/analytics.util.js');
    await trackUpgradeIntent(ctx);
  } catch (e) {}

  const { InlineKeyboard } = await import('grammy');
  const keyboard = new InlineKeyboard()
    .text("🌟 Monthly VIP (299 ETB)", "pay_monthly")
    .row()
    .text("🚀 Yearly VIP (2,499 ETB) - Save 30%", "pay_yearly");

  const paymentText =
    `💳 *Maraki VIP Subscription*\n\n` +
    `Unlock unlimited Maraki AI chat, real-time tutoring, full bank aptitude & Grade 12 exam modules!\n\n` +
    `Please select your preferred subscription tier below:`;

  await ctx.reply(paymentText, { parse_mode: 'Markdown', reply_markup: keyboard });
}

export async function handlePaymentSelection(ctx: Context, data: string) {
  const isYearly = data === 'pay_yearly';
  const amount = isYearly ? '2,499' : '299';
  const tierName = isYearly ? '🚀 Yearly VIP' : '🌟 Monthly VIP';

  const text =
    `💳 *You selected: ${tierName}*\n\n` +
    `🏦 *Direct Bank Transfer Accounts:*\n` +
    `• *Commercial Bank of Ethiopia (CBE)*:\n` +
    `  \`1000342472501\` (Account: *Million Mulugeta*)\n` +
    `• *Dashen Bank*:\n` +
    `  \`5427280818011\` (Account: *Million Mulugeta*)\n\n` +
    `✅ *How to Activate Instantly:*\n` +
    `1. Transfer exactly *${amount} ETB* to one of the accounts above.\n` +
    `2. Copy the receipt link from CBE Mobile/Dashen SuperApp (e.g., \`https://mbreciept.cbe.com.et/v2-XXXXXX\`) or reference ID.\n` +
    `3. Simply paste the link or reference directly in this chat!\n\n` +
    `⚡ Our automated system will verify your receipt and upgrade your account in seconds!`;

  await ctx.editMessageText(text, { parse_mode: 'Markdown' });
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
      const amountPaid = result.result?.amount || 299;
      const isYearly = amountPaid >= 2499;
      const durationText = isYearly ? '12 MONTHS' : '1 MONTH';

      await ctx.reply(
        `🎉 *PAYMENT VERIFIED SUCCESSFULLY!*\n\n` +
        `Bank: *${result.result?.bankName || 'CBE'}*\n` +
        `Amount: *${amountPaid} ETB*\n` +
        `Reference: \`${result.result?.referenceNumber || referenceText}\`\n\n` +
        `🎁 *CONGRATULATIONS!* You now have **${durationText}** of Maraki Premium access!\n` +
        `🌟 You have unlimited access to Maraki AI voice chat, practice modules, and exams.`,
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
