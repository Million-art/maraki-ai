import { Context } from 'grammy';
import { apiService } from '../services/api.service.js';
import {
  trackUpgradeIntent,
  trackPaymentAttempt,
} from '../utils/analytics.util.js';

export async function handlePaymentCommand(ctx: Context) {
  if (!ctx.from) return;

  // Track user upgrade click & notify admin for follow-up
  try {
    await trackUpgradeIntent(ctx);
  } catch (e) { }

  let activeNotice = '';
  try {
    const user = await apiService.getUserByTelegramId(ctx.from.id);
    if (user && (user.isMarakiPremium || user.isPremium) && user.subscriptionExpiresAt) {
      const expires = new Date(user.subscriptionExpiresAt);
      if (expires > new Date()) {
        const formattedDate = expires.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        activeNotice =
          `🌟 *ACTIVE VIP SUBSCRIPTION DETECTED!*\n` +
          `You currently have active Maraki VIP access (valid until *${formattedDate}*).\n\n` +
          `ℹ️ *Subscription Extension Notice:*\n` +
          `If you transfer & subscribe again, your new plan duration will be **added directly to your current expiration date** (your subscription will be extended with no lost days)! 🚀\n\n`;
      }
    }
  } catch (e) { }

  const { InlineKeyboard } = await import('grammy');
  const keyboard = new InlineKeyboard()
    .text("⚡ 1 Week (99 ETB)", "pay_weekly")
    .row()
    .text("🌟 1 Month (299 ETB)", "pay_monthly")
    .row()
    .text("🔥 3 Months (799 ETB) - Save 11%", "pay_quarterly")
    .row()
    .text("🚀 1 Year (2,499 ETB) - Save 30%", "pay_yearly");

  const paymentText =
    `💳 *Maraki VIP Subscription*\n\n` +
    activeNotice +
    `Unlock unlimited Maraki AI chat and real-time tutoring!\n\n` +
    `Please select your preferred subscription tier below:`;

  await ctx.reply(paymentText, { parse_mode: 'Markdown', reply_markup: keyboard });
}

export async function handlePaymentSelection(ctx: Context, data: string) {
  let amount = '299';
  let tierName = '🌟 1 Month VIP';
  let tierParam = 'monthly';

  if (data === 'pay_weekly') {
    amount = '99';
    tierName = '⚡ 1 Week VIP';
    tierParam = 'weekly';
  } else if (data === 'pay_quarterly') {
    amount = '799';
    tierName = '🔥 3 Months VIP';
    tierParam = 'quarterly';
  } else if (data === 'pay_yearly') {
    amount = '2,499';
    tierName = '🚀 1 Year VIP';
    tierParam = 'yearly';
  }

  let extensionNotice = '';
  try {
    if (ctx.from) {
      const user = await apiService.getUserByTelegramId(ctx.from.id);
      if (user && (user.isMarakiPremium || user.isPremium) && user.subscriptionExpiresAt) {
        const expires = new Date(user.subscriptionExpiresAt);
        if (expires > new Date()) {
          extensionNotice = `\n\n🔄 *Extension Notice:* As an active VIP member, your new payment will *extend* your access beyond your current expiration!`;
        }
      }

      // Store selected tier in user session context
      const { getSession, setSession } = await import('../utils/redis.js');
      const session = await getSession(ctx.from.id);
      await setSession(ctx.from.id, {
        ...session,
        selectedTier: tierParam,
      });
    }
  } catch (e) { }

  const { InlineKeyboard } = await import('grammy');
  const keyboard = new InlineKeyboard().text("✅ Verify Payment / Submit Receipt", "submit_receipt_prompt");

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
    `3. Click the **"Verify Payment / Submit Receipt"** button below or paste your receipt link directly in this chat!\n\n` +
    `⚡ Our automated system will verify your receipt and upgrade/extend your account in seconds!${extensionNotice}`;

  await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
}

export async function handleReceiptVerification(ctx: Context, referenceText: string) {
  if (!ctx.from) return;

  const telegramId = ctx.from.id;
  await ctx.reply(`🔄 *Verifying your bank receipt with the bank network... Please wait...*`, {
    parse_mode: 'Markdown',
  });

  try {
    let tier = 'monthly';
    try {
      const { getSession } = await import('../utils/redis.js');
      const session = await getSession(telegramId);
      if (session?.selectedTier) {
        tier = session.selectedTier;
      }
    } catch (e) { }

    const result = await apiService.verifyBankPayment(telegramId, referenceText, tier);

    // Track payment attempt and notify admin
    try {
      await trackPaymentAttempt(ctx, referenceText, result);
    } catch (e) { }

    if (result.success) {
      const amountPaid = result.result?.amount || 299;
      let durationText = '1 MONTH';
      if (amountPaid >= 2499) {
        durationText = '12 MONTHS';
      } else if (amountPaid >= 799) {
        durationText = '3 MONTHS';
      } else if (amountPaid >= 299) {
        durationText = '1 MONTH';
      } else if (amountPaid >= 99) {
        durationText = '1 WEEK';
      }

      const wasExtended = result.wasExtended;
      const headerTitle = wasExtended
        ? '🎉 *SUBSCRIPTION EXTENDED SUCCESSFULLY!*'
        : '🎉 *PAYMENT VERIFIED SUCCESSFULLY!*';

      const newExpiry = result.user?.subscriptionExpiresAt
        ? new Date(result.user.subscriptionExpiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Active';

      const extensionMessage = wasExtended
        ? `🔄 *Your VIP subscription has been extended!* (+${durationText})\n` +
        `📅 *New Expiration Date:* *${newExpiry}*\n\n` +
        `🎁 Thank you for continuing your journey with Maraki Premium!`
        : `🎁 *CONGRATULATIONS!* You now have **${durationText}** of Maraki Premium access (valid until *${newExpiry}*)!\n` +
        `🌟 You have unlimited access to Maraki AI voice chat, practice modules, and exams.`;

      await ctx.reply(
        `${headerTitle}\n\n` +
        `Bank: *${result.result?.bankName || 'Dashen Bank'}*\n` +
        `Amount: *${amountPaid} ETB*\n` +
        `Reference: \`${result.result?.referenceNumber || referenceText}\`\n\n` +
        extensionMessage,
        { parse_mode: 'Markdown' }
      );
    } else {
      const { InlineKeyboard } = await import('grammy');
      const keyboard = new InlineKeyboard().text("💬 Contact In-Bot Support", "contact_support");

      await ctx.reply(
        `❌ *Payment Verification Failed*\n\n` +
        `Reason: ${result.message || 'Transaction could not be verified'}.\n\n` +
        `📌 *Need Assistance?*\n` +
        `If you transferred a partial amount or have a payment question, click **Contact In-Bot Support** below to chat with our team directly inside this bot!`,
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
