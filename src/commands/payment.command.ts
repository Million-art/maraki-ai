import { Context } from 'grammy';
import { apiService } from '../services/api.service.js';
import {
  trackUpgradeIntent,
  trackPaymentAttempt,
  notifyAdminPaymentError,
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
          `🌟 *ያለፈበት ጊዜ ያልደረሰ VIP subscription አለዎት!*\n` +
          `አሁን ላይ active የሆነ የMaraki AI VIP subscription አለዎት (እስከ *${formattedDate}* የሚያገለግል)።\n\n` +
          `ℹ️ *የsubscription ማራዘሚያ ማሳሰቢያ፡*\n` +
          `ክፍያ ፈጽመው በድጋሚ ከተመዘገቡ፣ አዲሱ የsubscription ጊዜዎ **በቀጥታ አሁን ካለዎት ማብቂያ ቀን ላይ ይጨመራል** (ምንም ቀን ሳያጡ subscriptionዎ ይራዘማል)! 🚀\n\n`;
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
    `💳 *የMaraki AI VIP ክፍያ*\n\n` +
    activeNotice +
    `ያልተገደበ የMaraki AI ውይይት እና የድምጽ ልምምድ ያግኙ!\n\n` +
    `እባክዎን ከታች ከተዘረዘሩት የsubscription አማራጮች ውስጥ የሚፈልጉትን ይምረጡ፡`;

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
          extensionNotice = `\n\n🔄 *ማሳሰቢያ፡* አዲሱ ክፍያዎ የአባልነት ጊዜዎን አሁን ካለው ማብቂያ ቀን ላይ ይጨምረዋል!`;
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
    `💳 *የመረጡት፡ ${tierName}*\n\n` +
    `🏦 *የባንክ ሂሳብ እና Telebirr ቁጥሮች፡*\n` +
    `• *CBE*: \`1000342472501\`\n` +
    `• *Dashen*: \`5427280818011\`\n` +
    `• *Telebirr*: \`0943789101\`\n` +
    `👤 ስም: *Million Mulugeta*\n` +
    `*(ኮፒ ለማድረግ አካውንት ቁጥሩን ይንኩ)*\n\n` +
    `✅ *እንዴት active ማድረግ ይቻላል?*\n` +
    `1. ከላይ ካሉት (CBE / Dashen / Telebirr) ወደ **አንዱ** ብቻ በትክክል *${amount} ETB* ያስገቡ።\n` +
    `2. ከCBE / Dashen / Telebirr የክፍያውን ሊንክ ኮፒ ያድርጉ ወይም reference ቁጥሩን ይውሰዱ።\n` +
    `3. ሊንኩን እዚሁ ቻት ላይ ፔስት (Paste) ያድርጉ ወይም ከታች **"Verify Payment"** ይጫኑ!\n\n` +
    `⚡ ክፍያዎ በሰከንዶች ውስጥ ተረጋግጦ active ይሆናል!${extensionNotice}`;

  try {
    await ctx.deleteMessage();
  } catch (e) {
    console.error('Could not delete old message', e);
  }

  try {
    await ctx.replyWithAnimation('CgACAgQAAxkBAAIB2mqAkuKmD1uR2rIh-JRbLjYG6qx-AALyHwACbyzwUym4AYm72uFkPQQ', {
      caption: text,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (mediaError) {
    console.error('Failed to send animation, falling back to text:', mediaError);
    // Fallback to text if the file_id is invalid
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
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
        ? '🎉 *የአባልነት ጊዜዎ በተሳካ ሁኔታ ተራዝሟል!*'
        : '🎉 *ክፍያዎ በተሳካ ሁኔታ ተረጋግጧል!*';

      const newExpiry = result.user?.subscriptionExpiresAt
        ? new Date(result.user.subscriptionExpiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Active';

      const extensionMessage = wasExtended
        ? `🔄 *የVIP አባልነትዎ ተራዝሟል!* (+${durationText})\n` +
        `📅 *አዲሱ ማብቂያ ቀን፡* *${newExpiry}*\n\n` +
        `🎁 ከMaraki Premium ጋር ጉዞዎን ስለቀጠሉ እናመሰግናለን!`
        : `🎁 *እንኳን ደስ አሎት!* አሁን የ **${durationText}** Maraki Premium አባልነት አግኝተዋል (እስከ *${newExpiry}* የሚያገለግል)!\n` +
        `🌟 አሁን ያለገደብ የMaraki AI የድምጽ ውይይት፣ የልምምድ ሞጁሎች እና ፈተናዎችን መጠቀም ይችላሉ።`;

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
      const keyboard = new InlineKeyboard().text("💬 የድጋፍ ቡድኑን ያነጋግሩ (Support)", "contact_support");

      await ctx.reply(
        `❌ *ክፍያዎን ማረጋገጥ አልተቻለም*\n\n` +
        `ምክንያት: ${result.message || 'ክፍያውን ማረጋገጥ አልተቻለም'}.\n\n` +
        `📌 *እርዳታ ይፈልጋሉ?*\n` +
        ` ስለክፍያዎ ጥያቄ ካለዎት፣ የድጋፍ ቡድናችንን እዚሁ ቦት ላይ ለማነጋገር ከታች ያለውን **የድጋፍ ቡድኑን ያነጋግሩ (Support)** የሚለውን ይጫኑ!`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
      );
    }
  } catch (error: any) {
    console.error('Receipt verification error:', error);
    try {
      await notifyAdminPaymentError(ctx, referenceText, error);
    } catch (e) { }

    await ctx.reply(
      `⚠️ *የኔትዎርክ ችግር*: በአሁኑ ሰዓት ከባንክ ኔትዎርክ ጋር መገናኘት አልተቻለም። እባክዎን ከጥቂት ደቂቃዎች በኋላ እንደገና ይሞክሩ።`
    );
  }
}
