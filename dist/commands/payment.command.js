import { apiService } from '../services/api.service.js';
export async function handlePaymentCommand(ctx) {
    if (!ctx.from)
        return;
    // Track user upgrade click & notify admin for follow-up
    try {
        const { trackUpgradeIntent } = await import('../utils/analytics.util.js');
        await trackUpgradeIntent(ctx);
    }
    catch (e) { }
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
    }
    catch (e) { }
    const { InlineKeyboard } = await import('grammy');
    const keyboard = new InlineKeyboard()
        .text("🌟 1 Month (299 ETB)", "pay_monthly")
        .row()
        .text("🔥 3 Months (799 ETB) - Save 11%", "pay_quarterly")
        .row()
        .text("🚀 1 Year (2,499 ETB) - Save 30%", "pay_yearly");
    const paymentText = `💳 *Maraki VIP Subscription*\n\n` +
        activeNotice +
        `Unlock unlimited Maraki AI chat and real-time tutoring!\n\n` +
        `Please select your preferred subscription tier below:`;
    await ctx.reply(paymentText, { parse_mode: 'Markdown', reply_markup: keyboard });
}
export async function handlePaymentSelection(ctx, data) {
    let amount = '299';
    let tierName = '🌟 1 Month VIP';
    if (data === 'pay_quarterly') {
        amount = '799';
        tierName = '🔥 3 Months VIP';
    }
    else if (data === 'pay_yearly') {
        amount = '2,499';
        tierName = '🚀 1 Year VIP';
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
        }
    }
    catch (e) { }
    const { InlineKeyboard } = await import('grammy');
    const keyboard = new InlineKeyboard().text("✅ Verify Payment / Submit Receipt", "submit_receipt_prompt");
    const text = `💳 *You selected: ${tierName}*\n\n` +
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
export async function handleReceiptVerification(ctx, referenceText) {
    if (!ctx.from)
        return;
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
        }
        catch (e) { }
        if (result.success) {
            const amountPaid = result.result?.amount || 299;
            let durationText = '1 MONTH';
            if (amountPaid >= 2499) {
                durationText = '12 MONTHS';
            }
            else if (amountPaid >= 799) {
                durationText = '3 MONTHS';
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
            await ctx.reply(`${headerTitle}\n\n` +
                `Bank: *${result.result?.bankName || 'Dashen Bank'}*\n` +
                `Amount: *${amountPaid} ETB*\n` +
                `Reference: \`${result.result?.referenceNumber || referenceText}\`\n\n` +
                extensionMessage, { parse_mode: 'Markdown' });
        }
        else {
            const { InlineKeyboard } = await import('grammy');
            const keyboard = new InlineKeyboard().url("💬 Contact Admin (@miilla021)", "https://t.me/miilla021");
            await ctx.reply(`❌ *Payment Verification Failed*\n\n` +
                `Reason: ${result.message || 'Transaction could not be verified'}.\n\n` +
                `📌 *Under-Payment or Transfer Issue?*\n` +
                `If you transferred a partial amount (e.g. 50 ETB) or need manual assistance, please contact our Admin directly:\n` +
                `👉 *@miilla021*\n\n` +
                `Our team will verify your transfer and assist you immediately!`, { parse_mode: 'Markdown', reply_markup: keyboard });
        }
    }
    catch (error) {
        console.error('Receipt verification error:', error);
        await ctx.reply(`⚠️ *Verification Error*: Unable to connect to the bank network right now. Please try again in a few moments.`);
    }
}
